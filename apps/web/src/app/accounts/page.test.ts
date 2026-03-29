import test from "node:test";
import assert from "node:assert/strict";
import * as accountsPageModule from "./page";
import { getSupportedAccountTypes } from "../../../../../packages/domain/src/accounts";

test("resolveSupportedAccountTypes falls back to the shared domain account type list", () => {
  const resolveSupportedAccountTypes = (accountsPageModule as {
    resolveSupportedAccountTypes?: (accountTypes: string[]) => string[];
  }).resolveSupportedAccountTypes;

  assert.equal(typeof resolveSupportedAccountTypes, "function");
  assert.deepEqual(resolveSupportedAccountTypes?.([]), getSupportedAccountTypes());
  assert.deepEqual(resolveSupportedAccountTypes?.(["credit", "loan"]), ["credit", "loan"]);
});
