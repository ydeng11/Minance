// In services/api/test/recurring-scan.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { resetStoreForTests, loadStore } from "../src/store.ts";
import {
  incrementUserScanCounter,
  getUserScanState,
  updateUserScanState,
  getAdaptiveThreshold,
  daysBetween,
  subMonths,
  getUsersWithPendingScans,
  getMerchantsWithNewTransactions,
  getMerchantTransactions,
  existingRuleMatches
} from "../src/recurring-scan.ts";
import { DISMISSAL_REASON } from "../src/recurring-suggestions.ts";
import { normalizeText } from "../src/utils.ts";

const USER_ID = "user_scan_1";
const ACCOUNT_ID = "acct_scan_1";

test("incrementUserScanCounter creates state if not exists", () => {
  resetStoreForTests({});
  incrementUserScanCounter(USER_ID);

  const store = loadStore();
  const state = store.userRecurringScanState.find(s => s.user_id === USER_ID);
  assert.ok(state, "State should be created");
  assert.equal(state.transactions_since_scan, 1);
});

test("incrementUserScanCounter increments existing state", () => {
  resetStoreForTests({});
  incrementUserScanCounter(USER_ID);
  incrementUserScanCounter(USER_ID);
  incrementUserScanCounter(USER_ID);

  const state = getUserScanState(USER_ID);
  assert.equal(state.transactions_since_scan, 3);
});

test("getAdaptiveThreshold returns correct values", () => {
  assert.equal(getAdaptiveThreshold(0), 5);
  assert.equal(getAdaptiveThreshold(5), 5);
  assert.equal(getAdaptiveThreshold(7), 3);
  assert.equal(getAdaptiveThreshold(15), 3);
  assert.equal(getAdaptiveThreshold(30), 1);
  assert.equal(getAdaptiveThreshold(100), 1);
});

test("daysBetween returns correct days", () => {
  assert.equal(daysBetween("2026-01-01T00:00:00Z", "2026-01-08T00:00:00Z"), 7);
  assert.equal(daysBetween("2026-01-01T00:00:00Z", "2026-02-01T00:00:00Z"), 31);
});

test("daysBetween returns Infinity for null", () => {
  assert.equal(daysBetween(null, "2026-01-01T00:00:00Z"), Infinity);
});

test("subMonths returns correct date", () => {
  assert.equal(subMonths("2026-03-19", 6), "2025-09-19");
  assert.equal(subMonths("2026-01-15", 1), "2025-12-15");
});

test("getUserScanState creates default state for new user", () => {
  resetStoreForTests({});

  const state = getUserScanState(USER_ID);

  assert.ok(state, "State should be created");
  assert.equal(state.user_id, USER_ID);
  assert.equal(state.last_recurring_scan_at, null);
  assert.equal(state.transactions_since_scan, 0);
});

test("updateUserScanState creates state if not exists", () => {
  resetStoreForTests({});

  updateUserScanState(USER_ID, { transactions_since_scan: 5 });

  const state = getUserScanState(USER_ID);
  assert.equal(state.transactions_since_scan, 5);
});

test("updateUserScanState updates existing state", () => {
  resetStoreForTests({});
  incrementUserScanCounter(USER_ID); // Create initial state

  updateUserScanState(USER_ID, {
    last_recurring_scan_at: "2026-03-19T00:00:00Z",
    transactions_since_scan: 0
  });

  const state = getUserScanState(USER_ID);
  assert.equal(state.last_recurring_scan_at, "2026-03-19T00:00:00Z");
  assert.equal(state.transactions_since_scan, 0);
});

test("getUsersWithPendingScans returns only users with pending scans", () => {
  resetStoreForTests({
    users: [{ id: USER_ID, email: "test@example.com", passwordHash: "h", salt: "s", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }],
    accounts: [{ id: ACCOUNT_ID, userId: USER_ID, normalizedKey: "checking", displayName: "Checking", accountType: "checking", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }],
    transactions: [
      { id: "t1", user_id: USER_ID, account_id: ACCOUNT_ID, transaction_date: "2026-03-15", merchant_normalized: "netflix", amount: -15.99, created_at: "2026-03-15T00:00:00Z" }
    ]
  });

  // Increment scan counter for this user
  incrementUserScanCounter(USER_ID);

  const pending = getUsersWithPendingScans();
  assert.equal(pending.length, 1);
  assert.equal(pending[0].user_id, USER_ID);
});

