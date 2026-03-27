// services/api/test/llm/tool-executor.test.ts
import test from "node:test";
import assert from "node:assert/strict";

import { resetStoreForTests } from "../../src/store.ts";
import { executeTool, getAvailableTools } from "../../src/llm/tool-executor.ts";
import { QA_TOOLS } from "../../src/llm/tools.ts";

const baseStore = {
  users: [{ id: "user_1", email: "user@example.com", createdAt: "2026-01-01", updatedAt: "2026-01-01" }],
  sessions: [],
  accounts: [],
  transactions: [
    {
      id: "txn_1",
      user_id: "user_1",
      transaction_date: "2026-01-15",
      merchant_normalized: "coffee shop",
      merchant_raw: "Coffee Shop",
      description: "Morning coffee",
      amount: 15,
      direction: "outflow",
      category_final: "Dining",
      dedupe_fingerprint: "a"
    },
    {
      id: "txn_2",
      user_id: "user_1",
      transaction_date: "2026-01-20",
      merchant_normalized: "grocery store",
      merchant_raw: "Grocery Store",
      description: "Weekly groceries",
      amount: 150,
      direction: "outflow",
      category_final: "Groceries",
      dedupe_fingerprint: "b"
    },
    {
      id: "txn_3",
      user_id: "user_1",
      transaction_date: "2026-01-25",
      merchant_normalized: "payroll",
      merchant_raw: "Payroll",
      description: "Salary",
      amount: 3000,
      direction: "inflow",
      category_final: "Income",
      dedupe_fingerprint: "c"
    },
    {
      id: "txn_4",
      user_id: "user_2",
      transaction_date: "2026-01-15",
      merchant_normalized: "coffee shop",
      merchant_raw: "Coffee Shop",
      description: "Another user coffee",
      amount: 20,
      direction: "outflow",
      category_final: "Dining",
      dedupe_fingerprint: "d"
    }
  ],
  categories: [
    {
      id: "cat_dining",
      userId: "user_1",
      name: "Dining",
      emoji: "🍽️",
      coarseKey: "extra",
      type: "expense",
      budget: null,
      isSystem: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    },
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
    },
    {
      id: "cat_other_user",
      userId: "user_2",
      name: "Dining",
      emoji: "🍽️",
      coarseKey: "extra",
      type: "expense",
      budget: null,
      isSystem: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    }
  ],
  categoryRules: [],
  categoryStrategies: [],
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

const ACCOUNT_SCOPED_QA_TOOL_NAMES = [
  "get_overview",
  "get_category_breakdown",
  "get_merchant_breakdown",
  "get_anomalies",
  "list_transactions"
];

function createAccountScopedStore() {
  const store = structuredClone(baseStore);
  store.transactions[0].account_key = "account hyatt";
  store.transactions[0].account_id = "acct_hyatt";
  store.transactions[1].account_key = "household checking";
  store.transactions[1].account_id = "acct_household";
  store.transactions[2].account_key = "payroll checking";
  store.transactions[2].account_id = "acct_payroll";
  return store;
}

function createScopedTransaction(overrides: Record<string, unknown> = {}) {
  return {
    id: "txn_scoped",
    user_id: "user_1",
    transaction_date: "2026-01-16",
    merchant_normalized: "merchant",
    merchant_raw: "Merchant",
    description: "Scoped transaction",
    amount: 10,
    direction: "outflow",
    category_final: "Dining",
    dedupe_fingerprint: "scoped",
    ...overrides
  };
}

test("executeTool returns error for unknown tool", async () => {
  resetStoreForTests(structuredClone(baseStore));

  const result = await executeTool("unknown_tool", {}, { userId: "user_1" });

  assert.equal(result.success, false);
  assert.ok(result.error?.includes("Unknown tool"));
  assert.equal(result.meta?.toolName, "unknown_tool");
});

test("get_data_bounds returns user's transaction date range", async () => {
  resetStoreForTests(structuredClone(baseStore));

  const result = await executeTool("get_data_bounds", {}, { userId: "user_1" });

  assert.equal(result.success, true);
  assert.equal(result.data?.start, "2026-01-15");
  assert.equal(result.data?.end, "2026-01-25");
  assert.equal(result.data?.count, 3);
});

test("get_data_bounds enforces user isolation", async () => {
  resetStoreForTests(structuredClone(baseStore));

  const result = await executeTool("get_data_bounds", {}, { userId: "user_2" });

  assert.equal(result.success, true);
  assert.equal(result.data?.count, 1);
});

