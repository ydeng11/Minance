// In services/api/test/recurring-scan.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { resetStoreForTests, loadStore } from "../src/store.ts";
import {
  incrementUserScanCounter,
  getUserScanState,
  getAdaptiveThreshold,
  daysBetween,
  subMonths
} from "../src/recurring-scan.ts";

const USER_ID = "user_scan_1";

test("incrementUserScanCounter creates state if not exists", () => {
  resetStoreForTests({});
  incrementUserScanCounter(USER_ID);

  const store = loadStore();
  const state = store.userRecurringScanState.find(s => s.user_id === USER_ID);
  assert.ok(state, "State should be created");
  assert.equal(state.transactions_since_scan, 1);
});

test("incrementUserScanCounter increments existing state", () => {
  resetStoreForTests({});
  incrementUserScanCounter(USER_ID);
  incrementUserScanCounter(USER_ID);
  incrementUserScanCounter(USER_ID);

  const state = getUserScanState(USER_ID);
  assert.equal(state.transactions_since_scan, 3);
});

test("getAdaptiveThreshold returns correct values", () => {
  assert.equal(getAdaptiveThreshold(0), 5);
  assert.equal(getAdaptiveThreshold(5), 5);
  assert.equal(getAdaptiveThreshold(7), 3);
  assert.equal(getAdaptiveThreshold(15), 3);
  assert.equal(getAdaptiveThreshold(30), 1);
  assert.equal(getAdaptiveThreshold(100), 1);
});

test("daysBetween returns correct days", () => {
  assert.equal(daysBetween("2026-01-01T00:00:00Z", "2026-01-08T00:00:00Z"), 7);
  assert.equal(daysBetween("2026-01-01T00:00:00Z", "2026-02-01T00:00:00Z"), 31);
});

test("daysBetween returns Infinity for null", () => {
  assert.equal(daysBetween(null, "2026-01-01T00:00:00Z"), Infinity);
});

test("subMonths returns correct date", () => {
  assert.equal(subMonths("2026-03-19", 6), "2025-09-19");
  assert.equal(subMonths("2026-01-15", 1), "2025-12-15");
});