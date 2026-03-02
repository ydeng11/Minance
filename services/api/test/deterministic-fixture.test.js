import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import {
  createDeterministicFinancialFixture,
  DETERMINISTIC_FIXTURE_USER_ID,
  summarizeDeterministicFinancialFixture,
  writeDeterministicFinancialFixture
} from "./fixtures/deterministic-financial-fixture.js";
import { resetStoreForTests } from "../src/store.js";
import { listTransactions } from "../src/transactions.js";
import { getOverview } from "../src/analytics.js";

const FIXTURE_FILE_PATH = path.resolve(
  "services/api/test/fixtures/deterministic-financial-store.json"
);

test("deterministic financial fixture has stable shape and coverage", () => {
  const fixture = createDeterministicFinancialFixture();
  const summary = summarizeDeterministicFinancialFixture(fixture);

  assert.equal(summary.users, 1);
  assert.equal(summary.accounts, 4);
  assert.equal(summary.categories, 8);
  assert.equal(summary.transactions, 20);
  assert.equal(summary.recurringRules, 2);
  assert.equal(summary.investmentHoldings, 2);
  assert.equal(summary.investmentSnapshots, 2);
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

test("deterministic financial fixture drives analytics and transactions consistently", () => {
  resetStoreForTests(createDeterministicFinancialFixture());

  const listed = listTransactions(DETERMINISTIC_FIXTURE_USER_ID, { range: "all" });
  assert.equal(listed.total, 20);

  const overview = getOverview(DETERMINISTIC_FIXTURE_USER_ID, {
    start: "2026-01-01",
    end: "2026-03-31"
  });

  assert.equal(overview.summary.totalIncome, 16674.22);
  assert.equal(overview.summary.totalSpend, 7262.57);
  assert.equal(overview.summary.netFlow, 9411.65);
});

test("writeDeterministicFinancialFixture writes a valid fixture file", () => {
  const tmpPath = path.resolve("services/api/tmp/deterministic-fixture-test.json");

  try {
    const result = writeDeterministicFinancialFixture(tmpPath);
    assert.equal(result.summary.transactions, 20);

    const loaded = JSON.parse(fs.readFileSync(tmpPath, "utf8"));
    assert.equal(loaded.users[0].id, DETERMINISTIC_FIXTURE_USER_ID);
  } finally {
    fs.rmSync(tmpPath, { force: true });
  }
});
