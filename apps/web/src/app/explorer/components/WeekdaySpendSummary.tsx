"use client";

import { money } from "@/lib/utils";
import type { ExplorerAnalyticsResponse } from "@/lib/api/types";

interface WeekdaySpendSummaryProps {
  items: ExplorerAnalyticsResponse["weekdaySummary"]["items"];
  loading?: boolean;
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const TONE_CLASS_NAMES = [
  "bg-neutral-900 ring-1 ring-inset ring-neutral-800",
  "bg-emerald-950 ring-1 ring-inset ring-emerald-900/80",
  "bg-emerald-800 ring-1 ring-inset ring-emerald-700/80",
  "bg-emerald-500 ring-1 ring-inset ring-emerald-400/80"
] as const;

function getToneClassName(amount: number, maxAmount: number) {
  if (amount <= 0 || maxAmount <= 0) {
    return TONE_CLASS_NAMES[0];
  }

  const ratio = amount / maxAmount;
  if (ratio < 0.34) {
    return TONE_CLASS_NAMES[1];
  }

  if (ratio < 0.67) {
    return TONE_CLASS_NAMES[2];
  }

  return TONE_CLASS_NAMES[3];
}

export function WeekdaySpendSummary({ items, loading }: WeekdaySpendSummaryProps) {
  const buckets = WEEKDAY_LABELS.map((_, weekday) => {
    return items.find((entry) => entry.weekday === weekday) || {
      weekday,
      amount: 0,
      count: 0
    };
  });
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
          Total spend pattern
        </div>
      </div>

      {hasSpend ? (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
          {buckets.map((entry) => (
            <div
              key={entry.weekday}
              className={`rounded-3xl px-4 py-4 ${getToneClassName(entry.amount, maxAmount)}`}
              data-testid="explorer-weekday-summary-cell"
              title={`${WEEKDAY_LABELS[entry.weekday]} • ${money(entry.amount)} • ${entry.count} transactions`}
              aria-label={`${WEEKDAY_LABELS[entry.weekday]} ${money(entry.amount)} ${entry.count} transactions`}
            >
              <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-400">
                {WEEKDAY_LABELS[entry.weekday]}
              </div>
              <div className="mt-4 text-lg font-semibold text-neutral-50">
                {money(entry.amount)}
              </div>
              <div className="mt-2 text-xs text-neutral-400">
                {entry.count} txns
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
