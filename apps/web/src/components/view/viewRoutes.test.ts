import test from "node:test";
import assert from "node:assert/strict";
import { isViewRoute } from "./viewRoutes";

test("isViewRoute supports Explorer and Transactions", () => {
  assert.equal(isViewRoute("/explorer"), true);
  assert.equal(isViewRoute("/transactions"), true);
  assert.equal(isViewRoute("/explorer/"), true);
  assert.equal(isViewRoute("/transactions/"), true);
});

test("isViewRoute rejects non-view routes", () => {
  assert.equal(isViewRoute("/accounts"), false);
  assert.equal(isViewRoute("/categories"), false);
  assert.equal(isViewRoute("/"), false);
});
