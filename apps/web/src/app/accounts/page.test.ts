import test from "node:test";
import assert from "node:assert/strict";
import { getSupportedAccountTypes } from "../../../../../packages/domain/src/accounts";
import { resolveSupportedAccountTypes } from "./accountTypes";

test("resolveSupportedAccountTypes falls back to the shared domain account type list", () => {
  assert.deepEqual(resolveSupportedAccountTypes([]), getSupportedAccountTypes());
  assert.deepEqual(resolveSupportedAccountTypes(["credit", "loan"]), ["credit", "loan"]);
});
