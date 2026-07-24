import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const dashboardPageSource = readFileSync(join(process.cwd(), "src/app/page.tsx"), "utf8");

test("home delegates financial story judgment to deterministic presentation helpers", () => {
  assert.match(dashboardPageSource, /buildHomeStories/);
  assert.match(dashboardPageSource, /describeOperatingFlow/);
  assert.match(dashboardPageSource, /buildInsightHeadline/);
});
