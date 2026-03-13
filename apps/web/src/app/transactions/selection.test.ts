import test from "node:test";
import assert from "node:assert/strict";
import {
  pruneSelectionToVisible,
  toggleSelectAllVisible,
  toggleTransactionSelection
} from "./selection";

function sorted(values: Set<string>) {
  return Array.from(values).sort();
}

test("toggleTransactionSelection adds and removes ids from the current page", () => {
  assert.deepEqual(sorted(toggleTransactionSelection(new Set(["a"]), "b")), ["a", "b"]);
  assert.deepEqual(sorted(toggleTransactionSelection(new Set(["a", "b"]), "b")), ["a"]);
});

test("toggleSelectAllVisible replaces selection with only visible rows when checked", () => {
  assert.deepEqual(
    sorted(toggleSelectAllVisible(new Set(["stale"]), ["x", "y"], true)),
    ["x", "y"]
  );
});

test("toggleSelectAllVisible clears only visible rows when unchecked", () => {
  assert.deepEqual(
    sorted(toggleSelectAllVisible(new Set(["outside", "x", "y"]), ["x", "y"], false)),
    ["outside"]
  );
});

test("pruneSelectionToVisible removes ids that are no longer in the ledger page", () => {
  assert.deepEqual(sorted(pruneSelectionToVisible(new Set(["a", "b"]), ["b"])), ["b"]);
});
