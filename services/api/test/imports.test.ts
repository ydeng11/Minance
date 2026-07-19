import test from "node:test";
import assert from "node:assert/strict";

import { loadStore, resetStoreForTests, saveStore } from "../src/store.ts";
import { stableHash } from "../src/utils.ts";
import {
  createImportJob,
  listImportProcessedRows,
  updateImportProcessedRow,
  updateImportProcessedRows,
  reprocessImportRows,
  commitImport,
  getImportReconciliation,
  resolveImportReconciliation
} from "../src/imports.ts";
import { createAccount, listAccountBalanceHistory } from "../src/accounts.ts";

const EMPTY_STORE = {
  users: [{ id: "user_1", email: "user@example.com", createdAt: "2026-01-01", updatedAt: "2026-01-01" }],
  sessions: [],
  accounts: [],
  transactions: [],
  categories: [],
  categoryRules: [],
  imports: [],
  importRowsRaw: [],
  importRowsProcessed: [],
  importRowDiagnostics: [],
  aiProviderCredentials: [],
  aiProviderPreferences: [],
  assistantQueries: [],
  savedViews: [],
  auditEvents: []
};

test("processed import rows can be edited, reprocessed, and committed", async () => {
  resetStoreForTests(structuredClone(EMPTY_STORE));

  const csvText = [
    "date,merchant,description,amount,account",
    "2025-01-01,Coffee Shop,Coffee Shop,-5.25,Checking",
    "2025-01-02,Payroll,Payroll Deposit,2000.00,Checking"
  ].join("\n");

  const created = await createImportJob({
    userId: "user_1",
    fileName: "test.csv",
    csvText
  });

  assert.equal(created.importJob.rowCount, 2);
  assert.equal(created.processedSummary.all, 2);

  const listed = listImportProcessedRows("user_1", created.importJob.id, {});
  assert.equal(listed.total, 2);
  assert.equal(typeof created.importJob.directionInference?.confidence, "number");
  assert.equal(typeof listed.items[0].normalized.direction_confidence, "number");
  assert.equal(typeof listed.items[0].normalized.needs_direction_review, "boolean");

  const first = listed.items[0];
  const updated = updateImportProcessedRow("user_1", created.importJob.id, first.rowId, {
    include: false,
    memo: "skip row"
  });
  assert.equal(updated.row.include, false);

  const reprocessed = await reprocessImportRows("user_1", created.importJob.id);
  assert.equal(reprocessed.total, 2);
  assert.equal(reprocessed.summary.excluded, 1);

  const committed = await commitImport("user_1", created.importJob.id);
  assert.equal(committed.summary.scanned, 2);
  assert.equal(committed.summary.imported, 1);
  assert.equal(committed.summary.excludedRows, 1);
  assert.equal(typeof committed.summary.lowDirectionConfidenceRows, "number");
  assert.equal(typeof committed.summary.llmDirectionInference?.attempted, "number");
  assert.equal(committed.status, "completed");
  assert.equal(Boolean(committed.dateBounds.start), true);
  assert.equal(Boolean(committed.dateBounds.end), true);
});

test("processed import rows can be bulk assigned to an account with one rebuild", async () => {
  resetStoreForTests(structuredClone(EMPTY_STORE));

  const csvText = [
    "date,merchant,description,amount,account",
    "2025-01-01,Coffee Shop,Coffee Shop,-5.25,Imported Account",
    "2025-01-02,Payroll,Payroll Deposit,2000.00,Imported Account",
    "2025-01-03,Grocer,Grocer,-43.21,Imported Account"
  ].join("\n");

  const created = await createImportJob({
    userId: "user_1",
    fileName: "bulk-account.csv",
    csvText
  });
  const before = listImportProcessedRows("user_1", created.importJob.id, {});
  const rowIds = before.items.slice(0, 2).map((row) => row.rowId);

  const updated = updateImportProcessedRows("user_1", created.importJob.id, {
    rowIds,
    updates: {
      account_name: "Checking"
    }
  });

  assert.equal(updated.rows.length, 2);
  assert.equal(updated.summary.all, 3);
  assert.deepEqual(
    updated.rows.map((row) => row.normalized.account_name),
    ["Checking", "Checking"]
  );

  const after = listImportProcessedRows("user_1", created.importJob.id, {});
  assert.deepEqual(
    after.items.map((row) => row.normalized.account_name),
    ["Checking", "Checking", "Imported Account"]
  );

  const audit = loadStore().auditEvents.find((entry) => entry.action === "import.processed_rows.updated");
  assert.equal(audit?.details.rowCount, 2);
  assert.deepEqual(audit?.details.fields, ["account_name"]);
});

