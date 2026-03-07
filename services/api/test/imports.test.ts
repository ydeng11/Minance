import test from "node:test";
import assert from "node:assert/strict";

import { loadStore, resetStoreForTests, saveStore } from "../src/store.ts";
import {
  createImportJob,
  listImportProcessedRows,
  updateImportProcessedRow,
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
  migrationRuns: [],
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
  assert.equal(reconciliation.accounts[0].status, "needs_review");
  assert.equal(reconciliation.accounts[0].importedNet, 50);
  assert.equal(reconciliation.accounts[0].existingWindowNet, -40);
  assert.equal(reconciliation.accounts[0].discrepancyAmount, 90);

  const createAdjustmentRecommendation = reconciliation.accounts[0].recommendations.find(
    (entry) => entry.type === "create_manual_adjustment"
  );
  assert.equal(Boolean(createAdjustmentRecommendation), true);
  assert.equal(createAdjustmentRecommendation.amountDelta, 90);

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
