"use client";

import { useEffect, useState } from "react";
import { BadgeDollarSign, Layers3 } from "lucide-react";
import { cn, money } from "@/lib/utils";
import type { ExplorerAnalyticsResponse, OverviewResponse } from "@/lib/api/types";
import { ExplorerCard } from "./ExplorerCard";
import { CategoryWeekdayHeatmap } from "./CategoryWeekdayHeatmap";
import { MerchantAnalysis } from "./MerchantAnalysis";
import { TrendChart } from "./TrendChart";

interface CategoryPerspectiveProps {
  overview: OverviewResponse | null;
  categories: ExplorerAnalyticsResponse["categories"]["items"];
  categoryWeekdayHeatmap: ExplorerAnalyticsResponse["categoryWeekdayHeatmap"]["items"];
  selectedCategories: string[];
  onCategoryClick: (category: string) => void;
  trend: ExplorerAnalyticsResponse["trend"]["items"];
  onApplyMonthFilter: (month: string) => void;
  onMerchantClick: (merchant: string) => void;
  loading?: boolean;
}

export function CategoryPerspective({
  overview,
  categories,
  categoryWeekdayHeatmap,
  selectedCategories,
  onCategoryClick,
  trend,
  onApplyMonthFilter,
  onMerchantClick,
  loading
}: CategoryPerspectiveProps) {
  const defaultInspectedCategory = categoryWeekdayHeatmap[0]?.category || categories[0]?.category || "";
  const [inspectedCategory, setInspectedCategory] = useState(
    selectedCategories[0] || defaultInspectedCategory
  );

  useEffect(() => {
    if (selectedCategories.length === 1) {
      setInspectedCategory(selectedCategories[0]);
      return;
    }

    const availableCategories = new Set([
      ...categoryWeekdayHeatmap.map((entry) => entry.category),
      ...categories.map((entry) => entry.category)
    ]);

    if (availableCategories.size === 0) {
      setInspectedCategory("");
      return;
    }

    setInspectedCategory((current) => {
      if (current && availableCategories.has(current)) {
        return current;
      }

      return defaultInspectedCategory;
    });
  }, [selectedCategories, defaultInspectedCategory, categoryWeekdayHeatmap, categories]);

  const activeCategory = categories.find((entry) => entry.category === inspectedCategory) || null;
  const selectedSet = new Set(selectedCategories);

  return (
    <div className="space-y-6" data-testid="explorer-category-view">
      <ExplorerCard
        testId="explorer-category-lens"
        title="Category Lens"
        subtitle={activeCategory
          ? `Focused on ${activeCategory.category}. Click another category to pivot the workspace.`
          : selectedCategories.length > 1
            ? `Comparing ${selectedCategories.length} categories within the current Explorer filters.`
            : "Choose a category to compare spend and income side by side, then inspect its net impact."}
      >
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-28 animate-pulse rounded-2xl bg-neutral-900" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {categories.slice(0, 8).map((entry) => (
              <button
                key={entry.category}
                type="button"
                onClick={() => setInspectedCategory(entry.category)}
                className={cn(
                  "rounded-2xl border px-4 py-4 text-left transition",
                  selectedSet.has(entry.category)
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
                      {entry.transactionCount || entry.count || 0} transactions
                    </div>
                  </div>
                  <Layers3 className="mt-0.5 h-4 w-4 text-neutral-500" />
                </div>
                <div className="mt-5 space-y-2">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-neutral-400">Spend</span>
                    <span className="font-semibold text-neutral-50">{money(entry.spend)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-neutral-400">Income</span>
                    <span className="font-semibold text-sky-200">{money(entry.income)}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
        {!loading && activeCategory ? (
          <div
            className="mt-4 rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-4"
            data-testid="explorer-category-lens-detail"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-100">
                  <BadgeDollarSign className="h-4 w-4" />
                  {activeCategory.emoji ? `${activeCategory.emoji} ` : ""}
                  {activeCategory.category}
                </div>
                <p className="mt-2 text-sm text-emerald-50/80">
                  Spend and income context for the current Explorer filters.
                </p>
              </div>
              <div className={cn(
                "rounded-full px-3 py-1 text-sm font-medium",
                activeCategory.net >= 0
                  ? "bg-sky-400/15 text-sky-100"
                  : "bg-rose-400/15 text-rose-100"
              )}>
                Net {money(activeCategory.net)}
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.18em] text-emerald-100/70">Spend</div>
                <div className="mt-2 text-xl font-semibold text-white">{money(activeCategory.spend)}</div>
                <div className="mt-1 text-sm text-emerald-50/75">{activeCategory.spendShare.toFixed(1)}% of total spend</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.18em] text-emerald-100/70">Income</div>
                <div className="mt-2 text-xl font-semibold text-white">{money(activeCategory.income)}</div>
                <div className="mt-1 text-sm text-emerald-50/75">{activeCategory.incomeShare.toFixed(1)}% of total income</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.18em] text-emerald-100/70">Net</div>
                <div className="mt-2 text-xl font-semibold text-white">{money(activeCategory.net)}</div>
                <div className="mt-1 text-sm text-emerald-50/75">Income minus spend</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.18em] text-emerald-100/70">Transactions</div>
                <div className="mt-2 text-xl font-semibold text-white">{activeCategory.transactionCount}</div>
                <div className="mt-1 text-sm text-emerald-50/75">Activity in the selected range</div>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => onCategoryClick(inspectedCategory)}
                className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-emerald-100 transition hover:border-emerald-300/40 hover:bg-emerald-400/15"
                data-testid="explorer-category-apply-filter"
              >
                {selectedCategories[0] === inspectedCategory
                  ? `Filtered to ${inspectedCategory}`
                  : `Filter Explorer to ${inspectedCategory}`}
              </button>
            </div>
          </div>
        ) : !loading && selectedCategories.length > 1 ? (
          <div className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-950/70 px-4 py-3 text-sm text-neutral-400">
            Multiple categories are active. Select a single category to inspect its spend, income, net, and transaction mix.
          </div>
        ) : !loading && categories.length > 0 ? (
          <div className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-950/70 px-4 py-3 text-sm text-neutral-400">
            Select a category above to inspect its spend, income, net, and transaction mix.
          </div>
        ) : null}
      </ExplorerCard>

      <CategoryWeekdayHeatmap
        rows={categoryWeekdayHeatmap}
        selectedCategory={inspectedCategory}
        onCategorySelect={setInspectedCategory}
        loading={loading}
      />

      <div data-testid="explorer-category-trend">
        <TrendChart
          overview={overview}
          trend={trend}
          onApplyMonthFilter={onApplyMonthFilter}
          loading={loading}
        />
      </div>

      <div data-testid="explorer-category-merchants">
        <MerchantAnalysis overview={overview} onMerchantClick={onMerchantClick} loading={loading} />
      </div>
    </div>
  );
}