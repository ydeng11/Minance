"use client";

import { cn, money } from "@/lib/utils";
import type { ExplorerAnalyticsResponse } from "@/lib/api/types";
import { ExplorerCard } from "./ExplorerCard";
import { getWeekdayHeatToneClassName, WEEKDAY_LABELS } from "./weekdayHeatmapPresentation";

interface CategoryWeekdayHeatmapProps {
  rows: ExplorerAnalyticsResponse["categoryWeekdayHeatmap"]["items"];
  selectedCategory: string;
  onCategorySelect: (category: string) => void;
  loading?: boolean;
}

export function CategoryWeekdayHeatmap({
  rows,
  selectedCategory,
  onCategorySelect,
  loading
}: CategoryWeekdayHeatmapProps) {
  if (loading) {
    return (
      <ExplorerCard
        testId="explorer-category-weekday-heatmap"
        title="Weekday Category Matrix"
        subtitle="Comparing filtered categories by weekday."
      >
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-16 animate-pulse rounded-2xl bg-neutral-900" />
          ))}
        </div>
      </ExplorerCard>
    );
  }

  if (!rows.length) {
    return (
      <ExplorerCard
        testId="explorer-category-weekday-heatmap"
        title="Weekday Category Matrix"
        subtitle="Comparing filtered categories by weekday."
      >
        <p className="text-sm text-neutral-400">No category spend data for the current filters.</p>
      </ExplorerCard>
    );
  }

  return (
    <ExplorerCard
      testId="explorer-category-weekday-heatmap"
      title="Weekday Category Matrix"
      subtitle="Top filtered spend categories, compressed into weekday patterns."
    >
      <div className="overflow-x-auto">
        <div className="min-w-[860px]">
          <div className="grid grid-cols-[minmax(0,2.1fr)_repeat(7,minmax(0,1fr))] gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
            <div className="px-4 py-2">Category</div>
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="px-2 py-2 text-center">
                {label}
              </div>
            ))}
          </div>

          <div className="mt-3 space-y-2">
            {rows.map((row) => {
              const maxAmount = Math.max(0, ...row.cells.map((cell) => cell.amount));
              return (
                <button
                  key={row.category}
                  type="button"
                  onClick={() => onCategorySelect(row.category)}
                  className={cn(
                    "grid w-full grid-cols-[minmax(0,2.1fr)_repeat(7,minmax(0,1fr))] gap-2 rounded-3xl border px-3 py-3 text-left transition",
                    selectedCategory === row.category
                      ? "border-emerald-400/30 bg-emerald-400/10"
                      : "border-neutral-900 bg-neutral-950/70 hover:border-neutral-800 hover:bg-neutral-900/80"
                  )}
                  data-testid="explorer-category-weekday-heatmap-row"
                >
                  <div className="flex min-w-0 items-start justify-between gap-3 px-1">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold leading-snug text-neutral-100">
                        {row.emoji ? `${row.emoji} ` : ""}
                        {row.category}
                      </div>
                      <div className="mt-2 space-y-1 text-xs text-neutral-400">
                        <div className="flex items-center gap-2">
                          <span className="uppercase tracking-[0.16em] text-neutral-500">Spend</span>
                          <span className="text-neutral-200">{money(row.totalSpend)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="uppercase tracking-[0.16em] text-neutral-500">Transactions</span>
                          <span className="text-neutral-200">{row.transactionCount}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-1 shrink-0 rounded-full border border-neutral-800 bg-neutral-900 px-2 py-1 text-[11px] uppercase tracking-[0.18em] text-neutral-400">
                      {selectedCategory === row.category ? "Inspecting" : "Inspect"}
                    </div>
                  </div>

                  {row.cells.map((cell) => (
                    <div
                      key={cell.weekday}
                      className={cn(
                        "flex min-h-[56px] items-center justify-center rounded-2xl px-2",
                        getWeekdayHeatToneClassName(cell.amount, maxAmount)
                      )}
                      title={`${row.category} • ${WEEKDAY_LABELS[cell.weekday]} • ${money(cell.amount)} • ${cell.count} transactions`}
                      aria-label={`${row.category} ${WEEKDAY_LABELS[cell.weekday]} ${money(cell.amount)} ${cell.count} transactions`}
                    >
                      <span className="text-xs font-medium text-neutral-200">
                        {cell.count > 0 ? money(cell.amount) : ""}
                      </span>
                    </div>
                  ))}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </ExplorerCard>
  );
}
