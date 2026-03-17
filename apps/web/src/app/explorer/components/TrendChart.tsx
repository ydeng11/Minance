"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { cn, money } from "@/lib/utils";
import type { ExplorerAnalyticsResponse, OverviewResponse } from "@/lib/api/types";

interface TrendChartProps {
  overview: OverviewResponse | null;
  trend?: ExplorerAnalyticsResponse["trend"]["items"];
  rangeLabel?: string;
  onApplyMonthFilter?: (month: string) => void;
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

function formatMonthDetailLabel(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1, 1));

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric"
  }).format(date);
}

export function TrendChart({
  overview,
  trend,
  rangeLabel = "Selected range",
  onApplyMonthFilter,
  loading
}: TrendChartProps) {
  const trendBars = useMemo(() => {
    const sourceTrend = trend || overview?.trend || [];
    if (sourceTrend.length === 0) {
      return [];
    }

    const maxSpend = Math.max(1, ...sourceTrend.map((item) => item.spend));
    const maxIncome = Math.max(1, ...sourceTrend.map((item) => item.income));
    const includeYear = sourceTrend.length > 12;

    return sourceTrend.map((entry) => ({
      ...entry,
      label: formatMonthLabel(entry.month, includeYear),
      detailLabel: formatMonthDetailLabel(entry.month),
      spendComposition: "spendComposition" in entry && Array.isArray(entry.spendComposition) ? entry.spendComposition : [],
      incomeComposition: "incomeComposition" in entry && Array.isArray(entry.incomeComposition) ? entry.incomeComposition : [],
      spendHeight: Math.max(24, Math.round((entry.spend / maxSpend) * 220)),
      incomeHeight: Math.max(16, Math.round((entry.income / maxIncome) * 168))
    }));
  }, [overview, trend]);

  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  useEffect(() => {
    if (trendBars.length === 0) {
      queueMicrotask(() => setSelectedMonth(null));
      return;
    }

    queueMicrotask(() => {
      setSelectedMonth((current) =>
        current && trendBars.some((entry) => entry.month === current)
          ? current
          : trendBars[trendBars.length - 1]?.month ?? null
      );
    });
  }, [trendBars]);

  const selectedTrend = useMemo(
    () => trendBars.find((item) => item.month === selectedMonth) || trendBars[trendBars.length - 1] || null,
    [selectedMonth, trendBars]
  );

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
              onClick={() => setSelectedMonth(item.month)}
              data-testid={`explorer-trend-month-${item.month}`}
              className="group flex min-w-[72px] flex-1 basis-0 flex-col items-center gap-3"
            >
              <div
                className={cn(
                  "flex w-full items-end gap-1 rounded-[24px] border px-3 pb-3 pt-5 transition",
                  selectedTrend?.month === item.month
                    ? "border-emerald-400/40 bg-emerald-400/10"
                    : "border-neutral-900 bg-neutral-900/70"
                )}
              >
                <div
                  className={cn(
                    "w-1/2 rounded-t-[14px] transition",
                    selectedTrend?.month === item.month ? "bg-emerald-400" : "bg-emerald-500/85 hover:bg-emerald-400"
                  )}
                  style={{ height: item.spendHeight }}
                  title={`Spend: ${money(item.spend)}`}
                />
                <div
                  className={cn(
                    "w-1/2 rounded-t-[14px] transition",
                    selectedTrend?.month === item.month ? "bg-sky-300" : "bg-sky-400/75 hover:bg-sky-300"
                  )}
                  style={{ height: item.incomeHeight }}
                  title={`Income: ${money(item.income)}`}
                />
              </div>
              <div
                className={cn(
                  "text-[11px] font-medium uppercase tracking-[0.18em] group-hover:text-neutral-300",
                  selectedTrend?.month === item.month ? "text-neutral-200" : "text-neutral-500"
                )}
              >
                {item.label}
              </div>
            </button>
          ))}
        </div>
      </div>
      {selectedTrend ? (
        <div
          className="mt-6 rounded-[24px] border border-neutral-800 bg-neutral-900/70 p-5"
          data-testid="explorer-trend-detail"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Month detail</div>
              <h4 className="mt-2 text-xl font-semibold text-neutral-50">{selectedTrend.detailLabel}</h4>
              <p className="mt-2 text-sm text-neutral-400">
                Click a month to inspect its spend and income composition before drilling down.
              </p>
            </div>
            {onApplyMonthFilter ? (
              <button
                type="button"
                onClick={() => onApplyMonthFilter(selectedTrend.month)}
                data-testid="explorer-trend-apply-month"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-neutral-700 bg-neutral-950 px-4 text-sm font-medium text-neutral-100 transition hover:bg-neutral-900"
              >
                Filter Explorer to {selectedTrend.label}
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Spend</div>
              <div className="mt-2 text-xl font-semibold text-neutral-50">{money(selectedTrend.spend)}</div>
            </div>
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Income</div>
              <div className="mt-2 text-xl font-semibold text-neutral-50">{money(selectedTrend.income)}</div>
            </div>
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Net</div>
              <div className="mt-2 text-xl font-semibold text-neutral-50">{money(selectedTrend.net)}</div>
            </div>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-4">
              <div className="text-sm font-medium text-neutral-200">Spend composition</div>
              <div className="mt-3 space-y-2">
                {selectedTrend.spendComposition.length ? selectedTrend.spendComposition.map((entry) => (
                  <div key={`spend-${entry.category}`} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate text-neutral-300">
                      {entry.emoji ? `${entry.emoji} ` : ""}
                      {entry.category}
                    </span>
                    <span className="text-right text-neutral-100">
                      {money(entry.amount)} · {entry.share.toFixed(1)}%
                    </span>
                  </div>
                )) : (
                  <p className="text-sm text-neutral-500">No spend in this month.</p>
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-4">
              <div className="text-sm font-medium text-neutral-200">Income composition</div>
              <div className="mt-3 space-y-2">
                {selectedTrend.incomeComposition.length ? selectedTrend.incomeComposition.map((entry) => (
                  <div key={`income-${entry.category}`} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate text-neutral-300">
                      {entry.emoji ? `${entry.emoji} ` : ""}
                      {entry.category}
                    </span>
                    <span className="text-right text-neutral-100">
                      {money(entry.amount)} · {entry.share.toFixed(1)}%
                    </span>
                  </div>
                )) : (
                  <p className="text-sm text-neutral-500">No income in this month.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
