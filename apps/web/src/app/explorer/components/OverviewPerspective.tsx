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
  summary: ExplorerAnalyticsResponse["summary"] | null;
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
  summary,
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
      <div className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-8" data-testid="explorer-overview-trend">
          <TrendChart overview={overview} onMonthClick={onMonthClick} loading={loading} />
        </div>
        <div className="xl:col-span-4">
          <ExplorerComparisonPanel summary={summary} comparison={comparison} loading={loading} />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-7">
          <CategoryBreakdown overview={overview} onCategoryClick={onCategoryClick} loading={loading} />
        </div>
        <div className="space-y-6 xl:col-span-5">
          <SpendingHeatmap heatmap={heatmap} loading={loading} />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div>
          <MerchantAnalysis overview={overview} onMerchantClick={onMerchantClick} loading={loading} />
        </div>
        <div>
          <Anomalies anomalies={anomalies} loading={loading} />
        </div>
      </div>
    </div>
  );
}