test("get_overview returns financial summary", async () => {
  resetStoreForTests(structuredClone(baseStore));

  const result = await executeTool(
    "get_overview",
    { start: "2026-01-01", end: "2026-01-31" },
    { userId: "user_1" }
  );

  assert.equal(result.success, true);
  assert.equal(result.data?.summary?.totalSpend, 165);
  assert.equal(result.data?.summary?.totalIncome, 3000);
  assert.ok(Array.isArray(result.data?.trend));
  assert.ok(Array.isArray(result.data?.topCategories));
  assert.ok(Array.isArray(result.data?.topMerchants));
});

test("get_overview enforces user isolation", async () => {
  resetStoreForTests(structuredClone(baseStore));

  const result = await executeTool(
    "get_overview",
    { start: "2026-01-01", end: "2026-01-31" },
    { userId: "user_1" }
  );

  // Should only include user_1's transactions (165 spend), not user_2's (20)
  assert.equal(result.data?.summary?.totalSpend, 165);
});

test("assistant analytics tools omit excluded-group transactions by default", async () => {
  const store = structuredClone(baseStore);
  store.transactions.push({
    id: "txn_excluded",
    user_id: "user_1",
    transaction_date: "2026-01-18",
    merchant_normalized: "internal transfer",
    merchant_raw: "Internal Transfer",
    description: "Move to savings",
    amount: 200,
    direction: "outflow",
    category_final: "Uncategorized",
    dedupe_fingerprint: "excluded"
  });

  resetStoreForTests(store);

  const overview = await executeTool(
    "get_overview",
    { start: "2026-01-01", end: "2026-01-31" },
    { userId: "user_1" }
  );
  const categories = await executeTool(
    "get_category_breakdown",
    { start: "2026-01-01", end: "2026-01-31" },
    { userId: "user_1" }
  );
  const transactions = await executeTool(
    "list_transactions",
    { start: "2026-01-01", end: "2026-01-31" },
    { userId: "user_1" }
  );

  assert.equal(overview.success, true);
  assert.equal(overview.data?.summary?.totalSpend, 165);
  assert.ok(!overview.data?.topMerchants?.some((entry: { merchant: string }) => entry.merchant === "internal transfer"));
  assert.equal(categories.success, true);
  assert.ok(!categories.data?.some((entry: { category: string }) => entry.category === "Other"));
  assert.equal(transactions.success, true);
  assert.equal(transactions.data?.total, 3);
  assert.ok(!transactions.data?.items?.some((entry: { id: string }) => entry.id === "txn_excluded"));
});

test("get_category_breakdown returns categories with amounts", async () => {
  resetStoreForTests(structuredClone(baseStore));

  const result = await executeTool(
    "get_category_breakdown",
    { start: "2026-01-01", end: "2026-01-31" },
    { userId: "user_1" }
  );

  assert.equal(result.success, true);
  assert.ok(Array.isArray(result.data));

  const dining = result.data?.find((c: { category: string }) => c.category === "Dining");
  const groceries = result.data?.find((c: { category: string }) => c.category === "Groceries");

  assert.equal(dining?.amount, 15);
  assert.equal(groceries?.amount, 150);
});

test("get_merchant_breakdown returns merchants with amounts", async () => {
  resetStoreForTests(structuredClone(baseStore));

  const result = await executeTool(
    "get_merchant_breakdown",
    { start: "2026-01-01", end: "2026-01-31" },
    { userId: "user_1" }
  );

  assert.equal(result.success, true);
  assert.ok(Array.isArray(result.data));

  const coffeeShop = result.data?.find((m: { merchant: string }) => m.merchant === "coffee shop");
  const groceryStore = result.data?.find((m: { merchant: string }) => m.merchant === "grocery store");

  assert.equal(coffeeShop?.amount, 15);
  assert.equal(groceryStore?.amount, 150);
});

test("get_anomalies detects outliers", async () => {
  const store = structuredClone(baseStore);
  // Add a large transaction that should be flagged as anomaly
  store.transactions.push({
    id: "txn_large",
    user_id: "user_1",
    transaction_date: "2026-01-22",
    merchant_normalized: "electronics store",
    merchant_raw: "Electronics Store",
    description: "Big purchase",
    amount: 2000,
    direction: "outflow",
    category_final: "Shopping",
    dedupe_fingerprint: "large"
  });

  resetStoreForTests(store);

  const result = await executeTool(
    "get_anomalies",
    { start: "2026-01-01", end: "2026-01-31" },
    { userId: "user_1" }
  );

  assert.equal(result.success, true);
  assert.ok(Array.isArray(result.data));
});

