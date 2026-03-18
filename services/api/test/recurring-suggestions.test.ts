import test from "node:test";
import assert from "node:assert/strict";
import { loadStore, resetStoreForTests, saveStore } from "../src/store.ts";
import { detectRecurringSuggestions, listRecurringSuggestions, dismissRecurringSuggestion, DISMISSAL_REASON, createRuleFromSuggestion } from "../src/recurring-suggestions.ts";
import { getRecurringRule, createRecurringRule, deleteRecurringRule } from "../src/recurrings.ts";

const USER_ID = "user_suggestions_1";
const ACCOUNT_ID = "acct_suggestions_1";

function resetForSuggestions(transactions = []) {
  resetStoreForTests({
    users: [{ id: USER_ID, email: "suggestions@example.com", passwordHash: "h", salt: "s", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }],
    accounts: [{ id: ACCOUNT_ID, userId: USER_ID, normalizedKey: "checking", displayName: "Checking", accountType: "checking", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }],
    transactions
  });
}

test("store includes recurringSuggestions and dismissedRecurringSuggestions collections", () => {
  resetStoreForTests({});
  const store = loadStore();

  assert.ok(Array.isArray(store.recurringSuggestions), "recurringSuggestions should be an array");
  assert.ok(Array.isArray(store.dismissedRecurringSuggestions), "dismissedRecurringSuggestions should be an array");
});

test("detectRecurringSuggestions finds merchants appearing in 2+ months", () => {
  resetForSuggestions([
    { id: "t1", user_id: USER_ID, account_id: ACCOUNT_ID, transaction_date: "2026-01-15", merchant_raw: "Netflix", merchant_normalized: "netflix", description: "", amount: -15.99, direction: "outflow", category_final: "Entertainment", created_at: "2026-01-15T00:00:00Z", updated_at: "2026-01-15T00:00:00Z" },
    { id: "t2", user_id: USER_ID, account_id: ACCOUNT_ID, transaction_date: "2026-02-15", merchant_raw: "Netflix", merchant_normalized: "netflix", description: "", amount: -15.99, direction: "outflow", category_final: "Entertainment", created_at: "2026-02-15T00:00:00Z", updated_at: "2026-02-15T00:00:00Z" },
    { id: "t3", user_id: USER_ID, account_id: ACCOUNT_ID, transaction_date: "2026-01-10", merchant_raw: "Coffee Shop", merchant_normalized: "coffee shop", description: "", amount: -5.00, direction: "outflow", category_final: "Dining", created_at: "2026-01-10T00:00:00Z", updated_at: "2026-01-10T00:00:00Z" }
  ]);

  const result = detectRecurringSuggestions(USER_ID);

  assert.equal(result.length, 1);
  assert.equal(result[0].merchant_pattern, "netflix");
  assert.equal(result[0].amount, 15.99);
  assert.equal(result[0].occurrence_count, 2);
});

test("detectRecurringSuggestions excludes patterns with existing rules", () => {
  resetForSuggestions([
    { id: "t1", user_id: USER_ID, account_id: ACCOUNT_ID, transaction_date: "2026-01-15", merchant_raw: "Spotify", merchant_normalized: "spotify", description: "", amount: -9.99, direction: "outflow", category_final: "Entertainment", created_at: "2026-01-15T00:00:00Z", updated_at: "2026-01-15T00:00:00Z" },
    { id: "t2", user_id: USER_ID, account_id: ACCOUNT_ID, transaction_date: "2026-02-15", merchant_raw: "Spotify", merchant_normalized: "spotify", description: "", amount: -9.99, direction: "outflow", category_final: "Entertainment", created_at: "2026-02-15T00:00:00Z", updated_at: "2026-02-15T00:00:00Z" }
  ]);

  const store = loadStore();
  store.recurringRules = [{ id: "rr1", user_id: USER_ID, name: "Spotify", cadence: "monthly", amount: 9.99, merchant_pattern: "spotify", status: "active" }];
  saveStore(store);

  const result = detectRecurringSuggestions(USER_ID);
  assert.equal(result.length, 0);
});

