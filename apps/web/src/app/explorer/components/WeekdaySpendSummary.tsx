"use client";

import { cn, money } from "@/lib/utils";
import type { ExplorerAnalyticsResponse } from "@/lib/api/types";
import { getWeekdayHeatToneClassName, WEEKDAY_LABELS } from "./weekdayHeatmapPresentation";

interface WeekdaySpendSummaryProps {
  items: ExplorerAnalyticsResponse["weekdaySummary"]["items"];
  loading?: boolean;
}

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
        className="rounded-[28px] border border-neutral-900 bg-neutral-950/75 p-6"
        data-testid="explorer-weekday-summary"
      >
        <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Weekday Spend</h4>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-3xl bg-neutral-900" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      className="rounded-[28px] border border-neutral-900 bg-neutral-950/75 p-6"
      data-testid="explorer-weekday-summary"
    >
      <div className="flex items-end justify-between gap-4">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Weekday Spend</h4>
          <p className="mt-2 text-sm text-neutral-500">
            Stable weekday totals across the selected range.
          </p>
        </div>
        <div className="rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-400">
          Hover for totals
        </div>
      </div>

      {hasSpend ? (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
          {buckets.map((entry) => (
            <div key={entry.weekday} className="group relative">
              <div
                className={cn(
                  "flex min-h-[132px] items-end rounded-3xl py-4",
                  getWeekdayHeatToneClassName(entry.amount, maxAmount)
                )}
                data-testid="explorer-weekday-summary-cell"
                title={`${WEEKDAY_LABELS[entry.weekday]} • ${money(entry.amount)} • ${entry.count} transactions`}
                aria-label={`${WEEKDAY_LABELS[entry.weekday]} ${money(entry.amount)} ${entry.count} transactions`}
              >
                <div className="w-full min-w-0 px-1 text-center text-[10px] font-medium uppercase leading-none tracking-[0.16em] text-white">
                  {WEEKDAY_LABELS[entry.weekday]}
                </div>
              </div>

              {/* Tooltip */}
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm whitespace-nowrap group-hover:block">
                <div className="font-medium text-neutral-100">{WEEKDAY_LABELS[entry.weekday]}</div>
                <div className="text-neutral-300">{money(entry.amount)}</div>
                <div className="text-xs text-neutral-400">{entry.count} transactions</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-6 text-sm text-neutral-400">No spend data for range.</p>
      )}
    </section>
  );
}