test("list_transactions returns paginated transactions", async () => {
  resetStoreForTests(structuredClone(baseStore));

  const result = await executeTool(
    "list_transactions",
    { start: "2026-01-01", end: "2026-01-31", limit: 10 },
    { userId: "user_1" }
  );

  assert.equal(result.success, true);
  assert.equal(result.data?.total, 3);
  assert.ok(Array.isArray(result.data?.items));
  assert.ok(result.data?.items?.length <= 10);
});

test("list_transactions enforces user isolation", async () => {
  resetStoreForTests(structuredClone(baseStore));

  const result = await executeTool(
    "list_transactions",
    { start: "2026-01-01", end: "2026-01-31" },
    { userId: "user_1" }
  );

  // Should only include user_1's transactions (3), not user_2's
  assert.equal(result.data?.total, 3);

  // All returned transactions should belong to user_1
  for (const item of result.data?.items || []) {
    assert.equal(item.user_id, "user_1");
  }
});

test("list_transactions supports account-scoped filtering", async () => {
  const store = createAccountScopedStore();

  resetStoreForTests(store);

  const byName = await executeTool(
    "list_transactions",
    { account: "Account Hyatt", range: "all" },
    { userId: "user_1" }
  );
  assert.equal(byName.success, true);
  assert.equal(byName.data?.total, 1);
  assert.equal(byName.data?.items?.[0]?.merchant_raw, "Coffee Shop");

  const byId = await executeTool(
    "list_transactions",
    { account: "acct_hyatt", range: "all" },
    { userId: "user_1" }
  );
  assert.equal(byId.success, true);
  assert.equal(byId.data?.total, 1);
  assert.equal(byId.data?.items?.[0]?.merchant_raw, "Coffee Shop");
});

test("get_overview supports account-scoped filtering", async () => {
  resetStoreForTests(createAccountScopedStore());

  const result = await executeTool(
    "get_overview",
    { account: "Account Hyatt", range: "all" },
    { userId: "user_1" }
  );

  assert.equal(result.success, true);
  assert.equal(result.data?.summary?.totalSpend, 15);
  assert.equal(result.data?.summary?.totalIncome, 0);
  assert.equal(result.data?.summary?.transactionCount, 1);
  assert.equal(result.data?.topMerchants?.[0]?.merchant, "coffee shop");
});

test("get_category_breakdown supports account-scoped filtering", async () => {
  resetStoreForTests(createAccountScopedStore());

  const result = await executeTool(
    "get_category_breakdown",
    { account: "acct_household", range: "all" },
    { userId: "user_1" }
  );

  assert.equal(result.success, true);
  assert.deepEqual(
    result.data?.map((entry: { category: string; amount: number }) => ({
      category: entry.category,
      amount: entry.amount
    })),
    [{ category: "Groceries", amount: 150 }]
  );
});

test("get_merchant_breakdown supports account-scoped filtering", async () => {
  resetStoreForTests(createAccountScopedStore());

  const result = await executeTool(
    "get_merchant_breakdown",
    { account: "Account Hyatt", range: "all" },
    { userId: "user_1" }
  );

  assert.equal(result.success, true);
  assert.deepEqual(
    result.data?.map((entry: { merchant: string; amount: number }) => ({
      merchant: entry.merchant,
      amount: entry.amount
    })),
    [{ merchant: "coffee shop", amount: 15 }]
  );
});

