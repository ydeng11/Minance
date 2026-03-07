"use client";

import { money } from "@/lib/utils";
import type { OverviewResponse } from "@/lib/api/types";

interface CategoryBreakdownProps {
  overview: OverviewResponse | null;
  onCategoryClick?: (category: string) => void;
  loading?: boolean;
}

export function CategoryBreakdown({ overview, onCategoryClick, loading }: CategoryBreakdownProps) {
  const categories = overview?.topCategories || [];
  const maxAmount = Math.max(1, ...categories.map((c) => c.amount));

  if (loading) {
    return (
      <div className="rounded-2xl border border-neutral-900 bg-neutral-950/70 p-6">
        <h3 className="text-sm font-medium text-neutral-300">Categories</h3>
        <div className="mt-4 space-y-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-10 animate-pulse rounded-md bg-neutral-900" />
          ))}
        </div>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="rounded-2xl border border-neutral-900 bg-neutral-950/70 p-6">
        <h3 className="text-sm font-medium text-neutral-300">Categories</h3>
        <p className="mt-8 text-sm text-neutral-400">No category data available.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-neutral-900 bg-neutral-950/70 p-6">
      <h3 className="text-sm font-medium text-neutral-300">Categories</h3>
      <div className="mt-4 space-y-2">
        {categories.slice(0, 8).map((entry) => {
          const barWidth = `${Math.max(5, (entry.amount / maxAmount) * 100)}%`;
          return (
            <button
              type="button"
              key={entry.category}
              onClick={() => onCategoryClick?.(entry.category)}
              className="flex w-full items-center gap-3 rounded-md bg-neutral-900 px-3 py-2 text-left transition hover:bg-neutral-800"
            >
              <span className="flex-1 truncate text-sm text-neutral-300">
                {entry.emoji ? `${entry.emoji} ` : ""}
                {entry.category}
              </span>
              <div className="flex items-center gap-2">
                <div className="h-2 w-16 overflow-hidden rounded-full bg-neutral-800">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: barWidth }}
                  />
                </div>
                <strong className="w-20 text-right text-sm text-neutral-100">
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
