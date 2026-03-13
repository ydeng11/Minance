import test from "node:test";
import assert from "node:assert/strict";

import {
  buildExplorerFilterSearchParams,
  createDefaultExplorerFilterState,
  parseExplorerFilterState,
  savedExplorerFiltersToState
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
    new URLSearchParams("range=30d&review=reviewed&category=Groceries")
  );

  assert.equal(state.range, "30d");
  assert.equal(state.category, "Groceries");
  assert.equal("review" in state, false);
});

test("savedExplorerFiltersToState ignores legacy review values", () => {
  const state = savedExplorerFiltersToState({
    review: "needs_review",
    account: "Checking"
  });

  assert.equal(state.account, "Checking");
  assert.equal("review" in state, false);
});