test("get_anomalies supports account-scoped filtering", async () => {
  const store = createAccountScopedStore();
  store.transactions.push(
    createScopedTransaction({
      id: "txn_hyatt_2",
      merchant_normalized: "lunch spot",
      merchant_raw: "Lunch Spot",
      description: "Lunch",
      amount: 20,
      account_key: "account hyatt",
      account_id: "acct_hyatt",
      dedupe_fingerprint: "hyatt-2"
    }),
    createScopedTransaction({
      id: "txn_hyatt_3",
      transaction_date: "2026-01-17",
      merchant_normalized: "tea shop",
      merchant_raw: "Tea Shop",
      description: "Tea",
      amount: 25,
      account_key: "account hyatt",
      account_id: "acct_hyatt",
      dedupe_fingerprint: "hyatt-3"
    }),
    createScopedTransaction({
      id: "txn_hyatt_4",
      transaction_date: "2026-01-18",
      merchant_normalized: "bakery",
      merchant_raw: "Bakery",
      description: "Bakery",
      amount: 30,
      account_key: "account hyatt",
      account_id: "acct_hyatt",
      dedupe_fingerprint: "hyatt-4"
    }),
    createScopedTransaction({
      id: "txn_hyatt_5",
      transaction_date: "2026-01-19",
      merchant_normalized: "book store",
      merchant_raw: "Book Store",
      description: "Books",
      amount: 35,
      category_final: "Shopping",
      account_key: "account hyatt",
      account_id: "acct_hyatt",
      dedupe_fingerprint: "hyatt-5"
    }),
    createScopedTransaction({
      id: "txn_hyatt_big",
      transaction_date: "2026-01-20",
      merchant_normalized: "electronics store",
      merchant_raw: "Electronics Store",
      description: "Laptop",
      amount: 2000,
      category_final: "Shopping",
      account_key: "account hyatt",
      account_id: "acct_hyatt",
      dedupe_fingerprint: "hyatt-big"
    }),
    createScopedTransaction({
      id: "txn_household_big",
      transaction_date: "2026-01-21",
      merchant_normalized: "appliance store",
      merchant_raw: "Appliance Store",
      description: "Fridge",
      amount: 1800,
      category_final: "Shopping",
      account_key: "household checking",
      account_id: "acct_household",
      dedupe_fingerprint: "household-big"
    })
  );

  resetStoreForTests(store);

  const result = await executeTool(
    "get_anomalies",
    { account: "acct_hyatt", range: "all" },
    { userId: "user_1" }
  );

  assert.equal(result.success, true);
  assert.ok(result.data?.some((entry: { transactionId: string }) => entry.transactionId === "txn_hyatt_big"));
  assert.ok(!result.data?.some((entry: { transactionId: string }) => entry.transactionId === "txn_household_big"));
});

test("get_categories returns user's categories", async () => {
  resetStoreForTests(structuredClone(baseStore));

  const result = await executeTool("get_categories", {}, { userId: "user_1" });

  assert.equal(result.success, true);
  assert.ok(Array.isArray(result.data));

  // Should have 2 categories for user_1
  const names = result.data?.map((c: { name: string }) => c.name);
  assert.ok(names.includes("Dining"));
  assert.ok(names.includes("Groceries"));
});

test("get_categories enforces user isolation", async () => {
  resetStoreForTests(structuredClone(baseStore));

  const result = await executeTool("get_categories", {}, { userId: "user_1" });

  // Should only include user_1's categories (2), not user_2's
  assert.equal(result.data?.length, 2);
});

test("get_merchant_history returns monthly breakdown for merchant", async () => {
  const store = structuredClone(baseStore);
  // Add more transactions for the same merchant
  store.transactions.push(
    {
      id: "txn_5",
      user_id: "user_1",
      transaction_date: "2026-01-10",
      merchant_normalized: "coffee shop",
      merchant_raw: "Coffee Shop",
      description: "Another coffee",
      amount: 12,
      direction: "outflow",
      category_final: "Dining",
      dedupe_fingerprint: "e"
    },
    {
      id: "txn_6",
      user_id: "user_1",
      transaction_date: "2026-02-05",
      merchant_normalized: "coffee shop",
      merchant_raw: "Coffee Shop",
      description: "February coffee",
      amount: 18,
      direction: "outflow",
      category_final: "Dining",
      dedupe_fingerprint: "f"
    }
  );

  resetStoreForTests(store);

  const result = await executeTool(
    "get_merchant_history",
    { merchant: "coffee shop", start: "2026-01-01", end: "2026-02-28" },
    { userId: "user_1" }
  );

  assert.equal(result.success, true);
  assert.equal(result.data?.merchant, "coffee shop");
  assert.ok(Array.isArray(result.data?.history));
  assert.ok(result.data?.totalAmount > 0);
});

test("get_merchant_history requires merchant parameter", async () => {
  resetStoreForTests(structuredClone(baseStore));

  const result = await executeTool(
    "get_merchant_history",
    { start: "2026-01-01", end: "2026-01-31" },
    { userId: "user_1" }
  );

  assert.equal(result.success, false);
  assert.ok(result.error?.includes("merchant parameter is required"));
});

test("get_merchant_transactions_6_months returns recent data", async () => {
  resetStoreForTests(structuredClone(baseStore));

  const result = await executeTool(
    "get_merchant_transactions_6_months",
    { merchant: "coffee shop" },
    { userId: "user_1" }
  );

  assert.equal(result.success, true);
  assert.equal(result.data?.merchant, "coffee shop");
  assert.ok(Array.isArray(result.data?.transactions));
  assert.ok(Array.isArray(result.data?.monthlyHistory));
  assert.ok(result.data?.summary?.totalAmount > 0);
});

