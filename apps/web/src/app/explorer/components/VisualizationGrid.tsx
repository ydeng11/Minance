"use client";

import { TrendChart } from "./TrendChart";
import { CategoryBreakdown } from "./CategoryBreakdown";
import { AccountBreakdown } from "./AccountBreakdown";
import { MerchantAnalysis } from "./MerchantAnalysis";
import { SpendingHeatmap } from "./SpendingHeatmap";
import { Anomalies } from "./Anomalies";
import type { OverviewResponse, HeatmapItem, AnomalyItem } from "@/lib/api/types";

interface VisualizationGridProps {
  overview: OverviewResponse | null;
  heatmap: HeatmapItem[];
  anomalies: AnomalyItem[];
  onApplyMonthFilter: (month: string) => void;
  onCategoryClick: (category: string) => void;
  onAccountClick: (account: string) => void;
  onMerchantClick: (merchant: string) => void;
  loading?: boolean;
}

export function VisualizationGrid({
  overview,
  heatmap,
  anomalies,
  onApplyMonthFilter,
  onCategoryClick,
  onAccountClick,
  onMerchantClick,
  loading
}: VisualizationGridProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <TrendChart overview={overview} onApplyMonthFilter={onApplyMonthFilter} loading={loading} />
        <CategoryBreakdown overview={overview} onCategoryClick={onCategoryClick} loading={loading} />
        <AccountBreakdown overview={overview} onAccountClick={onAccountClick} loading={loading} />
        <MerchantAnalysis overview={overview} onMerchantClick={onMerchantClick} loading={loading} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <SpendingHeatmap heatmap={heatmap} loading={loading} />
        <Anomalies anomalies={anomalies} loading={loading} />
      </div>
    </div>
  );
}
