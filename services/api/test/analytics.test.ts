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
      direction: "outflow",
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
      direction: "inflow",
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
      direction: "outflow",
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
      direction: "outflow",
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
  auditEvents: []
};

test("overview calculates spend, income, and net", () => {
  resetStoreForTests(structuredClone(baseStore));
  const overview = getOverview("user_1", { start: "2026-01-01", end: "2026-01-31" });

  assert.equal(overview.summary.totalSpend, 410);
  assert.equal(overview.summary.totalIncome, 1000);
  assert.equal(overview.summary.netFlow, 590);
});

test("category rollup groups outflow amounts", () => {
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

test("overview and explorer omit excluded-group transactions by default", () => {
  const store = structuredClone(baseStore);
  store.transactions.push({
    id: "txn_excluded",
    user_id: "user_1",
    transaction_date: "2026-01-21",
    merchant_normalized: "internal transfer",
    merchant_raw: "Internal Transfer",
    description: "Move to savings",
    amount: 250,
    direction: "outflow",
    category_final: "Uncategorized",
    dedupe_fingerprint: "excluded"
  });

  resetStoreForTests(store);

  const rawTransactions = filterUserTransactions("user_1", {
    start: "2026-01-01",
    end: "2026-01-31"
  });
  const overview = getOverview("user_1", {
    start: "2026-01-01",
    end: "2026-01-31"
  });
  const explorer = getExplorerAnalytics("user_1", {
    start: "2026-01-01",
    end: "2026-01-31"
  });

  assert.ok(rawTransactions.some((entry) => entry.id === "txn_excluded"));
  assert.equal(overview.summary.totalSpend, 410);
  assert.ok(!overview.topCategories.some((entry) => entry.category === "Other"));
  assert.ok(!overview.topMerchants.some((entry) => entry.merchant === "internal transfer"));
  assert.equal(explorer.summary.current.totalSpend, 410);
  assert.ok(!explorer.categories.items.some((entry) => entry.category === "Other"));
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
      direction: "outflow",
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
      direction: "outflow",
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

test("analytics transaction filtering honors recurring-only sentinel", () => {
  const store = structuredClone(baseStore);
  store.transactions = [
    {
      id: "txn_recurring",
      user_id: "user_1",
      transaction_date: "2026-01-10",
      merchant_normalized: "netflix",
      merchant_raw: "Netflix",
      description: "Netflix subscription",
      amount: 15,
      direction: "outflow",
      category_final: "Entertainment",
      recurring_rule_id: "rule_netflix",
      dedupe_fingerprint: "recurring"
    },
    {
      id: "txn_one_off",
      user_id: "user_1",
      transaction_date: "2026-01-11",
      merchant_normalized: "movie theater",
      merchant_raw: "Movie Theater",
      description: "Weekend movie",
      amount: 24,
      direction: "outflow",
      category_final: "Entertainment",
      dedupe_fingerprint: "one-off"
    }
  ];

  resetStoreForTests(store);

  const filtered = filterUserTransactions("user_1", {
    start: "2026-01-01",
    end: "2026-01-31",
    recurring_rule_id: "true"
  });
  const explorer = getExplorerAnalytics("user_1", {
    start: "2026-01-01",
    end: "2026-01-31",
    recurring_rule_id: "true"
  });

  assert.deepEqual(filtered.map((entry) => entry.id), ["txn_recurring"]);
  assert.equal(explorer.summary.current.totalSpend, 15);
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
      direction: "outflow",
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
      direction: "outflow",
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
      direction: "inflow",
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
      direction: "outflow",
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
      direction: "outflow",
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

test("getExplorerAnalytics returns a seven-point summary sparkline", () => {
  const store = structuredClone(baseStore);
  store.transactions = [
    {
      id: "txn_card_1",
      user_id: "user_1",
      transaction_date: "2026-01-10",
      merchant_normalized: "grocer",
      merchant_raw: "Grocer",
      description: "Groceries",
      amount: 45,
      direction: "outflow",
      transaction_type: "expense",
      category_final: "Groceries",
      dedupe_fingerprint: "spark_1"
    },
    {
      id: "txn_card_2",
      user_id: "user_1",
      transaction_date: "2026-01-12",
      merchant_normalized: "gas",
      merchant_raw: "Gas",
      description: "Gas",
      amount: 20,
      direction: "outflow",
      transaction_type: "expense",
      category_final: "Transport",
      dedupe_fingerprint: "spark_2"
    },
    {
      id: "txn_income",
      user_id: "user_1",
      transaction_date: "2026-01-15",
      merchant_normalized: "payroll",
      merchant_raw: "Payroll",
      description: "Payroll",
      amount: 500,
      direction: "inflow",
      transaction_type: "income",
      category_final: "Income",
      dedupe_fingerprint: "spark_3"
    }
  ];

  resetStoreForTests(store);

  const analytics = getExplorerAnalytics("user_1", {
    start: "2026-01-01",
    end: "2026-01-15",
    category_view: "granular"
  });

  assert.equal(analytics.summary.sparkline.length, 7);
  assert.equal(analytics.summary.sparkline[0]?.date, "2026-01-09");
  assert.equal(analytics.summary.sparkline[6]?.date, "2026-01-15");
  assert.equal(analytics.summary.sparkline[1]?.spend, 45);
  assert.equal(analytics.summary.sparkline[3]?.spend, 20);
  assert.equal(analytics.summary.sparkline[6]?.income, 500);
});

test("getExplorerAnalytics includes category balance metrics and monthly composition", () => {
  const store = structuredClone(baseStore);
  store.transactions = [
    {
      id: "txn_groceries_feb",
      user_id: "user_1",
      transaction_date: "2026-02-03",
      merchant_normalized: "super market",
      merchant_raw: "Super Market",
      description: "Groceries",
      amount: 60,
      direction: "outflow",
      transaction_type: "expense",
      category_final: "Groceries",
      dedupe_fingerprint: "groceries_feb"
    },
    {
      id: "txn_dining_feb",
      user_id: "user_1",
      transaction_date: "2026-02-09",
      merchant_normalized: "noodles",
      merchant_raw: "Noodles",
      description: "Dinner",
      amount: 40,
      direction: "outflow",
      transaction_type: "expense",
      category_final: "Dining",
      dedupe_fingerprint: "dining_feb"
    },
    {
      id: "txn_salary_feb",
      user_id: "user_1",
      transaction_date: "2026-02-15",
      merchant_normalized: "payroll",
      merchant_raw: "Payroll",
      description: "Salary",
      amount: 1000,
      direction: "inflow",
      transaction_type: "income",
      category_final: "Salary",
      dedupe_fingerprint: "salary_feb"
    },
    {
      id: "txn_refund_feb",
      user_id: "user_1",
      transaction_date: "2026-02-18",
      merchant_normalized: "insurance",
      merchant_raw: "Insurance",
      description: "Refund",
      amount: 200,
      direction: "inflow",
      transaction_type: "income",
      category_final: "Refunds",
      dedupe_fingerprint: "refund_feb"
    }
  ];

  resetStoreForTests(store);

  const analytics = getExplorerAnalytics("user_1", {
    start: "2026-02-01",
    end: "2026-02-28",
    category_view: "granular"
  });

  const groceries = analytics.categories.items.find((entry) => entry.category === "Groceries");
  assert.equal(groceries?.spend, 60);
  assert.equal(groceries?.income, 0);
  assert.equal(groceries?.net, -60);
  assert.equal(groceries?.transactionCount, 1);
  assert.equal(groceries?.spendShare, 60);
  assert.equal(groceries?.incomeShare, 0);

  const salary = analytics.categories.items.find((entry) => entry.category === "Salary");
  assert.equal(salary?.spend, 0);
  assert.equal(salary?.income, 1000);
  assert.equal(salary?.net, 1000);
  assert.equal(salary?.transactionCount, 1);
  assert.equal(salary?.spendShare, 0);
  assert.equal(salary?.incomeShare, 83.33);

  const february = analytics.trend.items.find((entry) => entry.month === "2026-02");
  assert.deepEqual(
    february?.spendComposition.map((entry) => [entry.category, entry.amount]),
    [
      ["Groceries", 60],
      ["Dining", 40]
    ]
  );
  assert.deepEqual(
    february?.incomeComposition.map((entry) => [entry.category, entry.amount]),
    [
      ["Salary", 1000],
      ["Refunds", 200]
    ]
  );
});

test("getExplorerAnalytics returns weekday summary buckets and top category weekday rows", () => {
  const store = structuredClone(baseStore);
  store.transactions = [
    {
      id: "txn_groceries_sun",
      user_id: "user_1",
      transaction_date: "2026-01-04",
      account_id: "acct_checking",
      account_key: "checking",
      merchant_normalized: "super market",
      merchant_raw: "Super Market",
      description: "Groceries",
      amount: 80,
      direction: "outflow",
      transaction_type: "expense",
      category_final: "Groceries",
      dedupe_fingerprint: "weekday_groceries_sun"
    },
    {
      id: "txn_dining_tue",
      user_id: "user_1",
      transaction_date: "2026-01-06",
      account_id: "acct_checking",
      account_key: "checking",
      merchant_normalized: "noodles",
      merchant_raw: "Noodles",
      description: "Dinner",
      amount: 70,
      direction: "outflow",
      transaction_type: "expense",
      category_final: "Dining",
      dedupe_fingerprint: "weekday_dining_tue"
    },
    {
      id: "txn_transport_wed",
      user_id: "user_1",
      transaction_date: "2026-01-07",
      account_id: "acct_card",
      account_key: "credit card",
      merchant_normalized: "gas station",
      merchant_raw: "Gas Station",
      description: "Fuel",
      amount: 60,
      direction: "outflow",
      transaction_type: "expense",
      category_final: "Transport",
      dedupe_fingerprint: "weekday_transport_wed"
    },
    {
      id: "txn_rent_thu",
      user_id: "user_1",
      transaction_date: "2026-01-08",
      account_id: "acct_checking",
      account_key: "checking",
      merchant_normalized: "landlord",
      merchant_raw: "Landlord",
      description: "Rent",
      amount: 50,
      direction: "outflow",
      transaction_type: "expense",
      category_final: "Rent",
      dedupe_fingerprint: "weekday_rent_thu"
    },
    {
      id: "txn_entertainment_fri",
      user_id: "user_1",
      transaction_date: "2026-01-09",
      account_id: "acct_card",
      account_key: "credit card",
      merchant_normalized: "cinema",
      merchant_raw: "Cinema",
      description: "Movie",
      amount: 40,
      direction: "outflow",
      transaction_type: "expense",
      category_final: "Entertainment",
      dedupe_fingerprint: "weekday_entertainment_fri"
    },
    {
      id: "txn_health_sat",
      user_id: "user_1",
      transaction_date: "2026-01-10",
      account_id: "acct_checking",
      account_key: "checking",
      merchant_normalized: "pharmacy",
      merchant_raw: "Pharmacy",
      description: "Pharmacy",
      amount: 30,
      direction: "outflow",
      transaction_type: "expense",
      category_final: "Health",
      dedupe_fingerprint: "weekday_health_sat"
    },
    {
      id: "txn_utilities_mon",
      user_id: "user_1",
      transaction_date: "2026-01-05",
      account_id: "acct_checking",
      account_key: "checking",
      merchant_normalized: "utility co",
      merchant_raw: "Utility Co",
      description: "Utilities",
      amount: 20,
      direction: "outflow",
      transaction_type: "expense",
      category_final: "Utilities",
      dedupe_fingerprint: "weekday_utilities_mon"
    },
    {
      id: "txn_misc_tue",
      user_id: "user_1",
      transaction_date: "2026-01-06",
      account_id: "acct_checking",
      account_key: "checking",
      merchant_normalized: "corner shop",
      merchant_raw: "Corner Shop",
      description: "Misc",
      amount: 10,
      direction: "outflow",
      transaction_type: "expense",
      category_final: "Misc",
      dedupe_fingerprint: "weekday_misc_tue"
    },
    {
      id: "txn_income_ignored",
      user_id: "user_1",
      transaction_date: "2026-01-06",
      account_id: "acct_checking",
      account_key: "checking",
      merchant_normalized: "payroll",
      merchant_raw: "Payroll",
      description: "Salary",
      amount: 1000,
      direction: "inflow",
      transaction_type: "income",
      category_final: "Salary",
      dedupe_fingerprint: "weekday_income_ignored"
    }
  ];

  resetStoreForTests(store);

  const analytics = getExplorerAnalytics("user_1", {
    start: "2026-01-01",
    end: "2026-01-31",
    category_view: "granular"
  });

  assert.deepEqual(
    analytics.weekdaySummary.items.map((entry) => entry.weekday),
    [0, 1, 2, 3, 4, 5, 6]
  );
  assert.equal(analytics.weekdaySummary.items[0]?.amount, 80);
  assert.equal(analytics.weekdaySummary.items[1]?.amount, 20);
  assert.equal(analytics.weekdaySummary.items[2]?.amount, 80);
  assert.equal(analytics.weekdaySummary.items[6]?.amount, 30);

  assert.equal(analytics.categoryWeekdayHeatmap.items.length, 7);
  assert.equal(analytics.categoryWeekdayHeatmap.items[0]?.category, "Groceries");
  assert.equal(analytics.categoryWeekdayHeatmap.items[0]?.totalSpend, 80);
  assert.equal(analytics.categoryWeekdayHeatmap.items[0]?.cells.length, 7);
  assert.equal(
    analytics.categoryWeekdayHeatmap.items.some((entry) => entry.category === "Misc"),
    false
  );
});

test("analytics transfer filters honor custom category transfer types", () => {
  const store = structuredClone(baseStore);
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
      transaction_date: "2026-01-09",
      account_id: "acct_checking",
      account_key: "checking",
      merchant_normalized: "brokerage",
      merchant_raw: "Brokerage",
      description: "Sweep to brokerage",
      amount: 250,
      direction: "outflow",
      category_final: "Brokerage Sweep",
      dedupe_fingerprint: "transfer_custom"
    }
  ];

  resetStoreForTests(store);

  const transactions = filterUserTransactions("user_1", {
    start: "2026-01-01",
    end: "2026-01-31",
    transaction_type: "transfer"
  });

  assert.deepEqual(transactions.map((entry) => entry.id), ["txn_transfer_custom"]);
});

test("explorer selector rollups stay populated while category or account is focused", () => {
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
      id: "txn_card_transport",
      user_id: "user_1",
      transaction_date: "2026-01-10",
      account_id: "acct_card",
      account_key: "credit card",
      merchant_normalized: "gas station",
      merchant_raw: "Gas Station",
      description: "Fuel stop",
      amount: 40,
      direction: "outflow",
      transaction_type: "expense",
      category_final: "Transport",
      dedupe_fingerprint: "selector_card_transport"
    },
    {
      id: "txn_checking_groceries",
      user_id: "user_1",
      transaction_date: "2026-01-12",
      account_id: "acct_checking",
      account_key: "checking",
      merchant_normalized: "super market",
      merchant_raw: "Super Market",
      description: "Groceries",
      amount: 60,
      direction: "outflow",
      transaction_type: "expense",
      category_final: "Groceries",
      dedupe_fingerprint: "selector_checking_groceries"
    }
  ];

  resetStoreForTests(store);

  const overviewFocused = getExplorerAnalytics("user_1", {
    start: "2026-01-01",
    end: "2026-01-31",
    category_view: "granular",
    perspective: "overview",
    category: "Groceries"
  });
  assert.deepEqual(
    overviewFocused.categories.items.map((entry) => entry.category),
    ["Groceries"]
  );

  const categoryFocused = getExplorerAnalytics("user_1", {
    start: "2026-01-01",
    end: "2026-01-31",
    category_view: "granular",
    perspective: "category",
    category: "Groceries"
  });
  assert.ok(categoryFocused.categories.items.some((entry) => entry.category === "Transport"));

  const accountFocused = getExplorerAnalytics("user_1", {
    start: "2026-01-01",
    end: "2026-01-31",
    category_view: "granular",
    account: "acct_card"
  });
  assert.ok(accountFocused.accounts.items.some((entry) => entry.accountId === "acct_checking"));
});

test("category weekday matrix honors account and merchant filters", () => {
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
      id: "txn_checking_groceries",
      user_id: "user_1",
      transaction_date: "2026-01-12",
      account_id: "acct_checking",
      account_key: "checking",
      merchant_normalized: "super market",
      merchant_raw: "Super Market",
      description: "Groceries",
      amount: 60,
      direction: "outflow",
      transaction_type: "expense",
      category_final: "Groceries",
      dedupe_fingerprint: "matrix_checking_groceries"
    },
    {
      id: "txn_checking_dining",
      user_id: "user_1",
      transaction_date: "2026-01-13",
      account_id: "acct_checking",
      account_key: "checking",
      merchant_normalized: "coffee",
      merchant_raw: "Coffee",
      description: "Coffee",
      amount: 20,
      direction: "outflow",
      transaction_type: "expense",
      category_final: "Dining",
      dedupe_fingerprint: "matrix_checking_dining"
    },
    {
      id: "txn_card_transport",
      user_id: "user_1",
      transaction_date: "2026-01-14",
      account_id: "acct_card",
      account_key: "credit card",
      merchant_normalized: "gas station",
      merchant_raw: "Gas Station",
      description: "Fuel stop",
      amount: 40,
      direction: "outflow",
      transaction_type: "expense",
      category_final: "Transport",
      dedupe_fingerprint: "matrix_card_transport"
    }
  ];

  resetStoreForTests(store);

  const accountScoped = getExplorerAnalytics("user_1", {
    start: "2026-01-01",
    end: "2026-01-31",
    category_view: "granular",
    account: "acct_checking"
  });
  assert.deepEqual(
    accountScoped.categoryWeekdayHeatmap.items.map((entry) => entry.category),
    ["Groceries", "Dining"]
  );

  const merchantScoped = getExplorerAnalytics("user_1", {
    start: "2026-01-01",
    end: "2026-01-31",
    category_view: "granular",
    merchant: "coffee"
  });
  assert.deepEqual(
    merchantScoped.categoryWeekdayHeatmap.items.map((entry) => entry.category),
    ["Dining"]
  );
});