test("getMerchantsWithNewTransactions returns merchants since last scan", () => {
  const since = "2026-03-01T00:00:00Z";
  resetStoreForTests({
    users: [{ id: USER_ID, email: "test@example.com", passwordHash: "h", salt: "s", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }],
    accounts: [{ id: ACCOUNT_ID, userId: USER_ID, normalizedKey: "checking", displayName: "Checking", accountType: "checking", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }],
    transactions: [
      { id: "t1", user_id: USER_ID, account_id: ACCOUNT_ID, transaction_date: "2026-02-15", merchant_normalized: "oldmerchant", amount: -10, created_at: "2026-02-15T00:00:00Z" },
      { id: "t2", user_id: USER_ID, account_id: ACCOUNT_ID, transaction_date: "2026-03-15", merchant_normalized: "netflix", amount: -15.99, created_at: "2026-03-15T00:00:00Z" },
      { id: "t3", user_id: USER_ID, account_id: ACCOUNT_ID, transaction_date: "2026-03-16", merchant_normalized: "spotify", amount: -9.99, created_at: "2026-03-16T00:00:00Z" }
    ],
    userRecurringScanState: [{ user_id: USER_ID, last_recurring_scan_at: since, transactions_since_scan: 2, updated_at: since }]
  });

  const merchants = getMerchantsWithNewTransactions(USER_ID);
  assert.deepEqual(merchants.sort(), ["netflix", "spotify"]);
});

test("getMerchantTransactions returns transactions within window", () => {
  resetStoreForTests({
    users: [{ id: USER_ID, email: "test@example.com", passwordHash: "h", salt: "s", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }],
    accounts: [{ id: ACCOUNT_ID, userId: USER_ID, normalizedKey: "checking", displayName: "Checking", accountType: "checking", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }],
    transactions: [
      { id: "t1", user_id: USER_ID, account_id: ACCOUNT_ID, transaction_date: "2025-09-01", merchant_normalized: "netflix", amount: -15.99, created_at: "2025-09-01T00:00:00Z" }, // Too old
      { id: "t2", user_id: USER_ID, account_id: ACCOUNT_ID, transaction_date: "2026-01-01", merchant_normalized: "netflix", amount: -15.99, created_at: "2026-01-01T00:00:00Z" }, // Within 6 months
      { id: "t3", user_id: USER_ID, account_id: ACCOUNT_ID, transaction_date: "2026-03-15", merchant_normalized: "netflix", amount: -15.99, created_at: "2026-03-15T00:00:00Z" }
    ]
  });

  const txns = getMerchantTransactions(USER_ID, "netflix", { months: 6 });
  assert.equal(txns.length, 2);
});

test("existingRuleMatches returns true for existing rule", () => {
  resetStoreForTests({
    users: [{ id: USER_ID, email: "test@example.com", passwordHash: "h", salt: "s", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }],
    recurringRules: [{ id: "rr1", user_id: USER_ID, name: "Netflix", cadence: "monthly", amount: 15.99, merchant_pattern: "netflix", status: "active" }]
  });

  assert.ok(existingRuleMatches(USER_ID, "netflix", 16));
  assert.ok(!existingRuleMatches(USER_ID, "spotify", 9.99));
});

test("existingRuleMatches returns true for USER_DISMISSED", () => {
  resetStoreForTests({
    users: [{ id: USER_ID, email: "test@example.com", passwordHash: "h", salt: "s", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }],
    dismissedRecurringSuggestions: [{
      id: "d1",
      user_id: USER_ID,
      merchant_pattern: "netflix",
      amount: 15.99,
      dismissed_at: new Date().toISOString(),
      dismissed_reason: DISMISSAL_REASON.USER_DISMISSED
    }]
  });

  assert.ok(existingRuleMatches(USER_ID, "netflix", 16));
});

test("existingRuleMatches returns true for RULE_DELETED within cooldown", () => {
  const yesterday = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();

  resetStoreForTests({
    users: [{ id: USER_ID, email: "test@example.com", passwordHash: "h", salt: "s", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }],
    dismissedRecurringSuggestions: [{
      id: "d1",
      user_id: USER_ID,
      merchant_pattern: "netflix",
      amount: 15.99,
      dismissed_at: yesterday,
      dismissed_reason: DISMISSAL_REASON.RULE_DELETED
    }]
  });

  assert.ok(existingRuleMatches(USER_ID, "netflix", 16));
});

