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

test("buildDashboardTrendBars returns 3m range slice with normalized bar metadata", () => {
  const result = buildDashboardTrendBars({
    range: "3m",
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

test("buildDashboardTrendBars returns 6m range slice (last 6 months)", () => {
  const result = buildDashboardTrendBars({
    range: "6m",
    trend: FULL_TREND
  });

  assert.equal(result.length, 6);
  assert.deepEqual(
    result.map((entry) => entry.month),
    ["2025-01", "2025-02", "2025-03", "2025-04", "2025-05", "2025-06"]
  );
});

test("buildDashboardTrendBars returns 12m range slice (last 12 months, or all if fewer)", () => {
  const result = buildDashboardTrendBars({
    range: "12m",
    trend: FULL_TREND
  });

  // 6 months of trend data < 12, so all are returned
  assert.equal(result.length, 6);
});

test("buildDashboardTrendBars returns 12 bars for last_year with 12-month trend", () => {
  const twelveMonthTrend = Array.from({ length: 12 }, (_, i) => ({
    month: `2025-${String(i + 1).padStart(2, "0")}`,
    spend: 100 + i,
    income: 200 + i,
    net: 100
  }));

  const result = buildDashboardTrendBars({
    range: "last_year",
    trend: twelveMonthTrend
  });

  assert.equal(result.length, 12);
  assert.equal(result[0]?.month, "2025-01");
  assert.equal(result[11]?.month, "2025-12");
});

test("buildDashboardTrendBars uses dynamic bar count for this_year", () => {
  // Simulate 4 months of data (Jan-Apr)
  const fourMonthTrend = [
    { month: "2025-01", spend: 100, income: 200, net: 100 },
    { month: "2025-02", spend: 150, income: 250, net: 100 },
    { month: "2025-03", spend: 200, income: 300, net: 100 },
    { month: "2025-04", spend: 250, income: 350, net: 100 }
  ];

  const result = buildDashboardTrendBars({
    range: "this_year",
    trend: fourMonthTrend
  });

  // this_year uses safeTrend.length, so all 4 months should appear
  assert.equal(result.length, 4);
  assert.deepEqual(
    result.map((entry) => entry.month),
    ["2025-01", "2025-02", "2025-03", "2025-04"]
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

test("buildDashboardTrendBars falls back to 6 bars for unknown range", () => {
  const result = buildDashboardTrendBars({
    range: "unknown_range",
    trend: FULL_TREND
  });

  // Unknown ranges fall back to 6 bars
  assert.equal(result.length, 6);
});