test("csv import keeps outflow expense amounts positive while preserving outflow direction", async () => {
  resetStoreForTests(structuredClone(EMPTY_STORE));

  const csvText = [
    "date,merchant,description,amount,account",
    "2025-02-01,COSTCO WHSE #00,General PayPal Debit Card Transaction,-80.30,Checking",
    "2025-02-02,ENSON MARKET,General PayPal Debit Card Transaction,-25.70,Checking"
  ].join("\n");

  const created = await createImportJob({
    userId: "user_1",
    fileName: "paypal-like.csv",
    csvText
  });
  const committed = await commitImport("user_1", created.importJob.id);
  assert.equal(committed.summary.imported, 2);

  const store = loadStore();
  const imported = store.transactions
    .filter((entry) => entry.user_id === "user_1")
    .filter((entry) => entry.description === "General PayPal Debit Card Transaction");

  assert.equal(imported.length, 2);
  imported.forEach((entry) => {
    assert.equal(entry.direction, "outflow");
    assert.equal(entry.amount > 0, true);
  });
});

test("ambiguous sign files use one LLM fallback attempt and continue with review flags", async () => {
  resetStoreForTests(structuredClone(EMPTY_STORE));

  const csvText = [
    "date,merchant,description,amount,account",
    "2025-01-01,Alpha,Alpha row,10,Checking",
    "2025-01-02,Beta,Beta row,-10,Checking",
    "2025-01-03,Gamma,Gamma row,20,Checking",
    "2025-01-04,Delta,Delta row,-20,Checking"
  ].join("\n");

  const created = await createImportJob({
    userId: "user_1",
    fileName: "ambiguous.csv",
    csvText
  });

  assert.equal(created.importJob.directionInference.llmDirectionInference.attempted, 1);
  assert.equal(created.importJob.directionInference.llmDirectionInference.succeeded, 0);
  assert.equal(created.importJob.directionInference.llmDirectionInference.failed, 1);
  assert.equal(created.importJob.directionInference.llmDirectionInference.fallbackUsed, 1);
  assert.equal(created.importJob.directionInference.strategy, "deterministic_fallback");
  assert.ok(created.importJob.directionInference.warnings.some((warning) => warning.includes("LLM direction inference failed")));

  const committed = await commitImport("user_1", created.importJob.id);
  assert.equal(committed.summary.scanned, 4);
  assert.equal(committed.summary.imported, 4);
  assert.ok(committed.summary.lowDirectionConfidenceRows >= 1);
  assert.equal(committed.summary.llmDirectionInference.attempted, 1);
  assert.equal(committed.status, "needs_review");
});

test("ofx/qfx input is normalized through the canonical import pipeline", async () => {
  resetStoreForTests(structuredClone(EMPTY_STORE));

  const ofxText = [
    "OFXHEADER:100",
    "DATA:OFXSGML",
    "VERSION:102",
    "<OFX>",
    "<CURDEF>USD",
    "<BANKACCTFROM>",
    "<ACCTID>123456789",
    "<ACCTTYPE>CHECKING",
    "</BANKACCTFROM>",
    "<BANKTRANLIST>",
    "<STMTTRN>",
    "<TRNTYPE>DEBIT",
    "<DTPOSTED>20250101120000[-5:EST]",
    "<TRNAMT>-25.50",
    "<FITID>FIT_001",
    "<NAME>Coffee Shop",
    "<MEMO>Morning coffee",
    "</STMTTRN>",
    "<STMTTRN>",
    "<TRNTYPE>CREDIT",
    "<DTPOSTED>20250102120000[-5:EST]",
    "<TRNAMT>2000.00",
    "<FITID>FIT_002",
    "<NAME>Payroll",
    "<MEMO>January payroll",
    "</STMTTRN>",
    "</BANKTRANLIST>",
    "</OFX>"
  ].join("\n");

  const created = await createImportJob({
    userId: "user_1",
    fileName: "statement.ofx",
    csvText: ofxText
  });

  assert.equal(created.importJob.rowCount, 2);
  assert.equal(created.importJob.sourceFormat, "ofx_qfx");

  const committed = await commitImport("user_1", created.importJob.id);
  assert.equal(committed.summary.scanned, 2);
  assert.equal(committed.summary.imported, 2);
});

