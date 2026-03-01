import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

import { resetStoreForTests } from "../src/store.js";
import {
  checkStrategyCoverageAgainstBackupDb,
  createCategoryResolver,
  ensureCategoryStrategyForUser,
  updateCategoryStrategyForUser
} from "../src/category-strategy.js";

const EMPTY_STORE = {
  users: [{ id: "user_1", email: "user@example.com", createdAt: "2026-01-01", updatedAt: "2026-01-01" }],
  sessions: [],
  accounts: [],
  transactions: [],
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

test("default category strategy includes copilot coarse buckets and Auto granular category", () => {
  resetStoreForTests(structuredClone(EMPTY_STORE));
  const strategy = ensureCategoryStrategyForUser("user_1");

  assert.equal(strategy.coarseCategories.length, 4);
  assert.ok(strategy.coarseCategories.some((entry) => entry.name === "Essential"));
  assert.ok(strategy.granularCategories.some((entry) => entry.name === "Auto"));
});

test("resolver maps Honda/Jeep merchants to Auto", () => {
  resetStoreForTests(structuredClone(EMPTY_STORE));
  const strategy = ensureCategoryStrategyForUser("user_1");
  const resolveCategory = createCategoryResolver(strategy);
  const resolved = resolveCategory({
    categoryFinal: "Automotive",
    merchantNormalized: "american honda finance",
    description: "Honda lease payment",
    memo: ""
  });

  assert.equal(resolved.categoryGranular, "Auto");
  assert.equal(resolved.categoryCoarse, "Essential");
});

test("strategy update persists emoji and coarse mapping changes", () => {
  resetStoreForTests(structuredClone(EMPTY_STORE));
  const strategy = ensureCategoryStrategyForUser("user_1");
  const nextGranular = strategy.granularCategories.map((entry) =>
    entry.name === "Dining"
      ? { ...entry, emoji: "🍜", coarseKey: "essential" }
      : entry
  );

  const updated = updateCategoryStrategyForUser("user_1", {
    coarseCategories: strategy.coarseCategories,
    granularCategories: nextGranular
  });
  const dining = updated.granularCategories.find((entry) => entry.name === "Dining");

  assert.equal(dining?.emoji, "🍜");
  assert.equal(dining?.coarseKey, "essential");
});

test("default strategy covers categories found in backup training db", (t) => {
  const sqliteAvailable = spawnSync("sqlite3", ["-version"], { encoding: "utf8" });
  if (sqliteAvailable.status !== 0) {
    t.skip("sqlite3 is unavailable in test environment");
    return;
  }

  const coverage = checkStrategyCoverageAgainstBackupDb();
  assert.deepEqual(coverage.missingCanonicalCategories, []);
  assert.deepEqual(coverage.missingTransactionCategories, []);
});

