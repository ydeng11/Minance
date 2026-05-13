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

const SKELETON_ROW_CLASS = "h-16 animate-pulse rounded-2xl bg-surface-field";
const EMPTY_TEXT_CLASS = "text-sm text-text-secondary";
const HEADER_GRID_CLASS =
  "grid grid-cols-[minmax(0,2.1fr)_repeat(7,minmax(0,1fr))] gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted";
const ROW_BASE_CLASS =
  "grid w-full grid-cols-[minmax(0,2.1fr)_repeat(7,minmax(0,1fr))] gap-2 rounded-3xl border px-3 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg";
const MOBILE_ROW_CLASS =
  "w-full rounded-3xl border px-3 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg";
const ROW_ACTIVE_CLASS = "border-accent/35 bg-accent-soft";
const ROW_INACTIVE_CLASS = "border-border-subtle bg-surface-panel/70 hover:border-border-strong hover:bg-surface-elevated";
const CATEGORY_TITLE_CLASS = "text-sm font-semibold leading-snug text-text-primary";
const CATEGORY_META_CLASS = "mt-2 space-y-1 text-xs text-text-secondary";
const CATEGORY_META_LABEL_CLASS = "uppercase tracking-[0.16em] text-text-muted";
const CATEGORY_META_VALUE_CLASS = "text-text-primary";
const INSPECT_BADGE_CLASS =
  "mt-1 shrink-0 rounded-full border border-border-subtle bg-surface-field px-2 py-1 text-[11px] uppercase tracking-[0.18em] text-text-muted";
const HEATMAP_CELL_CLASS = "flex min-h-[56px] items-center justify-center rounded-2xl px-2";
const MOBILE_HEATMAP_CELL_CLASS = "min-h-11 rounded-2xl px-3 py-2";
const TOOLTIP_CLASS =
  "pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-border-subtle bg-surface-elevated px-3 py-2 text-sm shadow-panel group-hover:block";

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
            <div key={index} className={SKELETON_ROW_CLASS} />
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
        <p className={EMPTY_TEXT_CLASS}>No category spend data for the current filters.</p>
      </ExplorerCard>
    );
  }

  function renderCategorySummary(row: CategoryWeekdayHeatmapProps["rows"][number]) {
    return (
      <>
        <div className="min-w-0">
          <div className={CATEGORY_TITLE_CLASS}>
            {row.emoji ? `${row.emoji} ` : ""}
            {row.category}
          </div>
          <div className={CATEGORY_META_CLASS}>
            <div className="flex items-center gap-2">
              <span className={CATEGORY_META_LABEL_CLASS}>Spend</span>
              <span className={CATEGORY_META_VALUE_CLASS}>{money(row.totalSpend)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={CATEGORY_META_LABEL_CLASS}>Transactions</span>
              <span className={CATEGORY_META_VALUE_CLASS}>{row.transactionCount}</span>
            </div>
          </div>
        </div>
        <div className={INSPECT_BADGE_CLASS}>
          {selectedCategory === row.category ? "Inspecting" : "Inspect"}
        </div>
      </>
    );
  }

  return (
    <ExplorerCard
      testId="explorer-category-weekday-heatmap"
      title="Weekday Category Matrix"
      subtitle="Top filtered spend categories, compressed into weekday patterns."
    >
      <div className="space-y-2 md:hidden" data-testid="explorer-category-weekday-heatmap-mobile">
        {rows.map((row) => {
          const maxAmount = Math.max(0, ...row.cells.map((cell) => cell.amount));
          return (
            <button
              key={row.category}
              type="button"
              onClick={() => onCategorySelect(row.category)}
              className={cn(
                MOBILE_ROW_CLASS,
                selectedCategory === row.category ? ROW_ACTIVE_CLASS : ROW_INACTIVE_CLASS
              )}
              data-testid="explorer-category-weekday-heatmap-mobile-row"
            >
              <div className="flex min-w-0 items-start justify-between gap-3">
                {renderCategorySummary(row)}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {row.cells.map((cell) => (
                  <div
                    key={cell.weekday}
                    className={cn(
                      MOBILE_HEATMAP_CELL_CLASS,
                      getWeekdayHeatToneClassName(cell.amount, maxAmount)
                    )}
                    title={`${row.category} • ${WEEKDAY_LABELS[cell.weekday]} • ${money(cell.amount)} • ${cell.count} transactions`}
                    aria-label={`${row.category} ${WEEKDAY_LABELS[cell.weekday]} ${money(cell.amount)} ${cell.count} transactions`}
                  >
                    <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-muted">
                      {WEEKDAY_LABELS[cell.weekday]}
                    </div>
                    <div className="mt-1 text-xs font-medium text-text-primary">
                      {cell.count > 0 ? money(cell.amount) : "-"}
                    </div>
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      <div className="hidden md:block overflow-x-auto">
        <div>
          <div className={HEADER_GRID_CLASS}>
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
                    ROW_BASE_CLASS,
                    selectedCategory === row.category
                      ? ROW_ACTIVE_CLASS
                      : ROW_INACTIVE_CLASS
                  )}
                  data-testid="explorer-category-weekday-heatmap-row"
                >
                  <div className="flex min-w-0 items-start justify-between gap-3 px-1">
                    {renderCategorySummary(row)}
                  </div>

                  {row.cells.map((cell) => (
                    <div key={cell.weekday} className="group relative">
                      <div
                        className={cn(
                          HEATMAP_CELL_CLASS,
                          getWeekdayHeatToneClassName(cell.amount, maxAmount)
                        )}
                        title={`${row.category} • ${WEEKDAY_LABELS[cell.weekday]} • ${money(cell.amount)} • ${cell.count} transactions`}
                        aria-label={`${row.category} ${WEEKDAY_LABELS[cell.weekday]} ${money(cell.amount)} ${cell.count} transactions`}
                      >
                        <span className="text-xs font-medium text-text-primary">
                          {cell.count > 0 ? money(cell.amount) : ""}
                        </span>
                      </div>

                      <div className={TOOLTIP_CLASS}>
                        <div className="font-medium text-text-primary">{WEEKDAY_LABELS[cell.weekday]}</div>
                        <div className="text-text-secondary">{money(cell.amount)}</div>
                        <div className="text-xs text-text-muted">{cell.count} transactions</div>
                      </div>
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
