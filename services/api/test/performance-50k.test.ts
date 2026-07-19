import test from "node:test";
import assert from "node:assert/strict";

import { resetStoreForTests } from "../src/store.ts";
import { listTransactions } from "../src/transactions.ts";
import { getOverview, getCategoryRollup } from "../src/analytics.ts";

const USER_ID = "user_perf";
const TOTAL_TRANSACTIONS = 50_000;

function measureMs(run) {
  const started = process.hrtime.bigint();
  const result = run();
  const elapsedMs = Number(process.hrtime.bigint() - started) / 1_000_000;
  return { result, elapsedMs };
}

function createLargeStore() {
  const merchants = ["groceries", "coffee", "rent", "salary", "utilities", "travel"];
  const categories = ["Groceries", "Dining", "Housing", "Income", "Utilities", "Travel"];
  const transactions = [];

  for (let index = 0; index < TOTAL_TRANSACTIONS; index += 1) {
    const month = (index % 12) + 1;
    const day = (index % 28) + 1;
    const date = `2025-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const merchant = merchants[index % merchants.length];
    const category = categories[index % categories.length];
    const direction = merchant === "salary" ? "inflow" : "outflow";
    const amount = direction === "inflow" ? 2500 + (index % 300) : 5 + (index % 120);

    transactions.push({
      id: `txn_perf_${index}`,
      user_id: USER_ID,
      account_id: "acct_perf_1",
      account_key: "perf-checking",
      source_type: "imported",
      source_file_id: null,
      transaction_date: date,
      post_date: date,
      merchant_raw: merchant,
      merchant_normalized: merchant,
      description: `${merchant} transaction ${index}`,
      amount,
      currency: "USD",
      direction,
      transaction_type: direction === "inflow" ? "income" : "expense",
      category_raw: category,
      category_final: category,
      category_confidence: 0.95,
      category_strategy: "rule",
      review_status: "reviewed",
      tags: [],
      notes: null,
      recurring_rule_id: null,
      dedupe_fingerprint: `fp_perf_${index}`,
      confidence_score: 0.95,
      source_metadata: {},
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      deleted_at: null
    });
  }

  return {
    users: [{ id: USER_ID, email: "perf@minance.local", createdAt: "2026-01-01", updatedAt: "2026-01-01" }],
    sessions: [],
    accounts: [
      {
        id: "acct_perf_1",
        userId: USER_ID,
        normalizedKey: "perf-checking",
        displayName: "Perf Checking",
        sourceInstitution: null,
        accountType: "checking",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z"
      }
    ],
    transactions,
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
    auditEvents: []
  };
}

test("50k transaction dataset stays within guardrails for filtering and dashboard analytics", () => {
  resetStoreForTests(createLargeStore());

  const filtered = measureMs(() =>
    listTransactions(USER_ID, {
      range: "all",
      category: "Groceries",
      direction: "outflow",
      query: "transaction",
      sort_by: "date",
      sort_order: "desc",
      limit: 200
    })
  );

  const dashboard = measureMs(() =>
    getOverview(USER_ID, {
      range: "all"
    })
  );

  const rollup = measureMs(() =>
    getCategoryRollup(USER_ID, {
      range: "all"
    })
  );

  assert.ok(
    filtered.elapsedMs < 2200,
    `Filtering guard exceeded: ${filtered.elapsedMs.toFixed(1)}ms for 50k transactions`
  );
  assert.ok(
    dashboard.elapsedMs < 2400,
    `Dashboard overview guard exceeded: ${dashboard.elapsedMs.toFixed(1)}ms for 50k transactions`
  );
  assert.ok(
    rollup.elapsedMs < 2200,
    `Category rollup guard exceeded: ${rollup.elapsedMs.toFixed(1)}ms for 50k transactions`
  );

  assert.ok(Array.isArray(filtered.result.items));
  assert.ok(filtered.result.items.length > 0);
  assert.ok(dashboard.result.summary.transactionCount >= TOTAL_TRANSACTIONS);
  assert.ok(Array.isArray(rollup.result));
});
