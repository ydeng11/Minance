import test from "node:test";
import assert from "node:assert/strict";

import { resetStoreForTests } from "../src/store.js";
import { getOverview, getCategoryRollup, getAnomalies } from "../src/analytics.js";

const baseStore = {
  users: [{ id: "user_1", email: "user@example.com", createdAt: "2026-01-01", updatedAt: "2026-01-01" }],
  sessions: [],
  accounts: [],
  transactions: [
    {
      id: "txn_1",
      user_id: "user_1",
      transaction_date: "2026-01-02",
      merchant_normalized: "coffee",
      merchant_raw: "Coffee",
      description: "Coffee",
      amount: 10,
      direction: "debit",
      category_final: "Dining",
      dedupe_fingerprint: "a"
    },
    {
      id: "txn_2",
      user_id: "user_1",
      transaction_date: "2026-01-05",
      merchant_normalized: "payroll",
      merchant_raw: "Payroll",
      description: "Payroll",
      amount: 1000,
      direction: "credit",
      category_final: "Income",
      dedupe_fingerprint: "b"
    },
    {
      id: "txn_prev",
      user_id: "user_1",
      transaction_date: "2025-12-15",
      merchant_normalized: "coffee",
      merchant_raw: "Coffee",
      description: "Coffee",
      amount: 12,
      direction: "debit",
      category_final: "Dining",
      dedupe_fingerprint: "prev"
    },
    {
      id: "txn_3",
      user_id: "user_1",
      transaction_date: "2026-01-20",
      merchant_normalized: "flight",
      merchant_raw: "Flight",
      description: "Flight",
      amount: 400,
      direction: "debit",
      category_final: "Transport",
      dedupe_fingerprint: "c"
    }
  ],
  categories: [],
  categoryRules: [],
  imports: [],
  importRowsRaw: [],
  importRowDiagnostics: [],
  aiProviderCredentials: [],
  aiProviderPreferences: [],
  assistantQueries: [],
  savedViews: [],
  migrationRuns: [],
  auditEvents: []
};

test("overview calculates spend, income, and net", () => {
  resetStoreForTests(structuredClone(baseStore));
  const overview = getOverview("user_1", { start: "2026-01-01", end: "2026-01-31" });

  assert.equal(overview.summary.totalSpend, 410);
  assert.equal(overview.summary.totalIncome, 1000);
  assert.equal(overview.summary.netFlow, 590);
});

test("category rollup groups debit amounts", () => {
  resetStoreForTests(structuredClone(baseStore));
  const categories = getCategoryRollup("user_1", { start: "2026-01-01", end: "2026-01-31" });

  assert.equal(categories.length, 2);
  assert.equal(categories[0].amount, 400);
  assert.equal(categories[0].category, "Transport");
});

test("coarse category rollup groups by strategy buckets", () => {
  resetStoreForTests(structuredClone(baseStore));
  const categories = getCategoryRollup("user_1", {
    start: "2026-01-01",
    end: "2026-01-31",
    category_view: "coarse"
  });

  assert.equal(categories.length, 2);
  assert.equal(categories[0].category, "Essential");
  assert.equal(categories[0].amount, 400);
  assert.equal(categories[1].category, "Extra");
  assert.equal(categories[1].amount, 10);
});

test("anomaly detector surfaces high outlier", () => {
  resetStoreForTests(structuredClone(baseStore));
  const anomalies = getAnomalies("user_1", { start: "2025-12-01", end: "2026-01-31" });

  assert.ok(anomalies.some((entry) => entry.merchant === "flight"));
});