test("detectRecurringSuggestions excludes dismissed suggestions", () => {
  resetForSuggestions([
    { id: "t1", user_id: USER_ID, account_id: ACCOUNT_ID, transaction_date: "2026-01-15", merchant_raw: "Hulu", merchant_normalized: "hulu", description: "", amount: -12.99, direction: "outflow", category_final: "Entertainment", created_at: "2026-01-15T00:00:00Z", updated_at: "2026-01-15T00:00:00Z" },
    { id: "t2", user_id: USER_ID, account_id: ACCOUNT_ID, transaction_date: "2026-02-15", merchant_raw: "Hulu", merchant_normalized: "hulu", description: "", amount: -12.99, direction: "outflow", category_final: "Entertainment", created_at: "2026-02-15T00:00:00Z", updated_at: "2026-02-15T00:00:00Z" }
  ]);

  const store = loadStore();
  store.dismissedRecurringSuggestions = [{ id: "d1", user_id: USER_ID, merchant_pattern: "hulu", amount: 12.99, dismissed_at: new Date().toISOString(), dismissed_reason: DISMISSAL_REASON.USER_DISMISSED }];
  saveStore(store);

  const result = detectRecurringSuggestions(USER_ID);
  assert.equal(result.length, 0);
});

test("listRecurringSuggestions returns suggestions sorted by occurrence count", () => {
  resetForSuggestions([
    { id: "t1", user_id: USER_ID, account_id: ACCOUNT_ID, transaction_date: "2026-01-15", merchant_raw: "Netflix", merchant_normalized: "netflix", description: "", amount: -15.99, direction: "outflow", category_final: "Entertainment", created_at: "2026-01-15T00:00:00Z", updated_at: "2026-01-15T00:00:00Z" },
    { id: "t2", user_id: USER_ID, account_id: ACCOUNT_ID, transaction_date: "2026-02-15", merchant_raw: "Netflix", merchant_normalized: "netflix", description: "", amount: -15.99, direction: "outflow", category_final: "Entertainment", created_at: "2026-02-15T00:00:00Z", updated_at: "2026-02-15T00:00:00Z" },
    { id: "t3", user_id: USER_ID, account_id: ACCOUNT_ID, transaction_date: "2026-03-15", merchant_raw: "Netflix", merchant_normalized: "netflix", description: "", amount: -15.99, direction: "outflow", category_final: "Entertainment", created_at: "2026-03-15T00:00:00Z", updated_at: "2026-03-15T00:00:00Z" },
    { id: "t4", user_id: USER_ID, account_id: ACCOUNT_ID, transaction_date: "2026-01-10", merchant_raw: "Gym", merchant_normalized: "gym", description: "", amount: -50.00, direction: "outflow", category_final: "Health", created_at: "2026-01-10T00:00:00Z", updated_at: "2026-01-10T00:00:00Z" },
    { id: "t5", user_id: USER_ID, account_id: ACCOUNT_ID, transaction_date: "2026-02-10", merchant_raw: "Gym", merchant_normalized: "gym", description: "", amount: -50.00, direction: "outflow", category_final: "Health", created_at: "2026-02-10T00:00:00Z", updated_at: "2026-02-10T00:00:00Z" }
  ]);

  detectRecurringSuggestions(USER_ID);
  const result = listRecurringSuggestions(USER_ID);

  assert.equal(result.items.length, 2);
  assert.equal(result.items[0].occurrence_count, 3);
  assert.equal(result.items[1].occurrence_count, 2);
});

test("dismissRecurringSuggestion removes suggestion and adds to dismissed list", () => {
  resetForSuggestions([
    { id: "t1", user_id: USER_ID, account_id: ACCOUNT_ID, transaction_date: "2026-01-15", merchant_raw: "Netflix", merchant_normalized: "netflix", description: "", amount: -15.99, direction: "outflow", category_final: "Entertainment", created_at: "2026-01-15T00:00:00Z", updated_at: "2026-01-15T00:00:00Z" },
    { id: "t2", user_id: USER_ID, account_id: ACCOUNT_ID, transaction_date: "2026-02-15", merchant_raw: "Netflix", merchant_normalized: "netflix", description: "", amount: -15.99, direction: "outflow", category_final: "Entertainment", created_at: "2026-02-15T00:00:00Z", updated_at: "2026-02-15T00:00:00Z" }
  ]);

  const suggestions = detectRecurringSuggestions(USER_ID);
  assert.equal(suggestions.length, 1);

  const result = dismissRecurringSuggestion(USER_ID, suggestions[0].id);
  assert.equal(result.dismissed, true);

  const afterDismiss = listRecurringSuggestions(USER_ID);
  assert.equal(afterDismiss.items.length, 0);

  const store = loadStore();
  assert.equal(store.dismissedRecurringSuggestions.length, 1);
  assert.equal(store.dismissedRecurringSuggestions[0].merchant_pattern, "netflix");
});

