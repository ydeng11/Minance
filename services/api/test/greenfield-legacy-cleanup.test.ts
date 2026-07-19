import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { resolve } from "node:path";

const ROOT_DIR = resolve(import.meta.dirname, "../../..");

function repoFile(path: string) {
  return readFileSync(resolve(ROOT_DIR, path), "utf8");
}

test("greenfield runtime does not ship Minance V1 migration entry points", () => {
  for (const path of [
    "services/api/src/migration.ts",
    "services/api/src/legacy-api-loader.ts",
    "services/api/src/migrations/account-identity-repair.ts",
    "scripts/load-legacy-api.ts"
  ]) {
    assert.equal(existsSync(resolve(ROOT_DIR, path)), false, `${path} should be removed`);
  }

  const packageJson = JSON.parse(repoFile("package.json"));
  assert.equal(packageJson.scripts["seed:legacy-api"], undefined);
  assert.doesNotMatch(repoFile("justfile"), /seed-legacy-api/);
});

test("greenfield store does not retain V1 migration report state", () => {
  assert.doesNotMatch(repoFile("services/api/src/store.ts"), /migrationRuns/);
  assert.doesNotMatch(repoFile("services/api/sql/schema.sql"), /migration_runs/);
  assert.doesNotMatch(repoFile("scripts/sqlite-cutover-lib.ts"), /migrationRuns|migration_runs/);
  assert.doesNotMatch(repoFile("services/api/src/category-strategy.ts"), /checkStrategyCoverageAgainstBackupDb|backup_.*\.db/);
});

test("transaction runtime does not accept the pre-refactor contract", () => {
  const transactions = repoFile("services/api/src/transactions.ts");
  const analytics = repoFile("services/api/src/analytics.ts");
  const filters = repoFile("services/api/src/transactionFilters.ts");
  const recurrings = repoFile("services/api/src/recurrings.ts");
  const sqliteStore = repoFile("scripts/sqlite-cutover-lib.ts");
  const transactionStoreSpec = sqliteStore.slice(
    sqliteStore.indexOf('storeKey: "transactions"'),
    sqliteStore.indexOf('storeKey: "categories"')
  );
  const recordNormalizer = transactions.slice(
    transactions.indexOf("function normalizeTransactionRecord"),
    transactions.indexOf("function normalizeManualInput")
  );

  for (const source of [transactions, analytics, filters, recurrings]) {
    assert.doesNotMatch(source, /rawDirection === "(?:debit|credit)"/);
    assert.doesNotMatch(source, /direction === "(?:debit|credit)"/);
  }

  assert.doesNotMatch(transactions, /spending: "expense"/);
  assert.doesNotMatch(transactions, /internal_transfer: "transfer"/);
  assert.doesNotMatch(recordNormalizer, /Math\.abs\(rawAmount\)/);
  assert.doesNotMatch(analytics, /Math\.abs\(rawAmount\)/);
  assert.doesNotMatch(transactions, /\["transaction_type", "type"\]/);
  assert.doesNotMatch(transactions, /\["recurring_rule_id", "recurringRuleId"\]/);
  assert.doesNotMatch(transactionStoreSpec, /row\.(?:userId|accountId|accountKey|sourceType|transactionDate|merchantRaw|categoryFinal|dedupeFingerprint)/);
});
