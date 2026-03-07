import test from "node:test";
import assert from "node:assert/strict";

import { resetStoreForTests } from "../src/store.ts";
import { listTransactions } from "../src/transactions.ts";
import { getOverview } from "../src/analytics.ts";

const BASE_STORE = {
  users: [{ id: "user_1", email: "user@example.com", createdAt: "2026-01-01", updatedAt: "2026-01-01" }],
  sessions: [],
  accounts: [],
  transactions: [
    {
      id: "txn_imported_neg",
      user_id: "user_1",
      account_id: "acct_1",
      account_key: "checking",
      source_type: "imported",
      source_file_id: "imp_1",
      transaction_date: "2026-01-03",
      post_date: null,
      merchant_raw: "COSTCO WHSE #00",
      merchant_normalized: "costco whse 00",
      description: "General PayPal Debit Card Transaction",
      amount: -120.45,
      currency: "USD",
      direction: "outflow",
      transaction_type: "expense",
      category_raw: "Groceries",
      category_final: "Groceries",
      category_confidence: 1,
      category_strategy: "import_override",
      needs_category_review: false,
      review_status: "reviewed",
      tags: [],
      recurring_rule_id: null,
      memo: null,
      dedupe_fingerprint: "fp_imported_neg",
      created_at: "2026-01-03T00:00:00.000Z",
      updated_at: "2026-01-03T00:00:00.000Z"
    },
    {
      id: "txn_legacy_neg",
      user_id: "user_1",
      account_id: "acct_1",
      account_key: "checking",
      source_type: "legacy_api",
      source_file_id: null,
      transaction_date: "2026-01-04",
      post_date: null,
      merchant_raw: "ENSON MARKET",
      merchant_normalized: "enson market",
      description: "General PayPal Debit Card Transaction",
      amount: -56.1,
      currency: "USD",
      direction: "outflow",
      transaction_type: "expense",
      category_raw: "Groceries",
      category_final: "Groceries",
      category_confidence: 1,
      category_strategy: "legacy_api_mapping",
      needs_category_review: false,
      review_status: "reviewed",
      tags: [],
      recurring_rule_id: null,
      memo: null,
      dedupe_fingerprint: "fp_legacy_neg",
      created_at: "2026-01-04T00:00:00.000Z",
      updated_at: "2026-01-04T00:00:00.000Z"
    },
    {
      id: "txn_income",
      user_id: "user_1",
      account_id: "acct_1",
      account_key: "checking",
      source_type: "imported",
      source_file_id: "imp_1",
      transaction_date: "2026-01-05",
      post_date: null,
      merchant_raw: "Payroll",
      merchant_normalized: "payroll",
      description: "Payroll Deposit",
      amount: 2000,
      currency: "USD",
      direction: "inflow",
      transaction_type: "income",
      category_raw: null,
      category_final: "Income",
      category_confidence: 1,
      category_strategy: "import_override",
      needs_category_review: false,
      review_status: "reviewed",
      tags: [],
      recurring_rule_id: null,
      memo: null,
      dedupe_fingerprint: "fp_income",
      created_at: "2026-01-05T00:00:00.000Z",
      updated_at: "2026-01-05T00:00:00.000Z"
    }
  ],
  recurringRules: [],
  investmentHoldings: [],
  investmentSnapshots: [],
  categories: [],
  categoryStrategies: [],
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

test("listTransactions normalizes negative outflow amounts to positive expense amounts", () => {
  resetStoreForTests(structuredClone(BASE_STORE));

  const listed = listTransactions("user_1", { range: "all", limit: 50, offset: 0 });
  const byId = new Map(listed.items.map((entry) => [entry.id, entry]));

  assert.equal(byId.get("txn_imported_neg")?.direction, "outflow");
  assert.equal(byId.get("txn_imported_neg")?.amount, 120.45);
  assert.equal(byId.get("txn_legacy_neg")?.direction, "outflow");
  assert.equal(byId.get("txn_legacy_neg")?.amount, 56.1);
});

test("overview spend remains positive even if persisted outflow rows are signed negative", () => {
  resetStoreForTests(structuredClone(BASE_STORE));

  const overview = getOverview("user_1", { start: "2026-01-01", end: "2026-01-31" });
  assert.equal(overview.summary.totalSpend, 176.55);
  assert.equal(overview.summary.totalIncome, 2000);
  assert.equal(overview.summary.netFlow, 1823.45);
});
