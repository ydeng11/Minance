import type { OverviewResponse } from "@/lib/api/types";

const DASHBOARD_BAR_COUNT_BY_RANGE: Record<string, number> = {
  "7d": 7,
  "14d": 14,
  "30d": 4,
  "90d": 3,
  "180d": 6,
  "1y": 12
};

interface BuildDashboardTrendBarsInput {
  range: string;
  trend: OverviewResponse["trend"] | null | undefined;
}

type DashboardTrendEntry = OverviewResponse["trend"][number];

export type DashboardTrendBar = DashboardTrendEntry & {
  barHeight: number;
  isPositive: boolean;
};

export function buildDashboardTrendBars({
  range,
  trend
}: BuildDashboardTrendBarsInput): DashboardTrendBar[] {
  const safeTrend = trend ?? [];
  const barCount = range === "all" ? Math.min(safeTrend.length, 24) : (DASHBOARD_BAR_COUNT_BY_RANGE[range] ?? 6);
  const maxAbsNet = Math.max(1, ...safeTrend.map((item) => Math.abs(item.net)));

  return safeTrend.slice(-barCount).map((entry) => ({
    ...entry,
    barHeight: Math.max(14, Math.round((Math.abs(entry.net) / maxAbsNet) * 120)),
    isPositive: entry.net >= 0
  }));
}
