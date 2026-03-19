import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import { SQLITE_FILE, STORE_BACKEND } from "../src/config.ts";
import { login, signup } from "../src/auth.ts";
import { loadStore, refreshStoreCacheIfChanged, resetStoreForTests } from "../src/store.ts";
import { readStoreCollectionsFromSqlite } from "../src/sqlite-store-repository.ts";

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
  migrationRuns: [],
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
  assert.equal(refreshStoreCacheIfChanged(), false);

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
