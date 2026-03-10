import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import { SQLITE_FILE, STORE_BACKEND } from "../src/config.ts";
import { login, signup } from "../src/auth.ts";
import { refreshStoreCacheIfChanged, resetStoreForTests } from "../src/store.ts";
import { readStoreCollectionsFromSqlite } from "../src/sqlite-store-repository.ts";

const EMPTY_STORE = {
  users: [],
  sessions: [],
  accounts: [],
  transactions: [],
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
