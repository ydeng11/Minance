import test from "node:test";
import assert from "node:assert/strict";

import { ensureDevTestAccount, login } from "../src/auth.js";
import { resetStoreForTests, loadStore } from "../src/store.js";

const EMPTY_STORE = {
  users: [],
  sessions: [],
  accounts: [],
  transactions: [],
  categories: [],
  categoryRules: [],
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

function withEnv(overrides, fn) {
  const original = {};
  for (const [key, value] of Object.entries(overrides)) {
    original[key] = process.env[key];
    if (value === null) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    return fn();
  } finally {
    for (const [key, value] of Object.entries(overrides)) {
      if (original[key] == null) {
        delete process.env[key];
      } else {
        process.env[key] = original[key];
      }
    }
  }
}

test("ensureDevTestAccount seeds a reusable account in non-production", () => {
  resetStoreForTests(structuredClone(EMPTY_STORE));

  withEnv(
    {
      NODE_ENV: "development",
      DEV_TEST_ACCOUNT_EMAIL: "dev-seed@example.com",
      DEV_TEST_ACCOUNT_PASSWORD: "seedpass123",
      MINANCE_SEED_TEST_ACCOUNT: "true"
    },
    () => {
      const first = ensureDevTestAccount();
      assert.equal(first.enabled, true);
      assert.equal(first.created, true);
      assert.equal(first.email, "dev-seed@example.com");

      const second = ensureDevTestAccount();
      assert.equal(second.enabled, true);
      assert.equal(second.created, false);

      const result = login("dev-seed@example.com", "seedpass123");
      assert.equal(result.user.email, "dev-seed@example.com");

      const store = loadStore();
      assert.equal(store.users.length, 1);
    }
  );
});

test("ensureDevTestAccount is disabled in production", () => {
  resetStoreForTests(structuredClone(EMPTY_STORE));

  withEnv(
    {
      NODE_ENV: "production",
      DEV_TEST_ACCOUNT_EMAIL: "prod-seed@example.com",
      DEV_TEST_ACCOUNT_PASSWORD: "seedpass123",
      MINANCE_SEED_TEST_ACCOUNT: "true"
    },
    () => {
      const seeded = ensureDevTestAccount();
      assert.equal(seeded.enabled, false);
      assert.equal(loadStore().users.length, 0);
    }
  );
});