// Test 1: $0.01 amount tolerance - transactions with amounts within $0.01 should be grouped together
test("detectRecurringSuggestions groups transactions with amounts within $0.01 tolerance", () => {
  resetForSuggestions([
    { id: "t1", user_id: USER_ID, account_id: ACCOUNT_ID, transaction_date: "2026-01-15", merchant_raw: "Netflix", merchant_normalized: "netflix", description: "", amount: -15.99, direction: "outflow", category_final: "Entertainment", created_at: "2026-01-15T00:00:00Z", updated_at: "2026-01-15T00:00:00Z" },
    { id: "t2", user_id: USER_ID, account_id: ACCOUNT_ID, transaction_date: "2026-02-15", merchant_raw: "Netflix", merchant_normalized: "netflix", description: "", amount: -15.98, direction: "outflow", category_final: "Entertainment", created_at: "2026-02-15T00:00:00Z", updated_at: "2026-02-15T00:00:00Z" }
  ]);

  const result = detectRecurringSuggestions(USER_ID);

  // Both transactions should be grouped as one suggestion since amounts differ by only $0.01
  assert.equal(result.length, 1, "Should group transactions with amounts within $0.01 tolerance");
  assert.equal(result[0].merchant_pattern, "netflix");
  assert.equal(result[0].occurrence_count, 2);
});

// Test 2: MAX_TRANSACTION_IDS = 10 - transaction_ids list should be capped at 10
test("detectRecurringSuggestions caps transaction_ids at 10", () => {
  const transactions = [];
  for (let i = 0; i < 15; i++) {
    const month = String(i < 5 ? 1 : (i < 10 ? 2 : 3)).padStart(2, "0");
    transactions.push({
      id: `t${i}`,
      user_id: USER_ID,
      account_id: ACCOUNT_ID,
      transaction_date: `2026-${month}-${String(i % 28 + 1).padStart(2, "0")}`,
      merchant_raw: "Gym Membership",
      merchant_normalized: "gym membership",
      description: "",
      amount: -49.99,
      direction: "outflow",
      category_final: "Health",
      created_at: `2026-${month}-${String(i % 28 + 1).padStart(2, "0")}T00:00:00Z`,
      updated_at: `2026-${month}-${String(i % 28 + 1).padStart(2, "0")}T00:00:00Z`
    });
  }
  resetForSuggestions(transactions);

  const result = detectRecurringSuggestions(USER_ID);

  assert.equal(result.length, 1, "Should detect one recurring pattern");
  assert.equal(result[0].transaction_ids.length, 10, "transaction_ids should be capped at 10");
  assert.ok(result[0].occurrence_count >= 2, "Should have occurrences in multiple months");
});

// Test 3: 30-day cooldown expiration - rule_deleted dismissal allows re-detection after cooldown
test("detectRecurringSuggestions allows re-detection after cooldown expires for rule_deleted", () => {
  resetForSuggestions([
    { id: "t1", user_id: USER_ID, account_id: ACCOUNT_ID, transaction_date: "2026-01-15", merchant_raw: "Spotify", merchant_normalized: "spotify", description: "", amount: -9.99, direction: "outflow", category_final: "Entertainment", created_at: "2026-01-15T00:00:00Z", updated_at: "2026-01-15T00:00:00Z" },
    { id: "t2", user_id: USER_ID, account_id: ACCOUNT_ID, transaction_date: "2026-02-15", merchant_raw: "Spotify", merchant_normalized: "spotify", description: "", amount: -9.99, direction: "outflow", category_final: "Entertainment", created_at: "2026-02-15T00:00:00Z", updated_at: "2026-02-15T00:00:00Z" }
  ]);

  // Set up a rule_deleted dismissal that was dismissed more than 30 days ago
  const store = loadStore();
  const oldDate = new Date();
  oldDate.setDate(oldDate.getDate() - 31); // 31 days ago
  store.dismissedRecurringSuggestions = [{
    id: "d1",
    user_id: USER_ID,
    merchant_pattern: "spotify",
    amount: 9.99,
    dismissed_at: oldDate.toISOString(),
    dismissed_reason: DISMISSAL_REASON.RULE_DELETED
  }];
  saveStore(store);

  const result = detectRecurringSuggestions(USER_ID);
  assert.equal(result.length, 1, "Should re-detect suggestion after cooldown expires for rule_deleted");
  assert.equal(result[0].merchant_pattern, "spotify");
});

