import test from "node:test";
import assert from "node:assert/strict";

import { resetStoreForTests } from "../src/store.ts";
import { bulkUpdateTransactions, createManualTransaction, listTransactions } from "../src/transactions.ts";
import { getOverview } from "../src/analytics.ts";

const NORMALIZED_TRANSACTION_KEYS = [
  "account_id",
  "account_key",
  "amount",
  "category_coarse",
  "category_coarse_emoji",
  "category_coarse_key",
  "category_confidence",
  "category_emoji",
  "category_final",
  "category_raw",
  "category_strategy",
  "created_at",
  "currency",
  "dedupe_fingerprint",
  "deleted_at",
  "deleted_by",
  "deleted_reason",
  "description",
  "direction",
  "id",
  "memo",
  "merchant_normalized",
  "merchant_raw",
  "needs_category_review",
  "post_date",
  "recurring_rule_id",
  "review_status",
  "source_file_id",
  "source_type",
  "tags",
  "transaction_date",
  "transaction_type",
  "updated_at",
  "user_id"
];

function sortedKeys(value: object | null | undefined) {
  return Object.keys(value || {}).sort();
}

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

test("listTransactions sorts same-day transactions by newest created_at first", () => {
  const store = structuredClone(BASE_STORE);
  store.transactions = [
    {
      ...store.transactions[0],
      id: "txn_same_day_older",
      transaction_date: "2026-01-10",
      created_at: "2026-01-10T09:00:00.000Z",
      updated_at: "2026-01-10T09:00:00.000Z"
    },
    {
      ...store.transactions[1],
      id: "txn_same_day_newer",
      transaction_date: "2026-01-10",
      created_at: "2026-01-10T12:00:00.000Z",
      updated_at: "2026-01-10T12:00:00.000Z"
    },
    ...store.transactions.slice(2)
  ];

  resetStoreForTests(store);

  const listed = listTransactions("user_1", { range: "all", limit: 50, offset: 0 });
  assert.deepEqual(listed.items.slice(0, 2).map((entry) => entry.id), [
    "txn_same_day_newer",
    "txn_same_day_older"
  ]);
});

test("listTransactions omits unsupported extra metadata from manual records", () => {
  const store = structuredClone(BASE_STORE);
  store.transactions = [
    {
      ...store.transactions[0],
      id: "txn_with_emoji",
      legacy_unused_field: "stale"
    }
  ];

  resetStoreForTests(store);

  const listed = listTransactions("user_1", { range: "all", limit: 50, offset: 0 });
  assert.deepEqual(sortedKeys(listed.items[0]), NORMALIZED_TRANSACTION_KEYS);
});

test("createManualTransaction returns the normalized transaction contract", () => {
  const store = structuredClone(BASE_STORE);
  store.categories = [
    {
      id: "cat_groceries",
      userId: "user_1",
      name: "Groceries",
      emoji: "🛒",
      coarseKey: "essential",
      type: "expense",
      budget: null,
      isSystem: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    }
  ];
  resetStoreForTests(store);

  const created = createManualTransaction("user_1", {
    transaction_date: "2026-01-11",
    description: "Dinner split",
    merchant_raw: "Friends Dinner",
    amount: 45,
    direction: "outflow",
    category_final: "Groceries",
    account_name: "checking"
  });

  assert.deepEqual(sortedKeys(created), NORMALIZED_TRANSACTION_KEYS);
});

test("bulkUpdateTransactions delete preserves soft-delete metadata in normalized responses", () => {
  const store = structuredClone(BASE_STORE);
  store.categories = [
    {
      id: "cat_groceries",
      userId: "user_1",
      name: "Groceries",
      emoji: "G",
      coarseKey: "essential",
      type: "expense",
      budget: null,
      isSystem: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    }
  ];
  resetStoreForTests(store);

  const first = createManualTransaction("user_1", {
    transaction_date: "2026-01-11",
    description: "Dinner split",
    merchant_raw: "Friends Dinner",
    amount: 45,
    direction: "outflow",
    category_final: "Groceries",
    account_name: "checking"
  });
  const second = createManualTransaction("user_1", {
    transaction_date: "2026-01-12",
    description: "Lunch split",
    merchant_raw: "Team Lunch",
    amount: 18,
    direction: "outflow",
    category_final: "Groceries",
    account_name: "checking"
  });

  const deleted = bulkUpdateTransactions("user_1", {
    transaction_ids: [first.id, second.id],
    operation: "delete"
  });

  assert.equal(deleted.updated, 2);
  assert.equal(
    deleted.transactions.every(
      (entry) =>
        typeof entry.deleted_at === "string"
        && entry.deleted_at.length > 0
        && entry.deleted_reason === "user_bulk_delete"
        && entry.deleted_by === "user_1"
    ),
    true
  );
});

test("listTransactions filters by minimum and maximum absolute amount", () => {
  resetStoreForTests(structuredClone(BASE_STORE));

  const listed = listTransactions("user_1", {
    range: "all",
    min_amount: "60",
    max_amount: "500",
    limit: 50,
    offset: 0
  });

  assert.deepEqual(listed.items.map((entry) => entry.id), ["txn_imported_neg"]);
});

test("listTransactions keeps custom transfer categories when filtering by transfer type", () => {
  const store = structuredClone(BASE_STORE);
  store.categories = [
    {
      id: "cat_transfer_custom",
      userId: "user_1",
      name: "Brokerage Sweep",
      emoji: "🔁",
      coarseKey: "neutral",
      type: "transfer",
      budget: null,
      isSystem: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    }
  ];
  store.transactions = [
    {
      id: "txn_transfer_custom",
      user_id: "user_1",
      account_id: "acct_1",
      account_key: "checking",
      source_type: "imported",
      source_file_id: "imp_transfer",
      transaction_date: "2026-01-08",
      post_date: null,
      merchant_raw: "Brokerage",
      merchant_normalized: "brokerage",
      description: "Sweep to brokerage",
      amount: 250,
      currency: "USD",
      direction: "outflow",
      category_raw: "Brokerage Sweep",
      category_final: "Brokerage Sweep",
      category_confidence: 1,
      category_strategy: "import_override",
      needs_category_review: false,
      review_status: "reviewed",
      tags: [],
      recurring_rule_id: null,
      memo: null,
      dedupe_fingerprint: "fp_transfer_custom",
      created_at: "2026-01-08T00:00:00.000Z",
      updated_at: "2026-01-08T00:00:00.000Z"
    }
  ];

  resetStoreForTests(store);

  const listed = listTransactions("user_1", {
    range: "all",
    transaction_type: "transfer",
    limit: 50,
    offset: 0
  });

  assert.deepEqual(listed.items.map((entry) => entry.id), ["txn_transfer_custom"]);
  assert.equal(listed.items[0]?.transaction_type, "transfer");
});
