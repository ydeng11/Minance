import test from "node:test";
import assert from "node:assert/strict";
import { getShellContentWidthClass } from "./shellWidth";

test("getShellContentWidthClass gives data-heavy views a wider fluid cap", () => {
  assert.equal(getShellContentWidthClass("/explorer"), "max-w-[96rem]");
  assert.equal(getShellContentWidthClass("/explorer/merchants"), "max-w-[96rem]");
  assert.equal(getShellContentWidthClass("/import"), "max-w-[96rem]");
  assert.equal(getShellContentWidthClass("/transactions"), "max-w-[96rem]");
  assert.equal(getShellContentWidthClass("/transactions/history"), "max-w-[96rem]");
  assert.equal(getShellContentWidthClass("/accounts"), "max-w-6xl");
  assert.equal(getShellContentWidthClass("/"), "max-w-6xl");
  assert.equal(getShellContentWidthClass(null), "max-w-6xl");
});
