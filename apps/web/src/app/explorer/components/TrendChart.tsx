"use client";

import { useMemo } from "react";
import { money } from "@/lib/utils";
import type { OverviewResponse } from "@/lib/api/types";

interface TrendChartProps {
  overview: OverviewResponse | null;
  onMonthClick?: (month: string) => void;
  loading?: boolean;
}

export function TrendChart({ overview, onMonthClick, loading }: TrendChartProps) {
  const trendBars = useMemo(() => {
    const trend = overview?.trend || [];
    if (trend.length === 0) return [];

    const maxSpend = Math.max(1, ...trend.map((item) => item.spend));
    const maxIncome = Math.max(1, ...trend.map((item) => item.income));

    return trend.slice(-6).map((entry) => ({
      ...entry,
      spendHeight: Math.max(14, Math.round((entry.spend / maxSpend) * 120)),
      incomeHeight: Math.max(10, Math.round((entry.income / maxIncome) * 90))
    }));
  }, [overview]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-neutral-900 bg-neutral-950/70 p-6">
        <h3 className="text-sm font-medium text-neutral-300">Spending Trend</h3>
        <div className="mt-4 flex h-40 items-end gap-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-20 flex-1 animate-pulse rounded-md bg-neutral-900" />
          ))}
        </div>
      </div>
    );
  }

  if (trendBars.length === 0) {
    return (
      <div className="rounded-2xl border border-neutral-900 bg-neutral-950/70 p-6">
        <h3 className="text-sm font-medium text-neutral-300">Spending Trend</h3>
        <p className="mt-8 text-sm text-neutral-400">No trend data available.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-neutral-900 bg-neutral-950/70 p-6">
      <h3 className="text-sm font-medium text-neutral-300">Spending Trend</h3>
      <div className="mt-4 flex items-end gap-2">
        {trendBars.map((item) => (
          <button
            key={item.month}
            type="button"
            onClick={() => onMonthClick?.(item.month)}
            className="group flex flex-1 flex-col items-center gap-2"
          >
            <div className="flex w-full items-end gap-0.5">
              <div
                className="w-1/2 rounded-t-md bg-emerald-500/80 transition hover:bg-emerald-400"
                style={{ height: item.spendHeight }}
                title={`Spend: ${money(item.spend)}`}
              />
              <div
                className="w-1/2 rounded-t-md bg-sky-400/70 transition hover:bg-sky-300"
                style={{ height: item.incomeHeight }}
                title={`Income: ${money(item.income)}`}
              />
            </div>
            <div className="text-[11px] text-neutral-400 group-hover:text-neutral-300">
              {item.month.slice(5)}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