test("reconciliation compares staged import rows and applies safe manual adjustments", async () => {
  resetStoreForTests(structuredClone(EMPTY_STORE));

  const account = createAccount("user_1", {
    displayName: "Checking",
    accountType: "checking",
    currency: "USD",
    initialBalance: 1000
  });

  const store = loadStore();
  store.transactions.push({
    id: "txn_existing_1",
    user_id: "user_1",
    account_id: account.id,
    account_key: account.normalizedKey,
    source_type: "manual",
    source_file_id: null,
    transaction_date: "2025-01-02",
    post_date: null,
    merchant_raw: "Pre-existing debit",
    merchant_normalized: "pre existing debit",
    description: "Pre-existing debit",
    amount: 40,
    currency: "USD",
    direction: "outflow",
    category_raw: null,
    category_final: "Uncategorized",
    category_confidence: 0.5,
    category_strategy: "keyword",
    needs_category_review: false,
    memo: null,
    dedupe_fingerprint: "existing_fingerprint_1",
    created_at: "2025-01-02T00:00:00.000Z",
    updated_at: "2025-01-02T00:00:00.000Z"
  });
  saveStore(store);

  const csvText = [
    "date,merchant,description,amount,account",
    "2025-01-01,Coffee Shop,Coffee Shop,-50.00,Checking",
    "2025-01-03,Payroll,Payroll Deposit,100.00,Checking"
  ].join("\n");

  const created = await createImportJob({
    userId: "user_1",
    fileName: "recon.csv",
    csvText
  });

  const reconciliation = getImportReconciliation("user_1", created.importJob.id);
  assert.equal(reconciliation.accounts.length, 1);
  assert.equal(reconciliation.accounts[0].accountId, account.id);
  assert.equal(reconciliation.accounts[0].status, "balanced");
  assert.equal(reconciliation.accounts[0].importedNet, 50);
  assert.equal(reconciliation.accounts[0].existingWindowNet, -40);
  assert.equal(reconciliation.accounts[0].discrepancyAmount, 90);
  assert.equal(reconciliation.accounts[0].recommendations.length, 0);

  const resolved = resolveImportReconciliation("user_1", created.importJob.id, {
    action: "create_manual_adjustment",
    accountId: account.id,
    amountDelta: 90,
    reason: "Resolve import discrepancy"
  });

  assert.equal(resolved.resolution.action, "create_manual_adjustment");
  assert.equal(resolved.resolution.accountId, account.id);
  assert.equal(resolved.resolution.adjustment.amountDelta, 90);

  const history = listAccountBalanceHistory("user_1", account.id, {});
  assert.equal(
    history.items.some((entry) => entry.kind === "manual_adjustment" && entry.delta === 90),
    true
  );
});

test("import reconciliation and commit reuse legacy accounts whose normalized keys drift from display names", async () => {
  resetStoreForTests(structuredClone(EMPTY_STORE));

  const account = createAccount("user_1", {
    displayName: "Hyatt",
    sourceInstitution: "Chase",
    accountType: "credit",
    currency: "USD",
    initialBalance: 0
  });

  const store = loadStore();
  store.accounts[0].normalizedKey = "chase hyatt";
  saveStore(store);

  const created = await createImportJob({
    userId: "user_1",
    fileName: "chase.csv",
    csvText: [
      "date,merchant,description,amount,account",
      "2026-03-25,AUTOMATIC PAYMENT - THANK,AUTOMATIC PAYMENT - THANK,-29.99,Hyatt"
    ].join("\n")
  });

  const reconciliation = getImportReconciliation("user_1", created.importJob.id);
  assert.equal(reconciliation.accounts.length, 1);
  assert.equal(reconciliation.accounts[0].accountId, account.id);

  const committed = await commitImport("user_1", created.importJob.id);
  assert.equal(committed.summary.imported, 1);

  const storeAfterCommit = loadStore();
  assert.equal(storeAfterCommit.accounts.length, 1);
  assert.equal(storeAfterCommit.transactions.length, 1);
  const importedTransaction = storeAfterCommit.transactions[0];
  assert.equal(importedTransaction.account_id, account.id);
  assert.equal(importedTransaction.account_key, "chase hyatt");
  assert.equal(
    importedTransaction.dedupe_fingerprint,
    stableHash([
      "user_1",
      importedTransaction.account_key,
      importedTransaction.merchant_normalized,
      importedTransaction.amount.toFixed(2),
      importedTransaction.transaction_date,
      ""
    ].join("|"))
  );
});


