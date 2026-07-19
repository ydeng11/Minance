import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { setTimeout as delay } from "node:timers/promises";

import { SQLITE_FILE, STORE_BACKEND } from "../src/config.ts";
import { login, signup } from "../src/auth.ts";
import {
  appendAuditEventToStore,
  loadStore,
  refreshStoreCacheIfChanged,
  resetStoreForTests,
  saveStoreRows
} from "../src/store.ts";
import { readStoreCollectionsFromSqlite } from "../src/sqlite-store-repository.ts";
import { writeStoreCollectionsToSqlite } from "../src/sqlite-store-repository.ts";
import { hashPassword } from "../src/utils.ts";

const EMPTY_STORE = {
  users: [],
  sessions: [],
  accounts: [],
  transactions: [],
  recurringRules: [],
  recurringSuggestions: [],
  dismissedRecurringSuggestions: [],
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
  auditEvents: [],
  userRecurringScanState: [],
  scanRunState: {
    is_running: false,
    last_run_at: null,
    last_run_status: null,
    last_run_duration_ms: null
  }
};

test("store includes userRecurringScanState and scanRunState collections", () => {
  resetStoreForTests({});
  const store = loadStore();

  assert.ok(Array.isArray(store.userRecurringScanState), "userRecurringScanState should be an array");
  assert.ok(store.scanRunState, "scanRunState should exist");
  assert.equal(store.scanRunState.is_running, false);
  assert.equal(store.scanRunState.last_run_at, null);
});

test("test runtime persists auth mutations through isolated sqlite storage", () => {
  resetStoreForTests(structuredClone(EMPTY_STORE));

  const email = "cache-seed@example.com";
  const password = "cachepass123";
  const created = signup(email, password);
  assert.equal(created.user.email, email);

  login(email, password);

  assert.equal(STORE_BACKEND, "sqlite");
  assert.equal(fs.existsSync(SQLITE_FILE), true);

  const persisted = readStoreCollectionsFromSqlite({ dbPath: SQLITE_FILE });
  assert.equal(persisted.users.length, 1);
  assert.equal(persisted.users[0]?.email, email);
  assert.equal(persisted.sessions.length >= 1, true);
  assert.equal(
    persisted.sessions.every((session: { userId?: string; user_id?: string }) => {
      const userId = session.userId ?? session.user_id ?? null;
      return userId === created.user.id;
    }),
    true
  );
});

test("sqlite targeted row save persists rows without forcing local cache reload", () => {
  resetStoreForTests(structuredClone(EMPTY_STORE));

  const store = loadStore();
  const transaction = {
    id: "txn_targeted_store",
    user_id: "user_targeted_store",
    account_id: "acct_targeted_store",
    account_key: "targeted:checking",
    source_type: "manual",
    source_file_id: null,
    transaction_date: "2026-03-01",
    post_date: null,
    merchant_raw: "Targeted Store",
    merchant_normalized: "targeted store",
    description: "Targeted save",
    amount: 33.4,
    currency: "USD",
    direction: "outflow",
    category_final: "Dining",
    category_confidence: 1,
    memo: null,
    transaction_type: "expense",
    tags: [],
    needs_category_review: false,
    review_status: "reviewed",
    recurring_rule_id: null,
    created_at: "2026-03-01T00:00:00.000Z",
    updated_at: "2026-03-01T00:00:00.000Z"
  };
  store.transactions.push(transaction);
  const auditEvent = appendAuditEventToStore(store, "user_targeted_store", "transaction.update", {
    transactionId: transaction.id
  });

  saveStoreRows(store, [
    { tableName: "transactions", row: transaction },
    { tableName: "audit_events", row: auditEvent }
  ]);

  const persisted = readStoreCollectionsFromSqlite({ dbPath: SQLITE_FILE });
  assert.equal(persisted.transactions.find((entry) => entry.id === transaction.id)?.transaction_type, "expense");
  assert.equal(
    persisted.auditEvents.find((entry) => entry.id === auditEvent.id)?.details?.transactionId,
    transaction.id
  );
  assert.equal(refreshStoreCacheIfChanged(), false);
  assert.equal(loadStore().transactions.find((entry) => entry.id === transaction.id)?.description, "Targeted save");
});

test("sqlite runtime refresh picks up externally seeded users before login", async () => {
  resetStoreForTests(structuredClone(EMPTY_STORE));

  loadStore();
  await delay(10);

  const externalStore = structuredClone(EMPTY_STORE);
  const { passwordHash, salt } = hashPassword("12345678");
  externalStore.users.push({
    id: "user_external",
    email: "dev@minance.local",
    passwordHash,
    passwordSalt: salt,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  });
  writeStoreCollectionsToSqlite(externalStore, { dbPath: SQLITE_FILE });

  assert.equal(refreshStoreCacheIfChanged(), true);

  const result = login("dev@minance.local", "12345678");
  assert.equal(result.user.email, "dev@minance.local");
});
