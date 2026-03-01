import test from "node:test";
import assert from "node:assert/strict";

import { computeDateRange, parseDate } from "../src/utils.js";

function localDateYmd(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

test("computeDateRange supports all-time mode", () => {
  const range = computeDateRange("all");
  assert.equal(range.start, null);
  assert.equal(range.end, null);
});

test("computeDateRange uses local calendar date", () => {
  const range = computeDateRange("30d");
  assert.equal(range.end, localDateYmd());
});

test("parseDate keeps YYYY-MM-DD from ISO timestamps", () => {
  assert.equal(parseDate("2026-02-14T00:00:00.000Z"), "2026-02-14");
});

test("parseDate supports slash dates", () => {
  assert.equal(parseDate("2/5/2026"), "2026-02-05");
});