test("bank category alias maps Apple Card Merchandise & Supplies-Groceries to Groceries", async () => {
  resetStoreForTests(structuredClone(EMPTY_STORE));

  const csvText = [
    "Date,Merchant,Category,Amount",
    "2025-03-01,Whole Foods,Merchandise & Supplies-Groceries,-85.23",
    "2025-03-02,Olive Garden,Restaurants,-42.50"
  ].join("\n");

  const created = await createImportJob({
    userId: "user_1",
    fileName: "apple-card.csv",
    csvText
  });

  const rows = listImportProcessedRows("user_1", created.importJob.id, {});
  assert.equal(rows.total, 2);
  const wholeFoods = rows.items.find((entry) => entry.normalized.merchant_raw === "Whole Foods");
  const oliveGarden = rows.items.find((entry) => entry.normalized.merchant_raw === "Olive Garden");

  assert.ok(wholeFoods, "Whole Foods row should exist");
  assert.equal(wholeFoods.normalized.category_final, "Groceries");
  assert.equal(wholeFoods.normalized.category_strategy, "bank_alias");
  assert.equal(wholeFoods.normalized.category_confidence >= 0.85, true);
  assert.equal(wholeFoods.normalized.transaction_type, "expense");

  assert.ok(oliveGarden, "Olive Garden row should exist");
  assert.equal(oliveGarden.normalized.category_final, "Dining");
  assert.equal(oliveGarden.normalized.category_strategy, "bank_alias");
  assert.equal(oliveGarden.normalized.transaction_type, "expense");
});

test("bank category alias maps Chase Payment to Credit Card Payments (transfer)", async () => {
  resetStoreForTests(structuredClone(EMPTY_STORE));

  const csvText = [
    "Date,Merchant,Type,Amount",
    "2025-04-01,PAYMENT - THANK YOU,Payment,500.00",
    "2025-04-02,Starbucks,Food & Drink,6.75"
  ].join("\n");

  // Chase uses positive amounts for outflows (positive_is_outflow convention)
  const created = await createImportJob({
    userId: "user_1",
    fileName: "chase.csv",
    csvText
  });

  const rows = listImportProcessedRows("user_1", created.importJob.id, {});
  assert.equal(rows.total, 2);

  const payment = rows.items.find((entry) => entry.normalized.merchant_raw === "PAYMENT - THANK YOU");
  const starbucks = rows.items.find((entry) => entry.normalized.merchant_raw === "Starbucks");

  assert.ok(payment, "Payment row should exist");
  assert.equal(payment.normalized.category_final, "Credit Card Payments");
  assert.equal(payment.normalized.category_strategy, "bank_alias");
  assert.equal(payment.normalized.transaction_type, "transfer");

  assert.ok(starbucks, "Starbucks row should exist");
  assert.equal(starbucks.normalized.category_final, "Dining");
  assert.equal(starbucks.normalized.category_strategy, "bank_alias");
  assert.equal(starbucks.normalized.transaction_type, "income");
});

test("bank category alias maps Chase Refunds/Adjustments to Other Income", async () => {
  resetStoreForTests(structuredClone(EMPTY_STORE));

  const csvText = [
    "Date,Merchant,Type,Amount",
    "2025-05-01,AMAZON MKTPLACE PMTS,Refunds/Adjustments,35.99"
  ].join("\n");

  const created = await createImportJob({
    userId: "user_1",
    fileName: "chase-refund.csv",
    csvText
  });

  const rows = listImportProcessedRows("user_1", created.importJob.id, {});
  assert.equal(rows.total, 1);
  const refund = rows.items[0];
  assert.equal(refund.normalized.category_final, "Other Income");
  assert.equal(refund.normalized.category_strategy, "bank_alias");
  assert.equal(refund.normalized.transaction_type, "income");
});

