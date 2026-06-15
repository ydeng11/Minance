import test from "node:test";
import assert from "node:assert/strict";
import {
  createDefaultSharedFilterState,
  getSharedFilters,
  setSharedFilters,
  clearSharedFilters,
  type SharedFilterState
} from "./sharedFilters.ts";

const mockSessionStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

test("createDefaultSharedFilterState returns expected defaults", () => {
  const defaults = createDefaultSharedFilterState();
  assert.deepEqual(defaults, {
    range: "3m",
    start: "",
    end: "",
    categories: [],
    accounts: [],
    query: "",
    tag: "",
    transactionTypes: [],
    categoryView: "granular",
    recurring: false
  });
});

test("getSharedFilters returns defaults when sessionStorage is empty", () => {
  mockSessionStorage.clear();

  const originalWindow = global.window;
  global.window = { sessionStorage: mockSessionStorage } as any;

  const filters = getSharedFilters();
  assert.deepEqual(filters.transactionTypes, []);

  global.window = originalWindow;
});

test("getSharedFilters parses transactionTypes array correctly", () => {
  mockSessionStorage.setItem(
    "minance:shared-filters",
    JSON.stringify({
      transactionTypes: ["expense", "income"],
      range: "90d"
    })
  );

  const originalWindow = global.window;
  global.window = { sessionStorage: mockSessionStorage } as any;

  const filters = getSharedFilters();
  assert.deepEqual(filters.transactionTypes, ["expense", "income"]);

  global.window = originalWindow;
});

test("getSharedFilters filters out invalid transaction types", () => {
  mockSessionStorage.setItem(
    "minance:shared-filters",
    JSON.stringify({
      transactionTypes: ["expense", "invalid", "income", "unknown"],
      range: "90d"
    })
  );

  const originalWindow = global.window;
  global.window = { sessionStorage: mockSessionStorage } as any;

  const filters = getSharedFilters();
  assert.deepEqual(filters.transactionTypes, ["expense", "income"]);

  global.window = originalWindow;
});

test("setSharedFilters merges with existing filters", () => {
  mockSessionStorage.clear();

  const originalWindow = global.window;
  global.window = { sessionStorage: mockSessionStorage } as any;

  setSharedFilters({ transactionTypes: ["expense"], range: "6m" });

  setSharedFilters({ categories: ["Food"] });

  const filters = getSharedFilters();
  assert.deepEqual(filters.transactionTypes, ["expense"]);
  assert.deepEqual(filters.categories, ["Food"]);
  assert.equal(filters.range, "6m");

  global.window = originalWindow;
});

test("setSharedFilters preserves transactionTypes when updating other fields", () => {
  mockSessionStorage.clear();

  const originalWindow = global.window;
  global.window = { sessionStorage: mockSessionStorage } as any;

  setSharedFilters({ transactionTypes: ["expense", "income"] });

  setSharedFilters({ range: "all" });

  const filters = getSharedFilters();
  assert.deepEqual(filters.transactionTypes, ["expense", "income"]);
  assert.equal(filters.range, "all");

  global.window = originalWindow;
});

test("clearSharedFilters removes all filters from sessionStorage", () => {
  mockSessionStorage.setItem(
    "minance:shared-filters",
    JSON.stringify({ transactionTypes: ["expense"], range: "90d" })
  );

  const originalWindow = global.window;
  global.window = { sessionStorage: mockSessionStorage } as any;

  clearSharedFilters();

  const filters = getSharedFilters();
  assert.deepEqual(filters.transactionTypes, []);

  global.window = originalWindow;
});