import test from "node:test";
import assert from "node:assert/strict";

import { buildDashboardTrendBars } from "./dashboardPresentation";

const FULL_TREND = [
  { month: "2025-01", spend: 450, income: 820, net: 370 },
  { month: "2025-02", spend: 510, income: 700, net: 190 },
  { month: "2025-03", spend: 620, income: 210, net: -410 },
  { month: "2025-04", spend: 420, income: 910, net: 490 },
  { month: "2025-05", spend: 560, income: 80, net: -480 },
  { month: "2025-06", spend: 380, income: 120, net: -260 }
];

test("buildDashboardTrendBars returns the selected range slice with normalized bar metadata", () => {
  const result = buildDashboardTrendBars({
    range: "90d",
    trend: FULL_TREND
  });

  assert.deepEqual(
    result.map((entry) => entry.month),
    ["2025-04", "2025-05", "2025-06"]
  );
  assert.deepEqual(
    result.map((entry) => entry.isPositive),
    [true, false, false]
  );
  assert.deepEqual(
    result.map((entry) => entry.barHeight),
    [120, 118, 64]
  );
});

test("buildDashboardTrendBars caps the all range at the newest 24 entries", () => {
  const longTrend = Array.from({ length: 30 }, (_, index) => ({
    month: `2024-${String(index + 1).padStart(2, "0")}`,
    spend: index + 1,
    income: index + 2,
    net: index - 10
  }));

  const result = buildDashboardTrendBars({
    range: "all",
    trend: longTrend
  });

  assert.equal(result.length, 24);
  assert.equal(result[0]?.month, "2024-07");
  assert.equal(result[result.length - 1]?.month, "2024-30");
});
