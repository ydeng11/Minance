import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { RANGE_OPTIONS } from "./constants.js";

describe("RANGE_OPTIONS", () => {
  it("exports array with expected presets", () => {
    assert.ok(Array.isArray(RANGE_OPTIONS));
    assert.strictEqual(RANGE_OPTIONS.length, 6);
  });

  it("each preset has value and label", () => {
    for (const option of RANGE_OPTIONS) {
      assert.ok(typeof option.value === "string");
      assert.ok(typeof option.label === "string");
    }
  });

  it("contains expected presets for the new range selector", () => {
    const values = RANGE_OPTIONS.map((o) => o.value);
    assert.ok(values.includes("3m"));
    assert.ok(values.includes("6m"));
    assert.ok(values.includes("12m"));
    assert.ok(values.includes("last_year"));
    assert.ok(values.includes("this_year"));
    assert.ok(values.includes("all"));
  });

  it("all values are unique", () => {
    const values = RANGE_OPTIONS.map((o) => o.value);
    const unique = new Set(values);
    assert.strictEqual(values.length, unique.size);
  });
});