test("existingRuleMatches returns false for RULE_DELETED after cooldown", () => {
  const oldDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();

  resetStoreForTests({
    users: [{ id: USER_ID, email: "test@example.com", passwordHash: "h", salt: "s", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }],
    dismissedRecurringSuggestions: [{
      id: "d1",
      user_id: USER_ID,
      merchant_pattern: "netflix",
      amount: 15.99,
      dismissed_at: oldDate,
      dismissed_reason: DISMISSAL_REASON.RULE_DELETED
    }]
  });

  assert.ok(!existingRuleMatches(USER_ID, "netflix", 16));
});

test("runRecurringDetectionTask skips user without AI setup", async () => {
  resetStoreForTests({
    users: [{ id: USER_ID, email: "test@example.com", passwordHash: "h", salt: "s", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }],
    accounts: [{ id: ACCOUNT_ID, userId: USER_ID, normalizedKey: "checking", displayName: "Checking", accountType: "checking", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }],
    transactions: [
      { id: "t1", user_id: USER_ID, account_id: ACCOUNT_ID, transaction_date: "2026-03-15", merchant_normalized: "netflix", amount: -15.99, created_at: "2026-03-15T00:00:00Z" }
    ],
    userRecurringScanState: [{ user_id: USER_ID, last_recurring_scan_at: null, transactions_since_scan: 10, updated_at: "2026-01-01T00:00:00Z" }]
  });

  const { runRecurringDetectionTask } = await import("../src/recurring-scan.ts");
  const result = await runRecurringDetectionTask();

  assert.equal(result.users_scanned, 0);
  assert.equal(result.suggestions_created, 0);
});

test("runRecurringDetectionTask skips merchant with < 2 transactions", async () => {
  resetStoreForTests({
    users: [{ id: USER_ID, email: "test@example.com", passwordHash: "h", salt: "s", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }],
    accounts: [{ id: ACCOUNT_ID, userId: USER_ID, normalizedKey: "checking", displayName: "Checking", accountType: "checking", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }],
    transactions: [
      { id: "t1", user_id: USER_ID, account_id: ACCOUNT_ID, transaction_date: "2026-03-15", merchant_normalized: "netflix", amount: -15.99, created_at: "2026-03-15T00:00:00Z" }
    ],
    userRecurringScanState: [{ user_id: USER_ID, last_recurring_scan_at: null, transactions_since_scan: 10, updated_at: "2026-01-01T00:00:00Z" }],
    aiProviderCredentials: [{ id: "c1", userId: USER_ID, provider: "openrouter", status: "active", apiKeyEncrypted: "test" }]
  });

  const { runRecurringDetectionTask } = await import("../src/recurring-scan.ts");
  const result = await runRecurringDetectionTask();

  assert.equal(result.merchants_analyzed, 0);
  assert.equal(result.suggestions_created, 0);
});

test("runRecurringDetectionTask skips merchant with all transactions in same month", async () => {
  resetStoreForTests({
    users: [{ id: USER_ID, email: "test@example.com", passwordHash: "h", salt: "s", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }],
    accounts: [{ id: ACCOUNT_ID, userId: USER_ID, normalizedKey: "checking", displayName: "Checking", accountType: "checking", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }],
    transactions: [
      { id: "t1", user_id: USER_ID, account_id: ACCOUNT_ID, transaction_date: "2026-03-10", merchant_normalized: "netflix", amount: -15.99, created_at: "2026-03-10T00:00:00Z" },
      { id: "t2", user_id: USER_ID, account_id: ACCOUNT_ID, transaction_date: "2026-03-20", merchant_normalized: "netflix", amount: -15.99, created_at: "2026-03-20T00:00:00Z" }
    ],
    userRecurringScanState: [{ user_id: USER_ID, last_recurring_scan_at: null, transactions_since_scan: 10, updated_at: "2026-01-01T00:00:00Z" }],
    aiProviderCredentials: [{ id: "c1", userId: USER_ID, provider: "openrouter", status: "active", apiKeyEncrypted: "test" }]
  });

  const { runRecurringDetectionTask } = await import("../src/recurring-scan.ts");
  const result = await runRecurringDetectionTask();

  assert.equal(result.merchants_analyzed, 0);
});

test("runRecurringDetectionTask respects is_running overlap protection", async () => {
  resetStoreForTests({
    users: [{ id: USER_ID, email: "test@example.com", passwordHash: "h", salt: "s", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }],
    scanRunState: { is_running: true, last_run_at: null, last_run_status: null, last_run_duration_ms: null }
  });

  const { runRecurringDetectionTask } = await import("../src/recurring-scan.ts");
  const result = await runRecurringDetectionTask();

  assert.equal(result.users_scanned, 0);
  assert.equal(result.merchants_analyzed, 0);
});