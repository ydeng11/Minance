"use client";

import { useMemo } from "react";
import { money } from "@/lib/utils";
import type { OverviewResponse } from "@/lib/api/types";

interface TrendChartProps {
  overview: OverviewResponse | null;
  rangeLabel?: string;
  onMonthClick?: (month: string) => void;
  loading?: boolean;
}

function formatMonthLabel(month: string, includeYear: boolean) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1, 1));

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    ...(includeYear ? { year: "2-digit" } : {})
  }).format(date);
}

export function TrendChart({ overview, rangeLabel = "Selected range", onMonthClick, loading }: TrendChartProps) {
  const trendBars = useMemo(() => {
    const trend = overview?.trend || [];
    if (trend.length === 0) return [];

    const maxSpend = Math.max(1, ...trend.map((item) => item.spend));
    const maxIncome = Math.max(1, ...trend.map((item) => item.income));
    const includeYear = trend.length > 12;

    return trend.map((entry) => ({
      ...entry,
      label: formatMonthLabel(entry.month, includeYear),
      spendHeight: Math.max(24, Math.round((entry.spend / maxSpend) * 220)),
      incomeHeight: Math.max(16, Math.round((entry.income / maxIncome) * 168))
    }));
  }, [overview]);

  if (loading) {
    return (
      <div className="rounded-[28px] border border-neutral-900 bg-neutral-950/75 p-6">
        <h3 className="text-sm font-medium text-neutral-300">Spending Trend</h3>
        <div className="mt-4 flex h-64 items-end gap-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-28 flex-1 animate-pulse rounded-2xl bg-neutral-900" />
          ))}
        </div>
      </div>
    );
  }

  if (trendBars.length === 0) {
    return (
      <div className="rounded-[28px] border border-neutral-900 bg-neutral-950/75 p-6">
        <h3 className="text-sm font-medium text-neutral-300">Spending Trend</h3>
        <p className="mt-8 text-sm text-neutral-400">No trend data available.</p>
      </div>
    );
  }

  return (
    <div className="rounded-[28px] border border-neutral-900 bg-neutral-950/75 p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h3 className="text-sm font-medium text-neutral-300">Spending Trend</h3>
          <p className="mt-2 text-sm text-neutral-500">
            Follow spend and income momentum across the selected range.
          </p>
        </div>
        <div className="rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">
          {rangeLabel}
        </div>
      </div>
      <div className="mt-8 overflow-x-auto pb-2">
        <div className="flex min-h-[260px] min-w-full items-end gap-4">
        {trendBars.map((item) => (
          <button
            key={item.month}
            type="button"
            onClick={() => onMonthClick?.(item.month)}
            className="group flex min-w-[72px] flex-1 basis-0 flex-col items-center gap-3"
          >
            <div className="flex w-full items-end gap-1 rounded-[24px] border border-neutral-900 bg-neutral-900/70 px-3 pb-3 pt-5">
              <div
                className="w-1/2 rounded-t-[14px] bg-emerald-500/85 transition hover:bg-emerald-400"
                style={{ height: item.spendHeight }}
                title={`Spend: ${money(item.spend)}`}
              />
              <div
                className="w-1/2 rounded-t-[14px] bg-sky-400/75 transition hover:bg-sky-300"
                style={{ height: item.incomeHeight }}
                title={`Income: ${money(item.income)}`}
              />
            </div>
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500 group-hover:text-neutral-300">
              {item.label}
            </div>
          </button>
        ))}
        </div>
      </div>
    </div>
  );
}