test("recurringSpend only counts transactions with recurring_rule_id", () => {
  const store = structuredClone(baseStore);
  store.transactions = [
    {
      id: "txn_recurring_1",
      user_id: "user_1",
      transaction_date: "2026-01-05",
      merchant_normalized: "netflix",
      merchant_raw: "Netflix",
      description: "Netflix subscription",
      amount: 15,
      direction: "outflow",
      category_final: "Entertainment",
      recurring_rule_id: "rule_netflix",
      dedupe_fingerprint: "recurring_1"
    },
    {
      id: "txn_recurring_2",
      user_id: "user_1",
      transaction_date: "2026-01-15",
      merchant_normalized: "gym",
      merchant_raw: "Gym",
      description: "Gym membership",
      amount: 50,
      direction: "outflow",
      category_final: "Health",
      recurring_rule_id: "rule_gym",
      dedupe_fingerprint: "recurring_2"
    },
    {
      id: "txn_non_recurring",
      user_id: "user_1",
      transaction_date: "2026-01-20",
      merchant_normalized: "groceries",
      merchant_raw: "Groceries",
      description: "Groceries",
      amount: 100,
      direction: "outflow",
      category_final: "Groceries",
      dedupe_fingerprint: "non_recurring"
    },
    {
      id: "txn_recurring_income",
      user_id: "user_1",
      transaction_date: "2026-01-01",
      merchant_normalized: "salary",
      merchant_raw: "Salary",
      description: "Salary",
      amount: 2000,
      direction: "inflow",
      category_final: "Income",
      recurring_rule_id: "rule_salary",
      dedupe_fingerprint: "recurring_income"
    }
  ];

  resetStoreForTests(store);

  const overview = getOverview("user_1", { start: "2026-01-01", end: "2026-01-31" });

  // Only outflow transactions with recurring_rule_id should be counted (15 + 50 = 65)
  assert.equal(overview.summary.recurringSpend, 65);
  // Total spend should include all outflow (15 + 50 + 100 = 165)
  assert.equal(overview.summary.totalSpend, 165);
});
