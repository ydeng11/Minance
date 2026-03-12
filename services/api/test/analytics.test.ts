import test from "node:test";
import assert from "node:assert/strict";

import { resetStoreForTests } from "../src/store.ts";
import {
  filterUserTransactions,
  getExplorerAnalytics,
  getOverview,
  getCategoryRollup,
  getAnomalies
} from "../src/analytics.ts";

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

test("analytics transaction filtering honors account, query, tag, review, type, and amount filters", () => {
  const store = structuredClone(baseStore);
  store.transactions = [
    {
      id: "txn_match",
      user_id: "user_1",
      transaction_date: "2026-01-10",
      account_id: "acct_card",
      account_key: "credit card",
      merchant_normalized: "gas station",
      merchant_raw: "Gas Station",
      description: "Fuel stop",
      memo: "car commute",
      amount: 40,
      direction: "debit",
      transaction_type: "expense",
      category_final: "Transport",
      tags: ["car"],
      review_status: "reviewed",
      needs_category_review: false,
      dedupe_fingerprint: "match"
    },
    {
      id: "txn_other",
      user_id: "user_1",
      transaction_date: "2026-01-11",
      account_id: "acct_checking",
      account_key: "checking",
      merchant_normalized: "coffee",
      merchant_raw: "Coffee",
      description: "Morning coffee",
      memo: "latte run",
      amount: 10,
      direction: "debit",
      transaction_type: "expense",
      category_final: "Dining",
      tags: ["coffee"],
      review_status: "needs_review",
      needs_category_review: true,
      dedupe_fingerprint: "other"
    }
  ];

  resetStoreForTests(store);

  const transactions = filterUserTransactions("user_1", {
    start: "2026-01-01",
    end: "2026-01-31",
    account: "acct_card",
    query: "fuel",
    tag: "car",
    review_status: "reviewed",
    transaction_type: "expense",
    min_amount: 20,
    max_amount: 60
  });

  assert.equal(transactions.length, 1);
  assert.equal(transactions[0]?.id, "txn_match");
});

test("getExplorerAnalytics returns comparison data and account rollups", () => {
  const store = structuredClone(baseStore);
  store.accounts = [
    {
      id: "acct_checking",
      userId: "user_1",
      displayName: "Checking",
      sourceInstitution: "Local Bank",
      accountType: "checking",
      currency: "USD",
      initialBalance: 0,
      version: 1,
      status: "active",
      includeInCharts: true,
      hidden: false,
      closed: false,
      closedAt: null,
      normalizedKey: "checking",
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01"
    },
    {
      id: "acct_card",
      userId: "user_1",
      displayName: "Credit Card",
      sourceInstitution: "Local Bank",
      accountType: "credit",
      currency: "USD",
      initialBalance: 0,
      version: 1,
      status: "active",
      includeInCharts: true,
      hidden: false,
      closed: false,
      closedAt: null,
      normalizedKey: "credit card",
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01"
    }
  ];
  store.transactions = [
    {
      id: "txn_fuel_jan",
      user_id: "user_1",
      transaction_date: "2026-01-10",
      account_id: "acct_card",
      account_key: "credit card",
      merchant_normalized: "gas station",
      merchant_raw: "Gas Station",
      description: "Fuel stop",
      amount: 40,
      direction: "debit",
      transaction_type: "expense",
      category_final: "Transport",
      dedupe_fingerprint: "fuel_jan"
    },
    {
      id: "txn_grocery_jan",
      user_id: "user_1",
      transaction_date: "2026-01-12",
      account_id: "acct_checking",
      account_key: "checking",
      merchant_normalized: "super market",
      merchant_raw: "Super Market",
      description: "Groceries",
      amount: 60,
      direction: "debit",
      transaction_type: "expense",
      category_final: "Groceries",
      dedupe_fingerprint: "grocery_jan"
    },
    {
      id: "txn_payroll_jan",
      user_id: "user_1",
      transaction_date: "2026-01-15",
      account_id: "acct_checking",
      account_key: "checking",
      merchant_normalized: "payroll",
      merchant_raw: "Payroll",
      description: "Salary",
      amount: 1000,
      direction: "credit",
      transaction_type: "income",
      category_final: "Income",
      dedupe_fingerprint: "payroll_jan"
    },
    {
      id: "txn_fuel_dec",
      user_id: "user_1",
      transaction_date: "2025-12-12",
      account_id: "acct_card",
      account_key: "credit card",
      merchant_normalized: "gas station",
      merchant_raw: "Gas Station",
      description: "Fuel stop",
      amount: 20,
      direction: "debit",
      transaction_type: "expense",
      category_final: "Transport",
      dedupe_fingerprint: "fuel_dec"
    },
    {
      id: "txn_coffee_dec",
      user_id: "user_1",
      transaction_date: "2025-12-14",
      account_id: "acct_checking",
      account_key: "checking",
      merchant_normalized: "coffee",
      merchant_raw: "Coffee",
      description: "Coffee",
      amount: 10,
      direction: "debit",
      transaction_type: "expense",
      category_final: "Dining",
      dedupe_fingerprint: "coffee_dec"
    }
  ];

  resetStoreForTests(store);

  const analytics = getExplorerAnalytics("user_1", {
    start: "2026-01-01",
    end: "2026-01-31",
    category_view: "granular",
    compare: "previous"
  });

  assert.equal(analytics.summary.current.totalSpend, 100);
  assert.equal(analytics.comparison.previous.totalSpend, 30);
  assert.equal(analytics.accounts.items[0]?.accountName, "Checking");
  assert.equal(analytics.accounts.items[0]?.outflow, 60);
  assert.equal(analytics.accounts.items[1]?.accountName, "Credit Card");
  assert.ok(analytics.categories.items.length > 0);
  assert.ok(analytics.merchants.items.length > 0);
  assert.ok(Array.isArray(analytics.heatmap.items));
  assert.ok(Array.isArray(analytics.anomalies.items));
});
