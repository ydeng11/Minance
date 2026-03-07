"use client";

import { TrendChart } from "./TrendChart";
import { CategoryBreakdown } from "./CategoryBreakdown";
import { AccountBreakdown } from "./AccountBreakdown";
import { MerchantAnalysis } from "./MerchantAnalysis";
import type { OverviewResponse } from "@/lib/api/types";

interface VisualizationGridProps {
  overview: OverviewResponse | null;
  onMonthClick: (month: string) => void;
  onCategoryClick: (category: string) => void;
  onAccountClick: (account: string) => void;
  onMerchantClick: (merchant: string) => void;
  loading?: boolean;
}

export function VisualizationGrid({
  overview,
  onMonthClick,
  onCategoryClick,
  onAccountClick,
  onMerchantClick,
  loading
}: VisualizationGridProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <TrendChart overview={overview} onMonthClick={onMonthClick} loading={loading} />
      <CategoryBreakdown overview={overview} onCategoryClick={onCategoryClick} loading={loading} />
      <AccountBreakdown overview={overview} onAccountClick={onAccountClick} loading={loading} />
      <MerchantAnalysis overview={overview} onMerchantClick={onMerchantClick} loading={loading} />
    </div>
  );
}
