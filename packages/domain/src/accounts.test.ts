import test from "node:test";
import assert from "node:assert/strict";
import * as accountsModule from "./accounts";

test("getSupportedAccountTypes exposes the canonical account type list including depository", () => {
  const getSupportedAccountTypes = (accountsModule as {
    getSupportedAccountTypes?: () => string[];
  }).getSupportedAccountTypes;

  assert.equal(typeof getSupportedAccountTypes, "function");
  assert.deepEqual(getSupportedAccountTypes?.(), [
    "cash",
    "checking",
    "credit",
    "depository",
    "investment",
    "loan",
    "savings"
  ]);
});
