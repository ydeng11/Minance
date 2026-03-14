"use client";

import type { ExplorerAnalyticsResponse, OverviewResponse } from "@/lib/api/types";
import { Anomalies } from "./Anomalies";
import { CategoryBreakdown } from "./CategoryBreakdown";
import { MerchantAnalysis } from "./MerchantAnalysis";
import { SpendingHeatmap } from "./SpendingHeatmap";
import { TrendChart } from "./TrendChart";

interface OverviewPerspectiveProps {
  overview: OverviewResponse | null;
  trend: ExplorerAnalyticsResponse["trend"]["items"];
  heatmap: ExplorerAnalyticsResponse["heatmap"]["items"];
  anomalies: ExplorerAnalyticsResponse["anomalies"]["items"];
  trendRangeLabel: string;
  onApplyMonthFilter: (month: string) => void;
  onCategoryClick: (category: string) => void;
  onMerchantClick: (merchant: string) => void;
  loading?: boolean;
}

export function OverviewPerspective({
  overview,
  trend,
  heatmap,
  anomalies,
  trendRangeLabel,
  onApplyMonthFilter,
  onCategoryClick,
  onMerchantClick,
  loading
}: OverviewPerspectiveProps) {
  return (
    <div className="space-y-6">
      <div data-testid="explorer-overview-trend">
        <TrendChart
          overview={overview}
          trend={trend}
          rangeLabel={trendRangeLabel}
          onApplyMonthFilter={onApplyMonthFilter}
          loading={loading}
        />
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
