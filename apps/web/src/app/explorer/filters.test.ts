import test from "node:test";
import assert from "node:assert/strict";

import {
  buildExplorerFilterSearchParams,
  createDefaultExplorerFilterState,
  parseExplorerFilterState,
  savedExplorerFiltersToState,
  toValidExplorerFilterState
} from "./filters";

test("buildExplorerFilterSearchParams persists perspective and compare mode", () => {
  const params = buildExplorerFilterSearchParams({
    ...createDefaultExplorerFilterState(),
    perspective: "account",
    compare: "previous",
    account: "acct_card"
  });

  assert.equal(params.toString(), "account=acct_card&perspective=account&compare=previous");
});

test("parseExplorerFilterState ignores legacy review search params", () => {
  const state = parseExplorerFilterState(
    new URLSearchParams("range=30d&review=reviewed&category=Groceries&category=Travel")
  );

  assert.equal(state.range, "30d");
  assert.deepEqual(state.categories, ["Groceries", "Travel"]);
  assert.equal("review" in state, false);
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

test("toValidExplorerFilterState trims and deduplicates array filters", () => {
  const state = toValidExplorerFilterState({
    ...createDefaultExplorerFilterState(),
    categories: [" Food ", "Travel", "Food", ""],
    transactionTypes: ["expense", "transfer", "expense"]
  });

  assert.deepEqual(state.categories, ["Food", "Travel"]);
  assert.deepEqual(state.transactionTypes, ["expense", "transfer"]);
});
