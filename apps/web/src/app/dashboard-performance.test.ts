import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const dashboardPageSource = readFileSync(join(process.cwd(), "src/app/page.tsx"), "utf8");

test("dashboard page delegates trend-bar derivation to the presentation helper", () => {
  assert.match(dashboardPageSource, /buildDashboardTrendBars/);
  assert.doesNotMatch(dashboardPageSource, /Math\.max\(1,\s*\.\.\.trend\.map\(\(item\)\s*=>\s*Math\.abs\(item\.net\)\)\)/);
});
