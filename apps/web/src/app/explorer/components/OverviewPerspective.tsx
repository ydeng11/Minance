"use client";

import type { ExplorerAnalyticsResponse, OverviewResponse } from "@/lib/api/types";
import { Anomalies } from "./Anomalies";
import { CategoryBreakdown } from "./CategoryBreakdown";
import { ExplorerComparisonPanel } from "./ExplorerComparisonPanel";
import { MerchantAnalysis } from "./MerchantAnalysis";
import { SpendingHeatmap } from "./SpendingHeatmap";
import { TrendChart } from "./TrendChart";

interface OverviewPerspectiveProps {
  overview: OverviewResponse | null;
  comparison: ExplorerAnalyticsResponse["comparison"] | null;
  heatmap: ExplorerAnalyticsResponse["heatmap"]["items"];
  anomalies: ExplorerAnalyticsResponse["anomalies"]["items"];
  onMonthClick: (month: string) => void;
  onCategoryClick: (category: string) => void;
  onMerchantClick: (merchant: string) => void;
  loading?: boolean;
}

export function OverviewPerspective({
  overview,
  comparison,
  heatmap,
  anomalies,
  onMonthClick,
  onCategoryClick,
  onMerchantClick,
  loading
}: OverviewPerspectiveProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.85fr)]">
        <div data-testid="explorer-overview-trend">
          <TrendChart overview={overview} onMonthClick={onMonthClick} loading={loading} />
        </div>
        <ExplorerComparisonPanel comparison={comparison} loading={loading} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="space-y-6">
          <CategoryBreakdown overview={overview} onCategoryClick={onCategoryClick} loading={loading} />
          <MerchantAnalysis overview={overview} onMerchantClick={onMerchantClick} loading={loading} />
        </div>

        <div className="space-y-6">
          <SpendingHeatmap heatmap={heatmap} loading={loading} />
          <Anomalies anomalies={anomalies} loading={loading} />
        </div>
      </div>
    </div>
  );
}
