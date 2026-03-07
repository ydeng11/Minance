import test from "node:test";
import assert from "node:assert/strict";

import {
  inferLegacyTier1CoarseKey,
  resolveLegacyMappedCategory,
  buildLegacyCategoryStrategy,
  applyLegacyApiDataToStore
} from "../src/legacy-api-loader.ts";
import * as legacyApiLoader from "../src/legacy-api-loader.ts";
import { login } from "../src/auth.ts";
import { loadStore, resetStoreForTests } from "../src/store.ts";

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

test("inferLegacyTier1CoarseKey groups mapped categories into first-tier buckets", () => {
  assert.equal(inferLegacyTier1CoarseKey("Groceries"), "essential");
  assert.equal(inferLegacyTier1CoarseKey("Dining"), "extra");
  assert.equal(inferLegacyTier1CoarseKey("Salary"), "neutral");
  assert.equal(inferLegacyTier1CoarseKey("Credit Card Payments"), "neutral");
  assert.equal(inferLegacyTier1CoarseKey("Miscellaneous"), "other");
});

test("resolveLegacyMappedCategory uses mapped category when available", () => {
  const rawToMapped = new Map<string, string>([
    ["restaurants", "Dining"],
    ["uber technologies inc", "Travel"]
  ]);

  assert.equal(resolveLegacyMappedCategory("Restaurants", rawToMapped), "Dining");
  assert.equal(resolveLegacyMappedCategory("Uber Technologies, Inc", rawToMapped), "Travel");
  assert.equal(resolveLegacyMappedCategory("Unknown Raw", rawToMapped), "Unknown Raw");
  assert.equal(resolveLegacyMappedCategory("", rawToMapped), "Uncategorized");
});

test("buildLegacyCategoryStrategy uses only provided mapped categories as tier-2", () => {
  const strategy = buildLegacyCategoryStrategy(["Dining", "Groceries", "Salary", "Miscellaneous", "Dining"]);

  assert.deepEqual(
    strategy.coarseCategories.map((entry) => entry.key),
    ["essential", "extra", "neutral", "other"]
  );

  const byName = new Map(strategy.granularCategories.map((entry) => [entry.name, entry.coarseKey]));
  assert.equal(byName.get("Groceries"), "essential");
  assert.equal(byName.get("Dining"), "extra");
  assert.equal(byName.get("Salary"), "neutral");
  assert.equal(byName.get("Miscellaneous"), "other");
  assert.equal(strategy.granularCategories.length, 4);
});

test("legacy api loader stores debit expenses as positive amounts", () => {
  resetStoreForTests({
    users: [{ id: "user_1", email: "user@example.com", createdAt: "2026-01-01", updatedAt: "2026-01-01" }],
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
  });

  applyLegacyApiDataToStore({
    userId: "user_1",
    accounts: [
      { account_id: "legacy_account_1", bank_name: "PayPal", account_name: "PayPal Balance" }
    ],
    transactions: [
      {
        transaction_date: "2026-02-01",
        account_id: "legacy_account_1",
        description: "COSTCO WHSE #00 - General PayPal Debit Card Transaction",
        amount: -80.3,
        transaction_type: "debit"
      },
      {
        transaction_date: "2026-02-02",
        account_id: "legacy_account_1",
        description: "ENSON MARKET - General PayPal Debit Card Transaction",
        amount: -25.7,
        transaction_type: "debit"
      }
    ],
    mappedCategories: ["Groceries"],
    rawToMappedCategory: new Map(),
    resetUserData: true
  });

  const store = loadStore();
  const imported = store.transactions.filter((entry) => entry.user_id === "user_1");

  assert.equal(imported.length, 2);
  imported.forEach((entry) => {
    assert.equal(entry.direction, "outflow");
    assert.equal(entry.amount > 0, true);
  });
});

test("legacy loader creates a loginable user for explicit migration credentials", () => {
  resetStoreForTests(structuredClone(EMPTY_STORE));

  assert.equal(typeof legacyApiLoader.resolveLegacyLoaderUserId, "function");

  const userId = legacyApiLoader.resolveLegacyLoaderUserId("dev@minance.local", "12345678");
  const result = login("dev@minance.local", "12345678");

  assert.equal(result.user.id, userId);
  assert.equal(result.user.email, "dev@minance.local");
});

test("legacy loader updates an existing migration user's password when rerun with explicit credentials", () => {
  resetStoreForTests(structuredClone(EMPTY_STORE));

  assert.equal(typeof legacyApiLoader.resolveLegacyLoaderUserId, "function");

  const firstUserId = legacyApiLoader.resolveLegacyLoaderUserId("dev@minance.local", "12345678");
  const secondUserId = legacyApiLoader.resolveLegacyLoaderUserId("dev@minance.local", "abcdefgh");

  assert.equal(secondUserId, firstUserId);
  assert.throws(() => login("dev@minance.local", "12345678"), /Invalid credentials/);

  const result = login("dev@minance.local", "abcdefgh");
  assert.equal(result.user.id, firstUserId);
});

test("legacy loader rejects a blank explicit migration password", () => {
  resetStoreForTests(structuredClone(EMPTY_STORE));

  assert.equal(typeof legacyApiLoader.resolveLegacyLoaderUserId, "function");
  assert.throws(
    () => legacyApiLoader.resolveLegacyLoaderUserId("dev@minance.local", ""),
    /at least 8 characters/
  );
});
