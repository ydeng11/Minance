import test from "node:test";
import assert from "node:assert/strict";

import { getExplorerAnalytics, getInsightFacts } from "../src/analytics.ts";
import { resetStoreForTests } from "../src/store.ts";

function makeStore() {
  return {
    users: [{ id: "user_1", email: "user@example.com", createdAt: "2026-01-01", updatedAt: "2026-01-01" }],
    sessions: [],
    accounts: [
      {
        id: "acct_checking",
        userId: "user_1",
        displayName: "Checking",
        normalizedKey: "checking",
        sourceInstitution: "Local Bank",
        accountType: "checking",
        currency: "USD",
        initialBalance: 0,
        version: 1,
        status: "active",
        hidden: false,
        closed: false,
        closedAt: null,
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01"
      }
    ],
    transactions: [],
    categories: [],
    categoryRules: [],
    recurringRules: [],
    recurringSuggestions: [],
    dismissedRecurringSuggestions: [],
    imports: [],
    importRowsRaw: [],
    importRowDiagnostics: [],
    aiProviderCredentials: [],
    aiProviderPreferences: [],
    assistantQueries: [],
    savedViews: [],
    auditEvents: []
  };
}

function transaction(overrides: Record<string, unknown>) {
  const id = String(overrides.id);
  return {
    id,
    user_id: "user_1",
    account_id: "acct_checking",
    account_key: "checking",
    transaction_date: "2026-02-10",
    merchant_normalized: "merchant",
    merchant_raw: "Merchant",
    description: "Transaction",
    amount: 10,
    currency: "USD",
    direction: "outflow",
    transaction_type: "expense",
    category_final: "Dining",
    review_status: "reviewed",
    needs_category_review: false,
    dedupe_fingerprint: id,
    ...overrides
  };
}

test("insight facts exclude transfers and refuse to aggregate currencies", () => {
  const store = makeStore();
  store.transactions.push(
    transaction({ id: "expense_usd", amount: 100 }),
    transaction({ id: "income_usd", amount: 500, direction: "inflow", transaction_type: "income", category_final: "Income" }),
    transaction({ id: "transfer_usd", amount: 250, transaction_type: "transfer", category_final: "Transfer" }),
    transaction({ id: "expense_eur", amount: 80, currency: "EUR" })
  );
  resetStoreForTests(store);

  const gated = getInsightFacts("user_1", {
    start: "2026-02-01",
    end: "2026-02-14"
  });
  assert.equal(gated.scope.currency, null);
  assert.deepEqual(gated.scope.availableCurrencies, ["EUR", "USD"]);
  assert.ok(gated.scope.limitationReasons.includes("multiple_currencies"));
  assert.equal(gated.operatingFlow, null);

  const usd = getInsightFacts("user_1", {
    start: "2026-02-01",
    end: "2026-02-14",
    currency: "USD"
  });
  assert.deepEqual(usd.scope.treatmentSet, ["expense", "income"]);
  assert.deepEqual(usd.operatingFlow?.current, { income: 500, expense: 100, net: 400 });
});

test("explorer operating timeline excludes transfers unless explicitly requested", () => {
  const store = makeStore();
  store.transactions.push(
    transaction({ id: "expense", amount: 100 }),
    transaction({ id: "transfer", amount: 900, transaction_type: "transfer", category_final: "Transfer" })
  );
  resetStoreForTests(store);

  const defaultTimeline = getExplorerAnalytics("user_1", {
    start: "2026-02-01",
    end: "2026-02-14",
    transaction_type: []
  });
  assert.equal(defaultTimeline.trend.items[0].spend, 100);

  const transferTimeline = getExplorerAnalytics("user_1", {
    start: "2026-02-01",
    end: "2026-02-14",
    transaction_type: "transfer"
  });
  assert.equal(transferTimeline.trend.items[0].spend, 900);
});

test("explorer timeline honors an explicit currency scope", () => {
  const store = makeStore();
  store.transactions.push(
    transaction({ id: "expense_usd", amount: 100 }),
    transaction({ id: "expense_eur", amount: 900, currency: "EUR" })
  );
  resetStoreForTests(store);

  const timeline = getExplorerAnalytics("user_1", {
    start: "2026-02-01",
    end: "2026-02-14",
    currency: "USD"
  });
  assert.equal(timeline.trend.items[0].spend, 100);
});

