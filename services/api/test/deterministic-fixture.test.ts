import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

import {
  createDeterministicFinancialFixture,
  DETERMINISTIC_FIXTURE_USER_ID,
  summarizeDeterministicFinancialFixture,
  writeDeterministicFinancialFixture
} from "./fixtures/deterministic-financial-fixture.js";
import { resetStoreForTests } from "../src/store.ts";
import { listTransactions } from "../src/transactions.ts";
import { getOverview } from "../src/analytics.ts";

const FIXTURE_FILE_PATH = path.resolve(
  import.meta.dirname,
  "fixtures/deterministic-financial-store.json"
);
const ROOT_DIR = path.resolve(import.meta.dirname, "../..");
const PROJECT_ROOT = path.resolve(import.meta.dirname, "../../..");
const DEVELOPMENT_DATABASE_PATH = path.resolve(
  import.meta.dirname,
  "../data/development-minance.sqlite"
);
const TEST_DATABASE_PATH = path.resolve(import.meta.dirname, "../data/test-minance.sqlite");

test("deterministic financial fixture has stable shape and coverage", () => {
  const fixture = createDeterministicFinancialFixture();
  const summary = summarizeDeterministicFinancialFixture(fixture);

  assert.equal(summary.users, 1);
  assert.equal(summary.accounts, 4);
  assert.equal(summary.categories, 12);
  assert.equal(summary.transactions, 214);
  assert.equal(summary.recurringRules, 6);
  assert.equal(summary.investmentHoldings, 2);
  assert.equal(summary.investmentSnapshots, 19);
  assert.equal(summary.savedViews, 3);
});

test("deterministic financial fixture generation is repeatable", () => {
  const first = createDeterministicFinancialFixture();
  const second = createDeterministicFinancialFixture();
  assert.deepEqual(first, second);
});

test("deterministic financial fixture file stays aligned with generator", () => {
  const generated = createDeterministicFinancialFixture();
  const fileContents = JSON.parse(fs.readFileSync(FIXTURE_FILE_PATH, "utf8"));

  assert.deepEqual(fileContents, generated);
});

for (const [environment, databasePath] of [
  ["development", DEVELOPMENT_DATABASE_PATH],
  ["test", TEST_DATABASE_PATH]
]) {
  test(`tracked ${environment} database contains the deterministic 2025 and 2026 dataset`, () => {
    assert.equal(fs.existsSync(databasePath), true);

    const result = spawnSync(
      "sqlite3",
      [
        "-json",
        databasePath,
        "SELECT COUNT(*) AS transactions, MIN(transaction_date) AS first_date, MAX(transaction_date) AS last_date FROM transactions;"
      ],
      { encoding: "utf8" }
    );

    assert.equal(result.status, 0, result.stderr || `${environment} fixture query failed`);
    assert.deepEqual(JSON.parse(result.stdout), [
      {
        transactions: 214,
        first_date: "2025-01-01",
        last_date: "2026-07-18"
      }
    ]);
  });
}

test("test runtime loads the tracked seed into an isolated test-minance.sqlite", () => {
  const result = spawnSync(
    "pnpm",
    [
      "exec",
      "tsx",
      "-e",
      "void (async () => { const { SQLITE_FILE } = await import('./services/api/src/config.ts'); const { loadStore } = await import('./services/api/src/store.ts'); console.log(JSON.stringify({ sqliteFile: SQLITE_FILE, transactions: loadStore().transactions.length })); })();"
    ],
    {
      cwd: PROJECT_ROOT,
      encoding: "utf8",
      env: {
        ...process.env,
        NODE_ENV: "test",
        MINANCE_SQLITE_FILE_TEST: ""
      }
    }
  );

  assert.equal(result.status, 0, result.stderr || "test runtime fixture load failed");
  const payload = JSON.parse(result.stdout.trim());
  assert.equal(path.basename(payload.sqliteFile), "test-minance.sqlite");
  assert.match(payload.sqliteFile, /services\/api\/tmp\/test-runtime-/);
  assert.equal(payload.transactions, 214);
});

test("deterministic financial fixture drives analytics and transactions consistently", () => {
  resetStoreForTests(createDeterministicFinancialFixture());

  const listed = listTransactions(DETERMINISTIC_FIXTURE_USER_ID, { range: "all" });
  assert.equal(listed.total, 214);

  const recurring = listTransactions(DETERMINISTIC_FIXTURE_USER_ID, {
    range: "all",
    recurring: true
  });
  assert.equal(recurring.total, 115);

  const needsReview = listTransactions(DETERMINISTIC_FIXTURE_USER_ID, {
    range: "all",
    review_status: "needs_review"
  });
  assert.equal(needsReview.total, 1);

  const overview = getOverview(DETERMINISTIC_FIXTURE_USER_ID, {
    start: "2025-01-01",
    end: "2026-07-31"
  });

  assert.equal(overview.trend.length, 19);
  assert.ok(overview.summary.totalIncome > overview.summary.totalSpend);
  assert.ok(overview.topCategories.some((entry) => entry.category === "Housing"));
  assert.ok(overview.topCategories.some((entry) => entry.category === "Groceries"));
});

test("writeDeterministicFinancialFixture writes a valid fixture file", () => {
  const tmpPath = path.resolve("services/api/tmp/deterministic-fixture-test.json");

  try {
    const result = writeDeterministicFinancialFixture(tmpPath);
    assert.equal(result.summary.transactions, 214);

    const loaded = JSON.parse(fs.readFileSync(tmpPath, "utf8"));
    assert.equal(loaded.users[0].id, DETERMINISTIC_FIXTURE_USER_ID);
  } finally {
    fs.rmSync(tmpPath, { force: true });
  }
});

test("seed:fixture dry-run defaults to the committed test fixture path", () => {
  const result = spawnSync("pnpm", ["seed:fixture", "--", "--dry-run"], {
    cwd: ROOT_DIR,
    encoding: "utf8"
  });

  assert.equal(result.status, 0, result.stderr || "seed:fixture dry-run failed");

  const stdout = String(result.stdout || "");
  const jsonStart = stdout.indexOf("{");
  assert.notEqual(jsonStart, -1, `seed:fixture output did not contain JSON:\n${stdout}`);

  const payload = JSON.parse(stdout.slice(jsonStart));
  assert.equal(
    payload.targetPath,
    FIXTURE_FILE_PATH
  );
  assert.equal(payload.wrote, false);
});