// Test 4: Permanent dismissal for user_dismissed - should not reappear on re-detection
test("detectRecurringSuggestions permanently excludes user_dismissed suggestions", () => {
  resetForSuggestions([
    { id: "t1", user_id: USER_ID, account_id: ACCOUNT_ID, transaction_date: "2026-01-15", merchant_raw: "Disney+", merchant_normalized: "disney+", description: "", amount: -13.99, direction: "outflow", category_final: "Entertainment", created_at: "2026-01-15T00:00:00Z", updated_at: "2026-01-15T00:00:00Z" },
    { id: "t2", user_id: USER_ID, account_id: ACCOUNT_ID, transaction_date: "2026-02-15", merchant_raw: "Disney+", merchant_normalized: "disney+", description: "", amount: -13.99, direction: "outflow", category_final: "Entertainment", created_at: "2026-02-15T00:00:00Z", updated_at: "2026-02-15T00:00:00Z" }
  ]);

  // First, detect and get the suggestion
  let result = detectRecurringSuggestions(USER_ID);
  assert.equal(result.length, 1, "Should detect suggestion initially");

  const suggestionId = result[0].id;

  // Dismiss with user_dismissed reason
  dismissRecurringSuggestion(USER_ID, suggestionId, DISMISSAL_REASON.USER_DISMISSED);

  // Verify it's gone
  let listResult = listRecurringSuggestions(USER_ID);
  assert.equal(listResult.items.length, 0, "Suggestion should be removed after dismissal");

  // Run detection again - it should NOT reappear (permanent dismissal)
  result = detectRecurringSuggestions(USER_ID);
  assert.equal(result.length, 0, "user_dismissed suggestion should not be re-detected");

  listResult = listRecurringSuggestions(USER_ID);
  assert.equal(listResult.items.length, 0, "user_dismissed suggestion should remain dismissed permanently");
});

// Test 5: count_only option returns only count
test("listRecurringSuggestions with count_only returns count only", () => {
  resetForSuggestions([
    { id: "t1", user_id: USER_ID, account_id: ACCOUNT_ID, transaction_date: "2026-01-15", merchant_raw: "Netflix", merchant_normalized: "netflix", description: "", amount: -15.99, direction: "outflow", category_final: "Entertainment", created_at: "2026-01-15T00:00:00Z", updated_at: "2026-01-15T00:00:00Z" },
    { id: "t2", user_id: USER_ID, account_id: ACCOUNT_ID, transaction_date: "2026-02-15", merchant_raw: "Netflix", merchant_normalized: "netflix", description: "", amount: -15.99, direction: "outflow", category_final: "Entertainment", created_at: "2026-02-15T00:00:00Z", updated_at: "2026-02-15T00:00:00Z" },
    { id: "t3", user_id: USER_ID, account_id: ACCOUNT_ID, transaction_date: "2026-01-10", merchant_raw: "Gym", merchant_normalized: "gym", description: "", amount: -50.00, direction: "outflow", category_final: "Health", created_at: "2026-01-10T00:00:00Z", updated_at: "2026-01-10T00:00:00Z" },
    { id: "t4", user_id: USER_ID, account_id: ACCOUNT_ID, transaction_date: "2026-02-10", merchant_raw: "Gym", merchant_normalized: "gym", description: "", amount: -50.00, direction: "outflow", category_final: "Health", created_at: "2026-02-10T00:00:00Z", updated_at: "2026-02-10T00:00:00Z" }
  ]);

  detectRecurringSuggestions(USER_ID);

  // Test with count_only: true
  const countResult = listRecurringSuggestions(USER_ID, { count_only: true });
  assert.ok(countResult.count !== undefined, "Result should have count property");
  assert.equal(typeof countResult.count, "number", "count should be a number");
  assert.equal(countResult.count, 2, "Should count 2 suggestions");

  // Verify that items is not returned
  assert.equal((countResult as any).items, undefined, "items should not be returned with count_only");

  // Verify normal call still returns items
  const normalResult = listRecurringSuggestions(USER_ID);
  assert.ok(Array.isArray(normalResult.items), "Normal call should return items array");
  assert.equal(normalResult.items.length, 2, "Normal call should return 2 items");
});