test("bank category alias maps various known patterns", async () => {
  resetStoreForTests(structuredClone(EMPTY_STORE));

  const csvText = [
    "date,merchant,category,amount",
    "2025-06-01,Shell,Gas,-45.00",
    "2025-06-02,Netflix,Entertainment,-15.99",
    "2025-06-03,Target,Shopping,-78.50",
    "2025-06-04,Comcast,Utilities,-89.99",
    "2025-06-05,CVS,Healthcare,-12.50",
    "2025-06-06,Employer,Income,2500.00",
    "2025-06-07,PayPal,Transfer,-200.00"
  ].join("\n");

  const created = await createImportJob({
    userId: "user_1",
    fileName: "varied.csv",
    csvText
  });

  const rows = listImportProcessedRows("user_1", created.importJob.id, {});
  assert.equal(rows.total, 7);

  const byMerchant = new Map(rows.items.map((entry) => [entry.normalized.merchant_raw, entry]));

  assert.equal(byMerchant.get("Shell").normalized.category_final, "Auto");
  assert.equal(byMerchant.get("Shell").normalized.category_strategy, "bank_alias");
  assert.equal(byMerchant.get("Shell").normalized.transaction_type, "expense");

  assert.equal(byMerchant.get("Netflix").normalized.category_final, "Entertainments & Growth");
  assert.equal(byMerchant.get("Netflix").normalized.category_strategy, "bank_alias");
  assert.equal(byMerchant.get("Netflix").normalized.transaction_type, "expense");

  assert.equal(byMerchant.get("Target").normalized.category_final, "Shopping");
  assert.equal(byMerchant.get("Target").normalized.category_strategy, "bank_alias");

  assert.equal(byMerchant.get("Employer").normalized.category_final, "Income");
  assert.equal(byMerchant.get("Employer").normalized.category_strategy, "bank_alias");
  assert.equal(byMerchant.get("Employer").normalized.transaction_type, "income");

  assert.equal(byMerchant.get("PayPal").normalized.category_final, "Transfer & Withdrawl");
  assert.equal(byMerchant.get("PayPal").normalized.category_strategy, "bank_alias");
  assert.equal(byMerchant.get("PayPal").normalized.transaction_type, "transfer");
});

test("user rules and merchant memory still take priority over bank aliases", async () => {
  resetStoreForTests(structuredClone(EMPTY_STORE));

  const store = loadStore();
  store.categoryRules.push({
    userId: "user_1",
    type: "contains",
    pattern: "whole foods",
    category: "Groceries",
    priority: 100
  });
  store.transactions.push({
    id: "txn_mem_1",
    user_id: "user_1",
    account_id: null,
    account_key: "checking",
    source_type: "manual",
    source_file_id: null,
    transaction_date: "2025-01-01",
    post_date: null,
    merchant_raw: "Apple Store",
    merchant_normalized: "apple store",
    description: "Apple Store",
    amount: 100,
    currency: "USD",
    direction: "outflow",
    category_raw: null,
    category_final: "Shopping",
    category_coarse: null,
    category_emoji: "",
    category_confidence: 1,
    category_strategy: "import_override",
    needs_category_review: false,
    review_status: "reviewed",
    tags: [],
    recurring_rule_id: null,
    memo: null,
    dedupe_fingerprint: "mem_fp",
    created_at: "2025-01-01T00:00:00.000Z",
    updated_at: "2025-01-01T00:00:00.000Z"
  });
  saveStore(store);

  const csvText = [
    "date,merchant,category,amount",
    "2025-07-01,Whole Foods,Restaurants,-85.00",
    "2025-07-02,Apple Store,Electronics,-1299.00"
  ].join("\n");

  const created = await createImportJob({
    userId: "user_1",
    fileName: "priority.csv",
    csvText
  });

  const rows = listImportProcessedRows("user_1", created.importJob.id, {});
  assert.equal(rows.total, 2);

  const wholeFoods = rows.items.find((entry) => entry.normalized.merchant_raw === "Whole Foods");
  const appleStore = rows.items.find((entry) => entry.normalized.merchant_raw === "Apple Store");

  assert.ok(wholeFoods);
  // User rule says Groceries, bank alias says Restaurants→Dining. Rule wins.
  assert.equal(wholeFoods.normalized.category_final, "Groceries");
  assert.equal(wholeFoods.normalized.category_strategy, "rule_contains");

  assert.ok(appleStore);
  // Merchant memory says Shopping, bank alias would say unknown→keyword. Memory wins.
  assert.equal(appleStore.normalized.category_final, "Shopping");
  assert.equal(appleStore.normalized.category_strategy, "merchant_memory");
});