test("insight facts attribute meaningful expense change to deterministic drivers", () => {
  const store = makeStore();
  store.transactions.push(
    transaction({ id: "prev_dining", transaction_date: "2026-01-20", amount: 100, merchant_normalized: "cafe" }),
    transaction({ id: "prev_grocery", transaction_date: "2026-01-22", amount: 100, category_final: "Groceries", merchant_normalized: "market" }),
    transaction({ id: "current_dining", transaction_date: "2026-02-10", amount: 300, merchant_normalized: "cafe" }),
    transaction({ id: "current_grocery", transaction_date: "2026-02-12", amount: 100, category_final: "Groceries", merchant_normalized: "market" })
  );
  resetStoreForTests(store);

  const facts = getInsightFacts("user_1", {
    start: "2026-02-01",
    end: "2026-02-14",
    currency: "USD"
  });

  assert.equal(facts.scope.comparisonEligible, true);
  assert.equal(facts.changeAttribution?.totalExpenseDelta, 200);
  assert.equal(facts.changeAttribution?.meaningful, true);
  assert.deepEqual(
    facts.changeAttribution?.dimensions.category.map((driver) => [driver.key, driver.delta, driver.contributionPercent]),
    [["Dining", 200, 100], ["Groceries", 0, 0]]
  );
  assert.deepEqual(facts.changeAttribution?.dimensions.merchant[0].evidenceTransactionIds, ["current_dining"]);
});

test("insight facts separate active commitments from possible recurring suggestions", () => {
  const store = makeStore();
  store.transactions.push(
    transaction({ id: "prev_income", transaction_date: "2026-01-20", amount: 2000, direction: "inflow", transaction_type: "income", category_final: "Income" }),
    transaction({ id: "current_income", transaction_date: "2026-02-10", amount: 2000, direction: "inflow", transaction_type: "income", category_final: "Income" }),
    transaction({ id: "rent", amount: 1200, category_final: "Housing", merchant_normalized: "landlord", recurring_rule_id: "rule_rent" })
  );
  store.recurringRules.push({
    id: "rule_rent",
    user_id: "user_1",
    name: "Rent",
    cadence: "monthly",
    amount: 1200,
    direction: "outflow",
    category_final: "Housing",
    account_id: "acct_checking",
    merchant_pattern: "landlord",
    status: "active",
    next_run_at: "2026-02-20",
    linked_transaction_ids: ["rent"],
    created_at: "2026-01-01",
    updated_at: "2026-02-01"
  });
  store.recurringSuggestions.push({
    id: "suggestion_streaming",
    user_id: "user_1",
    merchant_pattern: "streaming",
    amount: 15,
    detected_at: "2026-02-10",
    occurrence_count: 3,
    transaction_ids: []
  });
  resetStoreForTests(store);

  const facts = getInsightFacts("user_1", {
    start: "2026-02-01",
    end: "2026-02-14",
    currency: "USD",
    as_of: "2026-02-14"
  });

  assert.equal(facts.recurring?.historicalLinkedSpend, 1200);
  assert.equal(facts.recurring?.activeMonthlyEquivalent, 1200);
  assert.equal(facts.recurring?.incomeBurdenPercent, 27.6);
  assert.equal(facts.recurring?.upcoming30Days[0].name, "Rent");
  assert.equal(facts.recurring?.possibleRecurringCount, 1);
});

test("insight facts flag only review-worthy transactions against established personal baselines", () => {
  const store = makeStore();
  store.transactions.push(
    ...[18, 20, 22, 19].map((amount, index) => transaction({
      id: `prior_cafe_${index}`,
      transaction_date: `2026-01-${String(10 + index).padStart(2, "0")}`,
      amount,
      merchant_normalized: "cafe"
    })),
    transaction({ id: "ordinary_cafe", transaction_date: "2026-02-10", amount: 24, merchant_normalized: "cafe" }),
    transaction({ id: "large_cafe", transaction_date: "2026-02-11", amount: 95, merchant_normalized: "cafe" })
  );
  resetStoreForTests(store);

  const facts = getInsightFacts("user_1", {
    start: "2026-02-01",
    end: "2026-02-14",
    currency: "USD"
  });

  assert.deepEqual(facts.reviewTransactions.map((entry) => entry.transactionId), ["large_cafe"]);
  assert.equal(facts.reviewTransactions[0].reason, "amount_above_merchant_pattern");
});

test("insight facts surface material recurring price drift separately from suggestions", () => {
  const store = makeStore();
  store.transactions.push(
    transaction({
      id: "streaming_recent",
      transaction_date: "2026-02-10",
      amount: 12,
      merchant_normalized: "streaming",
      recurring_rule_id: "rule_streaming"
    })
  );
  store.recurringRules.push({
    id: "rule_streaming",
    user_id: "user_1",
    name: "Streaming",
    cadence: "monthly",
    amount: 10,
    direction: "outflow",
    status: "active",
    next_run_at: "2026-03-10",
    linked_transaction_ids: ["streaming_recent"]
  });
  resetStoreForTests(store);

  const facts = getInsightFacts("user_1", {
    start: "2026-02-01",
    end: "2026-02-14",
    currency: "USD",
    as_of: "2026-02-14"
  });

  assert.deepEqual(facts.recurring?.priceDrift, [{
    ruleId: "rule_streaming",
    name: "Streaming",
    expectedAmount: 10,
    recentAmount: 12,
    percent: 20
  }]);
});
