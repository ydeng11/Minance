"use client";

import { useEffect, useRef, useState } from "react";
import { Layers3 } from "lucide-react";
import { cn, money } from "@/lib/utils";
import type { ExplorerAnalyticsResponse, OverviewResponse } from "@/lib/api/types";
import { ExplorerCard } from "./ExplorerCard";
import { MerchantAnalysis } from "./MerchantAnalysis";
import { SpendCompositionChart } from "./SpendCompositionChart";

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

const FOCUS_RING_CLASS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg";
const CATEGORY_SKELETON_CLASS = "h-28 animate-pulse rounded-2xl bg-surface-field";
const CATEGORY_BUTTON_CLASS =
  `rounded-2xl border px-4 py-4 text-left transition ${FOCUS_RING_CLASS}`;
const CATEGORY_BUTTON_ACTIVE_CLASS = "border-accent/35 bg-accent-soft";
const CATEGORY_BUTTON_INACTIVE_CLASS = "border-border-subtle bg-surface-panel/70 hover:border-border-strong hover:bg-surface-elevated";
const CATEGORY_TITLE_CLASS = "text-sm font-semibold text-text-primary";
const CATEGORY_META_CLASS = "mt-1 text-xs uppercase tracking-[0.18em] text-text-muted";
const CATEGORY_ICON_CLASS = "mt-0.5 h-4 w-4 text-text-muted";
const CATEGORY_STAT_LABEL_CLASS = "text-text-secondary";
const CATEGORY_STAT_VALUE_CLASS = "font-semibold text-text-primary";
const CATEGORY_INCOME_VALUE_CLASS = "font-semibold text-accent";
const EMPTY_MESSAGE_CLASS =
  "mt-4 rounded-2xl border border-border-subtle bg-surface-panel/70 px-4 py-3 text-sm text-text-secondary";

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
  const [inspectedCategory, setInspectedCategory] = useState(
    selectedCategories[0] || categoryWeekdayHeatmap[0]?.category || categories[0]?.category || ""
  );
  const prevSelectedCategoriesRef = useRef(selectedCategories);

  useEffect(() => {
    const prevSelectedCategories = prevSelectedCategoriesRef.current;
    prevSelectedCategoriesRef.current = selectedCategories;

    if (prevSelectedCategories === selectedCategories) {
      return;
    }

    if (selectedCategories.length === 1) {
      queueMicrotask(() => setInspectedCategory(selectedCategories[0]));
      return;
    }

    const fallback = categoryWeekdayHeatmap[0]?.category || categories[0]?.category || "";
    const availableCategories = new Set([
      ...categoryWeekdayHeatmap.map((entry) => entry.category),
      ...categories.map((entry) => entry.category)
    ]);

    if (availableCategories.size === 0) {
      queueMicrotask(() => setInspectedCategory(""));
      return;
    }

    queueMicrotask(() => {
      setInspectedCategory((current) => {
        if (current && availableCategories.has(current)) {
          return current;
        }
        return fallback;
      });
    });
  }, [selectedCategories, categoryWeekdayHeatmap, categories]);

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
              <div key={index} className={CATEGORY_SKELETON_CLASS} />
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
                  CATEGORY_BUTTON_CLASS,
                  selectedSet.has(entry.category)
                    ? CATEGORY_BUTTON_ACTIVE_CLASS
                    : CATEGORY_BUTTON_INACTIVE_CLASS
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className={CATEGORY_TITLE_CLASS}>
                      {entry.emoji ? `${entry.emoji} ` : ""}
                      {entry.category}
                    </div>
                    <div className={CATEGORY_META_CLASS}>
                      {entry.transactionCount || entry.count || 0} transactions
                    </div>
                  </div>
                  <Layers3 className={CATEGORY_ICON_CLASS} />
                </div>
                <div className="mt-5 space-y-2">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className={CATEGORY_STAT_LABEL_CLASS}>Spend</span>
                    <span className={CATEGORY_STAT_VALUE_CLASS}>{money(entry.spend)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className={CATEGORY_STAT_LABEL_CLASS}>Income</span>
                    <span className={CATEGORY_INCOME_VALUE_CLASS}>{money(entry.income)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className={CATEGORY_STAT_LABEL_CLASS}>Netflow</span>
                    <span className={cn("font-semibold", entry.net >= 0 ? "text-accent" : "text-danger")}>{money(entry.net)}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
        {!loading && !activeCategory && selectedCategories.length > 1 && (
          <div className={EMPTY_MESSAGE_CLASS}>
            Multiple categories are active. Select a single category to inspect its spend, income, net, and transaction mix.
          </div>
        )}
        {!loading && !activeCategory && selectedCategories.length <= 1 && categories.length > 0 && (
          <div className={EMPTY_MESSAGE_CLASS}>
            Select a category above to inspect its spend, income, net, and transaction mix.
          </div>
        )}
      </ExplorerCard>

      <SpendCompositionChart trend={trend} loading={loading} />

      <div data-testid="explorer-category-merchants">
        <MerchantAnalysis overview={overview} onMerchantClick={onMerchantClick} loading={loading} />
      </div>
    </div>
  );
}
