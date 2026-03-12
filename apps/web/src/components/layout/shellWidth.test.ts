import test from "node:test";
import assert from "node:assert/strict";
import { getShellContentWidthClass } from "./shellWidth";

test("getShellContentWidthClass widens only the transactions route", () => {
  assert.equal(getShellContentWidthClass("/transactions"), "max-w-[96rem]");
  assert.equal(getShellContentWidthClass("/transactions/history"), "max-w-[96rem]");
  assert.equal(getShellContentWidthClass("/accounts"), "max-w-6xl");
  assert.equal(getShellContentWidthClass("/"), "max-w-6xl");
  assert.equal(getShellContentWidthClass(null), "max-w-6xl");
});
