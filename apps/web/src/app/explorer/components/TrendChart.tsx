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

const FOCUS_RING_CLASS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg";
const BOARD_CLASS =
  "rounded-[32px] border border-border-subtle bg-surface-panel/85 p-6 shadow-panel";
const LOADING_TITLE_CLASS = "text-sm font-medium text-text-secondary";
const SKELETON_BAR_CLASS = "h-28 flex-1 animate-pulse rounded-2xl bg-surface-field";
const EYEBROW_CLASS = "text-[11px] font-semibold uppercase tracking-[0.24em] text-text-muted";
const TITLE_CLASS = "mt-2 font-display text-3xl font-semibold tracking-tight text-text-primary";
const DESCRIPTION_CLASS = "mt-2 text-sm text-text-secondary";
const RANGE_PILL_CLASS =
  "rounded-full border border-border-subtle bg-surface-field px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-text-secondary";
const MONTH_BUTTON_CLASS =
  `group flex min-w-[72px] flex-1 basis-0 flex-col items-center gap-3 rounded-[26px] ${FOCUS_RING_CLASS}`;
const MONTH_BARS_BASE_CLASS = "flex w-full items-end gap-1 rounded-[24px] border px-3 pb-3 pt-5 transition";
const MONTH_BARS_SELECTED_CLASS = "border-accent/35 bg-accent-soft";
const MONTH_BARS_IDLE_CLASS = "border-border-subtle bg-surface-field/70 hover:border-border-strong hover:bg-surface-elevated";
const SPEND_BAR_BASE_CLASS = "w-1/2 rounded-t-[14px] transition";
const SPEND_BAR_SELECTED_CLASS = "bg-accent";
const SPEND_BAR_IDLE_CLASS = "bg-accent/55 group-hover:bg-accent/70";
const INCOME_BAR_BASE_CLASS = "w-1/2 rounded-t-[14px] transition";
const INCOME_BAR_SELECTED_CLASS = "bg-text-primary";
const INCOME_BAR_IDLE_CLASS = "bg-text-muted group-hover:bg-text-secondary";
const MONTH_LABEL_CLASS = "text-[11px] font-medium uppercase tracking-[0.18em] group-hover:text-text-secondary";
const DETAIL_PANEL_CLASS = "mt-6 rounded-[24px] border border-border-subtle bg-surface-panel/70 p-5";
const DETAIL_EYEBROW_CLASS = "text-xs uppercase tracking-[0.18em] text-text-muted";
const DETAIL_TITLE_CLASS = "mt-2 font-display text-2xl font-semibold tracking-tight text-text-primary";
const APPLY_BUTTON_CLASS =
  `inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-border-subtle bg-surface-field px-4 text-sm font-medium text-text-primary transition hover:bg-surface-elevated ${FOCUS_RING_CLASS}`;