test("createRuleFromSuggestion creates rule and removes suggestion", () => {
  resetForSuggestions([
    { id: "t1", user_id: USER_ID, account_id: ACCOUNT_ID, transaction_date: "2026-01-15", merchant_raw: "Spotify", merchant_normalized: "spotify", description: "", amount: -9.99, direction: "outflow", category_final: "Entertainment", created_at: "2026-01-15T00:00:00Z", updated_at: "2026-01-15T00:00:00Z" },
    { id: "t2", user_id: USER_ID, account_id: ACCOUNT_ID, transaction_date: "2026-02-15", merchant_raw: "Spotify", merchant_normalized: "spotify", description: "", amount: -9.99, direction: "outflow", category_final: "Entertainment", created_at: "2026-02-15T00:00:00Z", updated_at: "2026-02-15T00:00:00Z" }
  ]);

  detectRecurringSuggestions(USER_ID);
  const suggestions = listRecurringSuggestions(USER_ID);
  assert.equal(suggestions.items.length, 1);

  const rule = createRuleFromSuggestion(USER_ID, suggestions.items[0].id, {
    name: "Spotify Premium",
    cadence: "monthly"
  });

  assert.equal(rule.name, "Spotify Premium");
  assert.equal(rule.merchant_pattern, "spotify");
  assert.equal(rule.amount, 9.99);

  // Suggestion should be removed
  const afterCreate = listRecurringSuggestions(USER_ID);
  assert.equal(afterCreate.items.length, 0);

  // Transactions should be linked
  const store = loadStore();
  const linkedTxns = store.transactions.filter((t) => t.recurring_rule_id === rule.id);
  assert.equal(linkedTxns.length, 2);
});

test("createRuleFromSuggestion throws error for non-existent suggestion", () => {
  resetForSuggestions([]);
  assert.throws(
    () => createRuleFromSuggestion(USER_ID, "nonexistent-id"),
    /Suggestion not found/
  );
});

test("deleting a rule adds entry to dismissed registry with 30-day cooldown", () => {
  resetForSuggestions([
    { id: "t1", user_id: USER_ID, account_id: ACCOUNT_ID, transaction_date: "2026-01-15", merchant_raw: "Netflix", merchant_normalized: "netflix", description: "", amount: -15.99, direction: "outflow", category_final: "Entertainment", created_at: "2026-01-15T00:00:00Z", updated_at: "2026-01-15T00:00:00Z" }
  ]);

  const rule = createRecurringRule(USER_ID, { name: "Netflix", cadence: "monthly", amount: 15.99, merchant_pattern: "netflix" });
  deleteRecurringRule(USER_ID, rule.id);

  const store = loadStore();
  const dismissed = store.dismissedRecurringSuggestions.find((d) => d.merchant_pattern === "netflix");
  assert.ok(dismissed, "Should have dismissed entry");
  assert.equal(dismissed.dismissed_reason, DISMISSAL_REASON.RULE_DELETED);
  assert.ok(dismissed.cooldown_until, "Should have cooldown date");
});

// Integration test: verify detection runs after import commit
test("commitImport triggers recurring detection for imported transactions", async () => {
  // Import the commitImport function
  const { createImportJob, commitImport } = await import("../src/imports.ts");

  resetStoreForTests({
    users: [{ id: USER_ID, email: "import-suggestions@example.com", passwordHash: "h", salt: "s", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }],
    accounts: [{ id: ACCOUNT_ID, userId: USER_ID, normalizedKey: "checking", displayName: "Checking", accountType: "checking", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }],
    transactions: []
  });

  // Create CSV with recurring transactions in 2 months
  const csvText = [
    "date,merchant,description,amount,account",
    "2026-01-15,Netflix,Netflix Subscription,-15.99,Checking",
    "2026-02-15,Netflix,Netflix Subscription,-15.99,Checking",
    "2026-03-15,Netflix,Netflix Subscription,-15.99,Checking",
    "2026-01-10,Coffee Shop,One-time coffee,-5.00,Checking"
  ].join("\n");

  const created = await createImportJob({
    userId: USER_ID,
    fileName: "recurring.csv",
    csvText
  });

  await commitImport(USER_ID, created.importJob.id);

  // Verify recurring suggestions were detected
  const suggestions = listRecurringSuggestions(USER_ID);

  // Should have Netflix as a recurring suggestion (appears in 3 months)
  assert.equal(suggestions.items.length >= 1, true, "Should detect at least one recurring suggestion");
  const netflixSuggestion = suggestions.items.find((s) => s.merchant_pattern === "netflix");
  assert.ok(netflixSuggestion, "Should detect Netflix as recurring");
  assert.equal(netflixSuggestion.occurrence_count, 3, "Netflix should have 3 occurrences");
});