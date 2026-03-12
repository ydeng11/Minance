"use client";

import { BadgeDollarSign, Layers3 } from "lucide-react";
import { cn, money } from "@/lib/utils";
import type { OverviewResponse } from "@/lib/api/types";
import { CategoryBreakdown } from "./CategoryBreakdown";
import { ExplorerCard } from "./ExplorerCard";
import { MerchantAnalysis } from "./MerchantAnalysis";
import { TrendChart } from "./TrendChart";

interface CategoryPerspectiveProps {
  overview: OverviewResponse | null;
  selectedCategory: string;
  onCategoryClick: (category: string) => void;
  onMonthClick: (month: string) => void;
  onMerchantClick: (merchant: string) => void;
  loading?: boolean;
}

export function CategoryPerspective({
  overview,
  selectedCategory,
  onCategoryClick,
  onMonthClick,
  onMerchantClick,
  loading
}: CategoryPerspectiveProps) {
  const categories = overview?.topCategories || [];
  const activeCategory = categories.find((entry) => entry.category === selectedCategory) || null;

  return (
    <div className="space-y-6" data-testid="explorer-category-view">
      <ExplorerCard
        title="Category Lens"
        subtitle={selectedCategory
          ? `Focused on ${selectedCategory}. Click another category to pivot the workspace.`
          : "Choose a category to narrow the story, or scan the top categories to find the biggest movers."}
      >
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-20 animate-pulse rounded-2xl bg-neutral-900" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {categories.slice(0, 8).map((entry) => (
              <button
                key={entry.category}
                type="button"
                onClick={() => onCategoryClick(entry.category)}
                className={cn(
                  "rounded-2xl border px-4 py-4 text-left transition",
                  selectedCategory === entry.category
                    ? "border-emerald-400/30 bg-emerald-400/10"
                    : "border-neutral-900 bg-neutral-950/70 hover:border-neutral-800 hover:bg-neutral-900/80"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-neutral-100">
                      {entry.emoji ? `${entry.emoji} ` : ""}
                      {entry.category}
                    </div>
                    <div className="mt-1 text-xs uppercase tracking-[0.18em] text-neutral-500">
                      {entry.count || 0} transactions
                    </div>
                  </div>
                  <Layers3 className="mt-0.5 h-4 w-4 text-neutral-500" />
                </div>
                <div className="mt-5 flex items-end justify-between gap-3">
                  <div className="text-lg font-semibold text-neutral-50">{money(entry.amount)}</div>
                  <div className="text-sm text-neutral-400">{entry.share?.toFixed(1) || "0.0"}%</div>
                </div>
              </button>
            ))}
          </div>
        )}
        {!loading && activeCategory ? (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
            <BadgeDollarSign className="h-4 w-4" />
            {activeCategory.category} contributes {money(activeCategory.amount)} across the current range.
          </div>
        ) : null}
      </ExplorerCard>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div data-testid="explorer-category-trend">
          <TrendChart overview={overview} onMonthClick={onMonthClick} loading={loading} />
        </div>
        <CategoryBreakdown overview={overview} onCategoryClick={onCategoryClick} loading={loading} />
      </div>

      <div data-testid="explorer-category-merchants">
        <MerchantAnalysis overview={overview} onMerchantClick={onMerchantClick} loading={loading} />
      </div>
    </div>
  );
}
