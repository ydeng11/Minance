"use client";

import { cn, money } from "@/lib/utils";
import type { ExplorerAnalyticsResponse } from "@/lib/api/types";
import { getWeekdayHeatToneClassName, WEEKDAY_LABELS } from "./weekdayHeatmapPresentation";

interface WeekdaySpendSummaryProps {
  items: ExplorerAnalyticsResponse["weekdaySummary"]["items"];
  loading?: boolean;
}

const WEEKDAY_PANEL_CLASS =
  "rounded-[28px] border border-border-subtle bg-surface-panel/85 p-6 shadow-panel";
const WEEKDAY_TITLE_CLASS = "text-xs font-semibold uppercase tracking-wide text-text-muted";
const WEEKDAY_DESCRIPTION_CLASS = "mt-2 text-sm text-text-secondary";
const WEEKDAY_SKELETON_CLASS = "h-28 animate-pulse rounded-3xl bg-surface-field";
const WEEKDAY_HINT_CLASS =
  "rounded-full border border-border-subtle bg-surface-field px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted";
const WEEKDAY_CELL_BASE_CLASS = "flex min-h-[132px] items-end rounded-3xl py-4";
const WEEKDAY_CELL_LABEL_CLASS =
  "w-full min-w-0 px-1 text-center text-[10px] font-medium uppercase leading-none tracking-[0.16em] text-text-primary";
const WEEKDAY_TOOLTIP_CLASS =
  "pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-border-subtle bg-surface-elevated px-3 py-2 text-sm shadow-panel group-hover:block group-focus-visible:block";

export function WeekdaySpendSummary({ items, loading }: WeekdaySpendSummaryProps) {
  const bucketsByWeekday = new Map(items.map((entry) => [entry.weekday, entry]));
  const buckets = WEEKDAY_LABELS.map((_, weekday) => (
    bucketsByWeekday.get(weekday) || {
      weekday,
      amount: 0,
      count: 0
    }
  ));
  const maxAmount = Math.max(0, ...buckets.map((entry) => entry.amount));
  const hasSpend = buckets.some((entry) => entry.count > 0);

  if (loading) {
    return (
      <section
        className={WEEKDAY_PANEL_CLASS}
        data-testid="explorer-weekday-summary"
      >
        <h4 className={WEEKDAY_TITLE_CLASS}>Weekday Spend</h4>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={index} className={WEEKDAY_SKELETON_CLASS} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      className={WEEKDAY_PANEL_CLASS}
      data-testid="explorer-weekday-summary"
    >
      <div className="flex items-end justify-between gap-4">
        <div>
          <h4 className={WEEKDAY_TITLE_CLASS}>Weekday Spend</h4>
          <p className={WEEKDAY_DESCRIPTION_CLASS}>
            Stable weekday totals across the selected range.
          </p>
        </div>
        <div className={WEEKDAY_HINT_CLASS}>
          Hover for totals
        </div>
      </div>

      {hasSpend ? (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
          {buckets.map((entry) => (
            <div
              key={entry.weekday}
              className="group relative rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg"
              role="img"
              tabIndex={0}
              aria-label={`${WEEKDAY_LABELS[entry.weekday]} ${money(entry.amount)} ${entry.count} transactions`}
            >
              <div
                className={cn(
                  WEEKDAY_CELL_BASE_CLASS,
                  getWeekdayHeatToneClassName(entry.amount, maxAmount)
                )}
                data-testid="explorer-weekday-summary-cell"
                title={`${WEEKDAY_LABELS[entry.weekday]} • ${money(entry.amount)} • ${entry.count} transactions`}
                aria-hidden="true"
              >
                <div className={WEEKDAY_CELL_LABEL_CLASS}>
                  {WEEKDAY_LABELS[entry.weekday]}
                </div>
              </div>

              <div className={WEEKDAY_TOOLTIP_CLASS}>
                <div className="font-medium text-text-primary">{WEEKDAY_LABELS[entry.weekday]}</div>
                <div className="text-text-secondary">{money(entry.amount)}</div>
                <div className="text-xs text-text-muted">{entry.count} transactions</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-6 text-sm text-text-secondary">No spend data for range.</p>
      )}
    </section>
  );
}
