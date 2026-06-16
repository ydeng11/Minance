"use client";

import type { ExplorerAnalyticsResponse, OverviewResponse } from "@/lib/api/types";
import { CategoryBreakdown } from "./CategoryBreakdown";
import { MerchantAnalysis } from "./MerchantAnalysis";
import { TrendChart } from "./TrendChart";

interface OverviewPerspectiveProps {
  overview: OverviewResponse | null;
  trend: ExplorerAnalyticsResponse["trend"]["items"];
  trendRangeLabel: string;
  onApplyMonthFilter: (month: string) => void;
  onCategoryClick: (category: string) => void;
  onMerchantClick: (merchant: string) => void;
  loading?: boolean;
}

export function OverviewPerspective({
  overview,
  trend,
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

      <CategoryBreakdown
        overview={overview}
        onCategoryClick={onCategoryClick}
        loading={loading}
      />

      <MerchantAnalysis overview={overview} onMerchantClick={onMerchantClick} loading={loading} />
    </div>
  );
}