const METRIC_CARD_CLASS = "rounded-2xl border border-border-subtle bg-surface-field px-4 py-3";
const METRIC_LABEL_CLASS = "text-xs uppercase tracking-[0.18em] text-text-muted";
const METRIC_VALUE_CLASS = "mt-2 text-xl font-semibold text-text-primary";
const COMPOSITION_CARD_CLASS = "rounded-2xl border border-border-subtle bg-surface-field px-4 py-4";
const COMPOSITION_TITLE_CLASS = "text-sm font-medium text-text-primary";
const COMPOSITION_CATEGORY_CLASS = "truncate text-text-secondary";
const COMPOSITION_AMOUNT_CLASS = "text-right text-text-primary";
const EMPTY_COMPOSITION_CLASS = "text-sm text-text-muted";

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
      ariaLabel: `${formatMonthDetailLabel(entry.month)} trend summary: spend ${money(entry.spend)}, income ${money(entry.income)}, net ${money(entry.net)}`,
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
      <div className={BOARD_CLASS} data-testid="explorer-trend-board">
        <h3 className={LOADING_TITLE_CLASS}>Spending Trend</h3>
        <div className="mt-4 flex h-64 items-end gap-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className={SKELETON_BAR_CLASS} />
          ))}
        </div>
      </div>
    );
  }

  if (trendBars.length === 0) {
    return (
      <div className={BOARD_CLASS} data-testid="explorer-trend-board">
        <h3 className={LOADING_TITLE_CLASS}>Spending Trend</h3>
        <p className="mt-8 text-sm text-text-secondary">No trend data available.</p>
      </div>
    );
  }

  return (
    <div className={BOARD_CLASS} data-testid="explorer-trend-board">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className={EYEBROW_CLASS}>Trend board</div>
          <h3 className={TITLE_CLASS}>Spending Trend</h3>
          <p className={DESCRIPTION_CLASS}>
            Follow spend and income momentum across the selected range.
          </p>
        </div>
        <div className={RANGE_PILL_CLASS}>
          {rangeLabel}
        </div>
      </div>
      <div className="mt-8 overflow-x-auto pb-2">
        <div className="flex min-h-[260px] min-w-full items-end gap-4">
          {trendBars.map((item) => {
            const isSelected = selectedTrend?.month === item.month;

            return (
              <button
                key={item.month}
                type="button"
                onClick={() => setSelectedMonth(item.month)}
                data-testid={`explorer-trend-month-${item.month}`}
                aria-label={item.ariaLabel}
                className={MONTH_BUTTON_CLASS}
              >
                <div
                  className={cn(
                    MONTH_BARS_BASE_CLASS,
                    isSelected ? MONTH_BARS_SELECTED_CLASS : MONTH_BARS_IDLE_CLASS
                  )}
                >
                  <div
                    className={cn(
                      SPEND_BAR_BASE_CLASS,
                      isSelected ? SPEND_BAR_SELECTED_CLASS : SPEND_BAR_IDLE_CLASS
                    )}
                    style={{ height: item.spendHeight }}
                    title={`Spend: ${money(item.spend)}`}
                  />
                  <div
                    className={cn(
                      INCOME_BAR_BASE_CLASS,
                      isSelected ? INCOME_BAR_SELECTED_CLASS : INCOME_BAR_IDLE_CLASS
                    )}
                    style={{ height: item.incomeHeight }}
                    title={`Income: ${money(item.income)}`}
                  />
                </div>
                <div
                  className={cn(
                    MONTH_LABEL_CLASS,
                    isSelected ? "text-text-primary" : "text-text-muted"
                  )}
                >
                  {item.label}
                </div>
              </button>
            );
          })}
        </div>
      </div>
      {selectedTrend ? (
        <div
          className={DETAIL_PANEL_CLASS}
          data-testid="explorer-trend-detail"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className={DETAIL_EYEBROW_CLASS}>Month detail</div>
              <h4 className={DETAIL_TITLE_CLASS}>{selectedTrend.detailLabel}</h4>
              <p className={DESCRIPTION_CLASS}>
                Click a month to inspect its spend and income composition before drilling down.
              </p>
            </div>
            {onApplyMonthFilter ? (
              <button
                type="button"
                onClick={() => onApplyMonthFilter(selectedTrend.month)}
                data-testid="explorer-trend-apply-month"
                className={APPLY_BUTTON_CLASS}
              >
                Filter Explorer to {selectedTrend.label}
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className={METRIC_CARD_CLASS}>
              <div className={METRIC_LABEL_CLASS}>Spend</div>
              <div className={METRIC_VALUE_CLASS}>{money(selectedTrend.spend)}</div>
            </div>
            <div className={METRIC_CARD_CLASS}>
              <div className={METRIC_LABEL_CLASS}>Income</div>
              <div className={METRIC_VALUE_CLASS}>{money(selectedTrend.income)}</div>
            </div>
            <div className={METRIC_CARD_CLASS}>
              <div className={METRIC_LABEL_CLASS}>Net</div>
              <div className={METRIC_VALUE_CLASS}>{money(selectedTrend.net)}</div>
            </div>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            <div className={COMPOSITION_CARD_CLASS}>
              <div className={COMPOSITION_TITLE_CLASS}>Spend composition</div>
              <div className="mt-3 space-y-2">
                {selectedTrend.spendComposition.length ? selectedTrend.spendComposition.map((entry) => (
                  <div key={`spend-${entry.category}`} className="flex items-center justify-between gap-3 text-sm">
                    <span className={COMPOSITION_CATEGORY_CLASS}>
                      {entry.emoji ? `${entry.emoji} ` : ""}
                      {entry.category}
                    </span>
                    <span className={COMPOSITION_AMOUNT_CLASS}>
                      {money(entry.amount)} · {entry.share.toFixed(1)}%
                    </span>
                  </div>
                )) : (
                  <p className={EMPTY_COMPOSITION_CLASS}>No spend in this month.</p>
                )}
              </div>
            </div>
            <div className={COMPOSITION_CARD_CLASS}>
              <div className={COMPOSITION_TITLE_CLASS}>Income composition</div>
              <div className="mt-3 space-y-2">
                {selectedTrend.incomeComposition.length ? selectedTrend.incomeComposition.map((entry) => (
                  <div key={`income-${entry.category}`} className="flex items-center justify-between gap-3 text-sm">
                    <span className={COMPOSITION_CATEGORY_CLASS}>
                      {entry.emoji ? `${entry.emoji} ` : ""}
                      {entry.category}
                    </span>
                    <span className={COMPOSITION_AMOUNT_CLASS}>
                      {money(entry.amount)} · {entry.share.toFixed(1)}%
                    </span>
                  </div>
                )) : (
                  <p className={EMPTY_COMPOSITION_CLASS}>No income in this month.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