test("get_merchant_transactions_6_months requires merchant parameter", async () => {
  resetStoreForTests(structuredClone(baseStore));

  const result = await executeTool("get_merchant_transactions_6_months", {}, { userId: "user_1" });

  assert.equal(result.success, false);
  assert.ok(result.error?.includes("merchant parameter is required"));
});

test("reference_previous returns reference info", async () => {
  resetStoreForTests(structuredClone(baseStore));

  const result = await executeTool(
    "reference_previous",
    { key: "result_1", description: "Previous spending data" },
    { userId: "user_1" }
  );

  assert.equal(result.success, true);
  assert.equal(result.data?.referenced, true);
  assert.equal(result.data?.key, "result_1");
});

test("ask_clarification returns clarification request", async () => {
  resetStoreForTests(structuredClone(baseStore));

  const result = await executeTool(
    "ask_clarification",
    { question: "Which time period?", options: ["This month", "Last month", "Custom"] },
    { userId: "user_1" }
  );

  assert.equal(result.success, true);
  assert.equal(result.data?.needsClarification, true);
  assert.equal(result.data?.question, "Which time period?");
  assert.deepEqual(result.data?.options, ["This month", "Last month", "Custom"]);
});

test("getAvailableTools returns all tool definitions", () => {
  const tools = getAvailableTools();

  assert.ok(Array.isArray(tools));
  assert.ok(tools.length >= 10);

  const toolNames = tools.map((t) => t.name);
  assert.ok(toolNames.includes("get_data_bounds"));
  assert.ok(toolNames.includes("get_overview"));
  assert.ok(toolNames.includes("get_category_breakdown"));
  assert.ok(toolNames.includes("get_merchant_breakdown"));
  assert.ok(toolNames.includes("get_anomalies"));
  assert.ok(toolNames.includes("list_transactions"));
  assert.ok(toolNames.includes("get_categories"));
  assert.ok(toolNames.includes("get_merchant_history"));
  assert.ok(toolNames.includes("get_merchant_transactions_6_months"));
  assert.ok(toolNames.includes("reference_previous"));
  assert.ok(toolNames.includes("ask_clarification"));
});

test("qa tool definitions expose account filter for account-scoped questions", () => {
  const qaToolsByName = new Map(QA_TOOLS.map((tool) => [tool.function.name, tool]));

  for (const toolName of ACCOUNT_SCOPED_QA_TOOL_NAMES) {
    const tool = qaToolsByName.get(toolName);
    assert.ok(tool, `${toolName} should exist in QA_TOOLS`);
    assert.ok(
      Object.hasOwn(tool!.function.parameters.properties, "account"),
      `${toolName} should include an account filter`
    );
  }
});

test("getAvailableTools includes account filter for scoped analytics tools", () => {
  const availableByName = new Map(getAvailableTools().map((tool) => [tool.name, tool]));

  for (const toolName of ACCOUNT_SCOPED_QA_TOOL_NAMES) {
    const tool = availableByName.get(toolName);
    assert.ok(tool, `${toolName} should exist in getAvailableTools`);
    assert.ok(
      Object.hasOwn(tool!.parameters.properties, "account"),
      `${toolName} should include account in metadata`
    );
  }
});

test("tool results include execution metadata", async () => {
  resetStoreForTests(structuredClone(baseStore));

  const result = await executeTool("get_data_bounds", {}, { userId: "user_1" });

  assert.ok(result.meta);
  assert.equal(result.meta?.toolName, "get_data_bounds");
  assert.ok(typeof result.meta?.executionTimeMs === "number");
  assert.ok(result.meta?.executionTimeMs >= 0);
});

test("executeTool normalizes date parameters", async () => {
  resetStoreForTests(structuredClone(baseStore));

  // Pass numeric dates (should be converted to strings)
  const result = await executeTool(
    "get_overview",
    { start: 20260101, end: 20260131 },
    { userId: "user_1" }
  );

  // Should not throw an error
  assert.equal(result.success, true);
});

test("get_overview with range parameter", async () => {
  resetStoreForTests(structuredClone(baseStore));

  const result = await executeTool("get_overview", { range: "all" }, { userId: "user_1" });

  assert.equal(result.success, true);
  assert.ok(result.data?.meta?.appliedRange);
});
