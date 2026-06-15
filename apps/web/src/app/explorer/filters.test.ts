import test from "node:test";
import assert from "node:assert/strict";

import {
  buildExplorerFilterSearchParams,
  createDefaultExplorerFilterState,
  parseExplorerFilterState,
  savedExplorerFiltersToState,
  toExplorerAnalyticsApiParams,
  toValidExplorerFilterState
} from "./filters";

test("buildExplorerFilterSearchParams persists perspective and compare mode", () => {
  const params = buildExplorerFilterSearchParams({
    ...createDefaultExplorerFilterState(),
    perspective: "category",
    compare: "previous",
    account: "acct_card"
  });

  assert.equal(params.toString(), "account=acct_card&perspective=category&compare=previous");
});

test("buildExplorerFilterSearchParams persists merchant drill-down state", () => {
  const params = buildExplorerFilterSearchParams({
    ...createDefaultExplorerFilterState(),
    merchant: "Sunset Grocer"
  });

  assert.equal(params.get("merchant"), "Sunset Grocer");
});

test("parseExplorerFilterState ignores legacy review search params", () => {
  const state = parseExplorerFilterState(
    new URLSearchParams("range=30d&review=reviewed&category=Groceries&category=Travel")
  );

  assert.equal(state.range, "3m");
  assert.deepEqual(state.categories, ["Groceries", "Travel"]);
  assert.equal("review" in state, false);
});

test("parseExplorerFilterState reads merchant drill-down state", () => {
  const state = parseExplorerFilterState(new URLSearchParams("merchant=Sunset%20Grocer"));

  assert.equal(state.merchant, "Sunset Grocer");
});

test("savedExplorerFiltersToState ignores legacy review values", () => {
  const state = savedExplorerFiltersToState({
    review: "needs_review",
    account: "Checking",
    categories: ["Food", "Travel"],
    transactionTypes: ["expense", "transfer"]
  });

  assert.equal(state.account, "Checking");
  assert.deepEqual(state.categories, ["Food", "Travel"]);
  assert.deepEqual(state.transactionTypes, ["expense", "transfer"]);
  assert.equal("review" in state, false);
});

test("buildExplorerFilterSearchParams writes repeated category and type params", () => {
  const params = buildExplorerFilterSearchParams({
    ...createDefaultExplorerFilterState(),
    categories: ["Food", "Travel"],
    transactionTypes: ["expense", "transfer"]
  });

  assert.deepEqual(params.getAll("category"), ["Food", "Travel"]);
  assert.deepEqual(params.getAll("type"), ["expense", "transfer"]);
});

test("parseExplorerFilterState reads recurring parameter", () => {
  const state = parseExplorerFilterState(new URLSearchParams("recurring=true"));

  assert.equal(state.recurring, true);
});

test("buildExplorerFilterSearchParams includes recurring when true", () => {
  const params = buildExplorerFilterSearchParams({
    ...createDefaultExplorerFilterState(),
    recurring: true
  });

  assert.equal(params.get("recurring"), "true");
});

test("toExplorerAnalyticsApiParams sends recurring-only sentinel when enabled", () => {
  const params = toExplorerAnalyticsApiParams({
    ...createDefaultExplorerFilterState(),
    recurring: true
  });

  assert.equal(params.recurring_rule_id, "true");
});

test("toExplorerAnalyticsApiParams forwards merchant drill-down state", () => {
  const params = toExplorerAnalyticsApiParams({
    ...createDefaultExplorerFilterState(),
    merchant: "Sunset Grocer"
  });

  assert.equal(params.merchant, "Sunset Grocer");
});

test("toValidExplorerFilterState trims and deduplicates array filters", () => {
  const state = toValidExplorerFilterState({
    ...createDefaultExplorerFilterState(),
    categories: [" Food ", "Travel", "Food", ""],
    transactionTypes: ["expense", "transfer", "expense"]
  });

  assert.deepEqual(state.categories, ["Food", "Travel"]);
  assert.deepEqual(state.transactionTypes, ["expense", "transfer"]);
});
