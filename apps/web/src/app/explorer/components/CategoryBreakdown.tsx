"use client";

import { money } from "@/lib/utils";
import type { OverviewResponse } from "@/lib/api/types";

interface CategoryBreakdownProps {
  overview: OverviewResponse | null;
  onCategoryClick?: (category: string) => void;
  loading?: boolean;
}

const CARD_CLASS = "rounded-2xl border border-border-subtle bg-surface-panel/85 p-6 shadow-panel";
const TITLE_CLASS = "text-sm font-medium text-text-primary";
const SKELETON_ROW_CLASS = "h-10 animate-pulse rounded-md bg-surface-field";
const EMPTY_TEXT_CLASS = "mt-8 text-sm text-text-secondary";
const ROW_BUTTON_CLASS =
  "flex w-full items-center gap-3 rounded-md border border-border-subtle bg-surface-field px-3 py-2 text-left transition hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg";
const TRACK_CLASS = "h-2 w-16 overflow-hidden rounded-full bg-surface-elevated";
const BAR_CLASS = "h-full rounded-full bg-accent";

export function CategoryBreakdown({ overview, onCategoryClick, loading }: CategoryBreakdownProps) {
  const categories = overview?.topCategories || [];
  const maxAmount = Math.max(1, ...categories.map((c) => c.amount));

  if (loading) {
    return (
      <div className={CARD_CLASS}>
        <h3 className={TITLE_CLASS}>Categories</h3>
        <div className="mt-4 space-y-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className={SKELETON_ROW_CLASS} />
          ))}
        </div>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className={CARD_CLASS}>
        <h3 className={TITLE_CLASS}>Categories</h3>
        <p className={EMPTY_TEXT_CLASS}>No category data available.</p>
      </div>
    );
  }

  return (
    <div className={CARD_CLASS}>
      <h3 className={TITLE_CLASS}>Categories</h3>
      <div className="mt-4 space-y-2" data-testid="analytics-category-bars">
        {categories.slice(0, 8).map((entry) => {
          const barWidth = `${Math.max(5, (entry.amount / maxAmount) * 100)}%`;
          return (
            <button
              type="button"
              key={entry.category}
              onClick={() => onCategoryClick?.(entry.category)}
              className={ROW_BUTTON_CLASS}
            >
              <span className="flex-1 truncate text-sm text-text-secondary">
                {entry.emoji ? `${entry.emoji} ` : ""}
                {entry.category}
              </span>
              <div className="flex items-center gap-2">
                <div className={TRACK_CLASS}>
                  <div
                    className={BAR_CLASS}
                    style={{ width: barWidth }}
                  />
                </div>
                <strong className="w-20 text-right text-sm text-text-primary">
                  {money(entry.amount)}
                </strong>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