test("commit preserves preview category from bank alias", async () => {
  resetStoreForTests(structuredClone(EMPTY_STORE));

  const csvText = [
    "date,merchant,category,amount",
    "2025-08-01,Safeway,Merchandise & Supplies-Groceries,-65.00",
    "2025-08-02,McDonalds,Restaurants,-12.39"
  ].join("\n");

  const created = await createImportJob({
    userId: "user_1",
    fileName: "commit-test.csv",
    csvText
  });

  const preview = listImportProcessedRows("user_1", created.importJob.id, {});
  const safewayPreview = preview.items.find((entry) => entry.normalized.merchant_raw === "Safeway");
  assert.equal(safewayPreview.normalized.category_final, "Groceries");

  // Confirm the preview shows the bank alias category
  const previewSafeway = preview.items.find((entry) => entry.normalized.merchant_raw === "Safeway");
  assert.equal(previewSafeway.normalized.category_final, "Groceries");
  assert.equal(previewSafeway.normalized.category_strategy, "bank_alias");
  assert.equal(previewSafeway.normalized.transaction_type, "expense");

  const committed = await commitImport("user_1", created.importJob.id);
  assert.equal(committed.summary.imported, 2);

  const store = loadStore();
  const safewayTxn = store.transactions.find((entry) => entry.merchant_raw === "Safeway");
  assert.ok(safewayTxn, "Safeway transaction should exist");
  // Commit preserves the preview category; strategy becomes import_override since it was pre-assigned
  assert.equal(safewayTxn.category_final, "Groceries");
  assert.equal(safewayTxn.transaction_type, "expense");
  assert.equal(safewayTxn.needs_category_review, false);
  assert.equal(safewayTxn.review_status, "reviewed");

  const mcdonaldsTxn = store.transactions.find((entry) => entry.merchant_raw === "McDonalds");
  assert.ok(mcdonaldsTxn, "McDonalds transaction should exist");
  assert.equal(mcdonaldsTxn.category_final, "Dining");
  assert.equal(mcdonaldsTxn.transaction_type, "expense");
});

test("manual category override is not replaced by bank alias on row edit", async () => {
  resetStoreForTests(structuredClone(EMPTY_STORE));

  const csvText = [
    "date,merchant,category,amount",
    "2025-09-01,Costco,Merchandise & Supplies-Groceries,-150.00"
  ].join("\n");

  const created = await createImportJob({
    userId: "user_1",
    fileName: "override.csv",
    csvText
  });

  // Preview: bank alias maps to Groceries
  const before = listImportProcessedRows("user_1", created.importJob.id, {});
  assert.equal(before.items[0].normalized.category_final, "Groceries");

  // User manually overrides to Shopping
  const edited = updateImportProcessedRow("user_1", created.importJob.id, before.items[0].rowId, {
    category_final: "Shopping"
  });
  assert.equal(edited.row.normalized.category_final, "Shopping");
  assert.equal(edited.row.normalized.category_strategy, "import_override");

  // Commit preserves the manual override
  await commitImport("user_1", created.importJob.id);
  const store = loadStore();
  const costco = store.transactions.find((entry) => entry.merchant_raw === "Costco");
  assert.ok(costco);
  assert.equal(costco.category_final, "Shopping");
  assert.equal(costco.category_strategy, "import_override");
  assert.equal(costco.transaction_type, "expense");
});

