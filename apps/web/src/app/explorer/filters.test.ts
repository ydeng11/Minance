import test from "node:test";
import assert from "node:assert/strict";

import {
  buildExplorerFilterSearchParams,
  createDefaultExplorerFilterState
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
