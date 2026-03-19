import test from "node:test";
import assert from "node:assert/strict";
import { resetStoreForTests, loadStore } from "../../src/store.ts";
import { migrateRecurringScanState } from "../../src/migrations/recurring-scan-init.ts";

test("migration initializes scan state for existing users", () => {
  resetStoreForTests({
    users: [
      { id: "user1", email: "a@example.com", passwordHash: "h", salt: "s", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
      { id: "user2", email: "b@example.com", passwordHash: "h", salt: "s", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }
    ],
    transactions: [
      { id: "t1", user_id: "user1", account_id: "a1", transaction_date: "2026-01-15", amount: -10, created_at: "2026-01-15T00:00:00Z" },
      { id: "t2", user_id: "user1", account_id: "a1", transaction_date: "2026-02-15", amount: -20, created_at: "2026-02-15T00:00:00Z" },
      { id: "t3", user_id: "user2", account_id: "a1", transaction_date: "2026-01-15", amount: -30, deleted_at: "2026-02-01T00:00:00Z" } // Deleted, should not count
    ],
    userRecurringScanState: []
  });

  migrateRecurringScanState();

  const store = loadStore();
  const user1State = store.userRecurringScanState.find(s => s.user_id === "user1");
  const user2State = store.userRecurringScanState.find(s => s.user_id === "user2");

  assert.equal(user1State?.transactions_since_scan, 2, "User1 should have 2 transactions");
  assert.equal(user2State?.transactions_since_scan, 0, "User2 should have 0 (deleted transaction excluded)");
});

test("migration skips if userRecurringScanState already has entries", () => {
  const existingState = {
    user_id: "existing_user",
    last_recurring_scan_at: "2026-01-01T00:00:00Z",
    transactions_since_scan: 5,
    updated_at: "2026-01-01T00:00:00Z"
  };

  resetStoreForTests({
    users: [
      { id: "user1", email: "a@example.com", passwordHash: "h", salt: "s", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }
    ],
    transactions: [
      { id: "t1", user_id: "user1", account_id: "a1", transaction_date: "2026-01-15", amount: -10, created_at: "2026-01-15T00:00:00Z" }
    ],
    userRecurringScanState: [existingState]
  });

  migrateRecurringScanState();

  const store = loadStore();
  // Should not have added new entries
  assert.equal(store.userRecurringScanState.length, 1, "Should not add new entries when already populated");
  // Existing entry should remain unchanged
  assert.deepEqual(store.userRecurringScanState[0], existingState, "Existing state should be preserved");
});

test("migration sets all required fields correctly", () => {
  resetStoreForTests({
    users: [
      { id: "user1", email: "a@example.com", passwordHash: "h", salt: "s", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }
    ],
    transactions: [
      { id: "t1", user_id: "user1", account_id: "a1", transaction_date: "2026-01-15", amount: -10, created_at: "2026-01-15T00:00:00Z" }
    ],
    userRecurringScanState: []
  });

  migrateRecurringScanState();

  const store = loadStore();
  const state = store.userRecurringScanState[0];

  assert.equal(state.user_id, "user1", "user_id should be set");
  assert.equal(state.last_recurring_scan_at, null, "last_recurring_scan_at should be null");
  assert.equal(state.transactions_since_scan, 1, "transactions_since_scan should be 1");
  assert.ok(state.updated_at, "updated_at should be set");
  assert.ok(typeof state.updated_at === "string", "updated_at should be a string (ISO format)");
});

test("migration handles users with no transactions", () => {
  resetStoreForTests({
    users: [
      { id: "user1", email: "a@example.com", passwordHash: "h", salt: "s", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }
    ],
    transactions: [],
    userRecurringScanState: []
  });

  migrateRecurringScanState();

  const store = loadStore();
  const state = store.userRecurringScanState[0];

  assert.equal(state.transactions_since_scan, 0, "transactions_since_scan should be 0 for user with no transactions");
});