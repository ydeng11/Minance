import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { RANGE_OPTIONS } from "./constants.js";

describe("RANGE_OPTIONS", () => {
  it("exports array with expected presets", () => {
    assert.ok(Array.isArray(RANGE_OPTIONS));
    assert.ok(RANGE_OPTIONS.length >= 8);
  });

  it("each preset has value and label", () => {
    for (const option of RANGE_OPTIONS) {
      assert.ok(typeof option.value === "string");
      assert.ok(typeof option.label === "string");
    }
  });

  it("contains new presets this_month, this_year, custom", () => {
    const values = RANGE_OPTIONS.map((o) => o.value);
    assert.ok(values.includes("this_month"));
    assert.ok(values.includes("this_year"));
    assert.ok(values.includes("custom"));
  });

  it("all values are unique", () => {
    const values = RANGE_OPTIONS.map((o) => o.value);
    const unique = new Set(values);
    assert.strictEqual(values.length, unique.size);
  });
});