test("transaction_type is derived as transfer for payment/transfer categories", async () => {
  resetStoreForTests(structuredClone(EMPTY_STORE));

  const csvText = [
    "date,merchant,type,amount",
    "2025-10-01,CC PAYMENT,Payment,-250.00",
    "2025-10-02,Venmo,Transfer,-50.00",
    "2025-10-03,Refund,Refunds/Adjustments,25.00",
    "2025-10-04,Salary,Income,3000.00"
  ].join("\n");

  const created = await createImportJob({
    userId: "user_1",
    fileName: "types.csv",
    csvText
  });

  const rows = listImportProcessedRows("user_1", created.importJob.id, {});
  assert.equal(rows.total, 4);

  const byMerchant = new Map(rows.items.map((entry) => [entry.normalized.merchant_raw, entry]));

  // The direction inference determines the sign convention based on the CSV
  // Payment → Credit Card Payments → transaction_type is transfer
  assert.equal(byMerchant.get("CC PAYMENT").normalized.transaction_type, "transfer");
  // Transfer → Credit Card Payments → transaction_type is transfer
  assert.equal(byMerchant.get("Venmo").normalized.transaction_type, "transfer");
  // Refunds/Adjustments → Other Income → transaction_type depends on direction inference
  assert.ok(byMerchant.get("Refund").normalized.transaction_type, "Has transaction type");
  // Income → Income → transaction_type depends on direction inference
  assert.ok(byMerchant.get("Salary").normalized.transaction_type, "Has transaction type");

  // Committed transactions also carry transaction_type
  await commitImport("user_1", created.importJob.id);
  const store = loadStore();
  const ccPayment = store.transactions.find((entry) => entry.merchant_raw === "CC PAYMENT");
  assert.ok(ccPayment);
  assert.equal(ccPayment.transaction_type, "transfer");
  assert.equal(ccPayment.review_status, "reviewed");
});

test("PayPal style rows parse and classify correctly", async () => {
  resetStoreForTests(structuredClone(EMPTY_STORE));

  // PayPal-style CSV with standard column headers the mapper can detect
  const csvText = [
    "date,merchant,type,amount",
    "2025-11-01,John Doe,Payment,-50.00",
    "2025-11-02,Amazon,Refund,25.00",
    "2025-11-03,Netflix,Express Checkout Payment,-15.99"
  ].join("\n");

  const created = await createImportJob({
    userId: "user_1",
    fileName: "paypal.csv",
    csvText
  });

  const rows = listImportProcessedRows("user_1", created.importJob.id, {});
  assert.equal(rows.total, 3);

  // The type column gets mapped to category_raw
  // Payment → Credit Card Payments → transfer (regardless of direction)
  const paymentRow = rows.items.find((entry) => entry.normalized.category_raw === "Payment");
  assert.ok(paymentRow, "Payment row should have category_raw='Payment'");
  assert.equal(paymentRow.normalized.category_final, "Credit Card Payments");
  assert.equal(paymentRow.normalized.transaction_type, "transfer");

  // Refund → Other Income → income (or expense depending on direction inference)
  const refundRow = rows.items.find((entry) => entry.normalized.category_raw === "Refund");
  assert.ok(refundRow, "Refund row should exist");
  assert.equal(refundRow.normalized.category_final, "Other Income");

  // Express Checkout Payment does not match an alias → falls through to keyword model
  const netflixRow = rows.items.find((entry) => entry.normalized.merchant_raw === "Netflix");
  assert.ok(netflixRow, "Netflix row should exist");
  assert.ok(netflixRow.normalized.category_final, "Should have a category");
});

test("low confidence keyword fallback still allows commit without crash", async () => {
  resetStoreForTests(structuredClone(EMPTY_STORE));

  const csvText = [
    "date,merchant,description,amount",
    "2025-12-01,Qzyxwvutsr,Misc charge,-33.00"
  ].join("\n");

  const created = await createImportJob({
    userId: "user_1",
    fileName: "lowconf.csv",
    csvText
  });

  // No category_raw, so no bank alias. Falls through to keyword model or heuristic
  const rows = listImportProcessedRows("user_1", created.importJob.id, {});
  assert.equal(rows.total, 1);
  const row = rows.items[0];
  assert.ok(row.normalized.category_final, "Should have a category");
  assert.ok(row.normalized.needs_category_review, "Low confidence should need review");
  assert.ok(row.normalized.transaction_type, "Should have a transaction type");
  assert.equal(row.normalized.transaction_type, "expense");

  // Low confidence row is flagged in preview before commit
  assert.equal(created.processedSummary.all, 1);

  const committed = await commitImport("user_1", created.importJob.id);
  assert.equal(committed.summary.imported, 1);
  // The low confidence count captures the deterministic low confidence
  assert.equal(committed.summary.lowConfidenceRows, 0);

  // Commit succeeds and stores the category
  const store = loadStore();
  const txn = store.transactions[0];
  assert.ok(txn.category_final, "Should have a committed category");
  assert.ok(txn.transaction_type, "Should have a transaction type");
  // The user reviewed and committed, so it's marked reviewed
  assert.equal(txn.review_status, "reviewed");
});
