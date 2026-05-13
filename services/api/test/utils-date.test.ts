import test from "node:test";
import assert from "node:assert/strict";

import { computeDateRange, parseDate } from "../src/utils.ts";

function utcDateYmd(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(
    date.getUTCDate()
  ).padStart(2, "0")}`;
}

test("computeDateRange supports all-time mode", () => {
  const range = computeDateRange("all");
  assert.equal(range.start, null);
  assert.equal(range.end, null);
});

test("computeDateRange uses UTC day boundaries", () => {
  const range = computeDateRange("30d");
  assert.equal(range.end, utcDateYmd());
});

test("computeDateRange this_month starts on first day of UTC month", () => {
  const now = new Date();
  const expectedStart = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
  const range = computeDateRange("this_month");
  assert.equal(range.start, expectedStart);
  assert.equal(range.end, utcDateYmd());
});

test("computeDateRange this_year matches year-to-start through today", () => {
  const now = new Date();
  const expectedStart = `${now.getUTCFullYear()}-01-01`;
  const range = computeDateRange("this_year");
  assert.equal(range.start, expectedStart);
  assert.equal(range.end, utcDateYmd());
});

test("parseDate keeps YYYY-MM-DD from ISO timestamps", () => {
  assert.equal(parseDate("2026-02-14T00:00:00.000Z"), "2026-02-14");
});

test("parseDate keeps explicit date portion from ISO timestamps with offsets", () => {
  assert.equal(parseDate("2026-02-14T23:30:00-05:00"), "2026-02-14");
});

test("parseDate supports slash dates", () => {
  assert.equal(parseDate("2/5/2026"), "2026-02-05");
});

test("parseDate rejects impossible slash dates", () => {
  assert.equal(parseDate("2/30/2026"), null);
});

test("parseDate normalizes Date instances using UTC date", () => {
  const instant = new Date("2026-03-01T00:30:00+09:00");
  assert.equal(parseDate(instant), "2026-02-28");
});
