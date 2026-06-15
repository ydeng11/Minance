"use client";

import { useMemo, useState } from "react";
import { cn, money } from "@/lib/utils";
import type { ExplorerAnalyticsResponse } from "@/lib/api/types";

interface SpendCompositionChartProps {
  trend?: ExplorerAnalyticsResponse["trend"]["items"];
  loading?: boolean;
}

/* ── Category color palette (OKLCH — works in both dark and light themes) ── */

const CATEGORY_CHART_COLORS = [
  "oklch(0.65 0.12 30)",   // warm red
  "oklch(0.62 0.13 70)",   // amber
  "oklch(0.68 0.14 120)",  // green
  "oklch(0.60 0.12 180)",  // teal
  "oklch(0.58 0.13 220)",  // blue
  "oklch(0.55 0.12 260)",  // indigo
  "oklch(0.60 0.12 300)",  // purple
  "oklch(0.65 0.11 340)",  // pink
  "oklch(0.63 0.10 150)",  // emerald
  "oklch(0.58 0.11 50)"    // orange
];

const COLOR_CACHE = new Map<string, string>();

function simpleHash(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function getCategoryColor(category: string): string {
  const cached = COLOR_CACHE.get(category);
  if (cached) return cached;

  const color = CATEGORY_CHART_COLORS[simpleHash(category) % CATEGORY_CHART_COLORS.length];
  COLOR_CACHE.set(category, color);
  return color;
}

/* ── Design tokens ── */

const FOCUS_RING_CLASS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg";
const BOARD_CLASS =
  "rounded-[32px] border border-border-subtle bg-surface-panel/85 p-6 shadow-panel";
const EYEBROW_CLASS = "text-[11px] font-semibold uppercase tracking-[0.24em] text-text-muted";
const TITLE_CLASS = "mt-2 font-display text-3xl font-semibold tracking-tight text-text-primary";
const DESCRIPTION_CLASS = "mt-2 text-sm text-text-secondary";
const LOADING_TITLE_CLASS = "text-sm font-medium text-text-secondary";
const SKELETON_BAR_CLASS = "h-28 flex-1 animate-pulse rounded-2xl bg-surface-field";
const TOGGLE_ACTIVE_CLASS = "rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent transition";
const TOGGLE_INACTIVE_CLASS = "rounded-full px-3 py-1 text-xs font-medium text-text-secondary transition hover:text-text-primary";

/* ── Helpers ── */

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

/** Round up to a nice tick value. */
function niceMax(value: number): number {
  if (value <= 0) return 100;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;

  if (normalized <= 1.5) return magnitude * 2;
  if (normalized <= 3) return magnitude * 4;
  if (normalized <= 5) return magnitude * 6;
  if (normalized <= 7) return magnitude * 8;
  return magnitude * 10;
}

/** Generate 4-5 nice tick values from 0 to max. */
function computeTicks(maxValue: number): number[] {
  const ceiling = niceMax(maxValue);
  const step = ceiling / 4;
  return [0, step, step * 2, step * 3, ceiling];
}

function formatTickValue(value: number): string {
  if (value === 0) return "$0";
  if (value >= 1000) {
    const k = value / 1000;
    return k === Math.floor(k) ? `$${k}k` : `$${k.toFixed(1)}k`;
  }
  return `$${Math.round(value)}`;
}

/* ── Component ── */

export function SpendCompositionChart({ trend, loading }: SpendCompositionChartProps) {
  const [displayMode, setDisplayMode] = useState<"absolute" | "percent">("absolute");

  const trendBars = useMemo(() => {
    const source = trend || [];
    if (source.length === 0) return [];

    const includeYear = source.length > 12;
    const maxSpend = Math.max(1, ...source.map((item) => item.spend));

    return source.map((entry) => ({
      ...entry,
      label: formatMonthLabel(entry.month, includeYear),
      detailLabel: formatMonthDetailLabel(entry.month),
      ariaLabel: `${formatMonthDetailLabel(entry.month)} spend summary: ${money(entry.spend)}`,
      spendComposition: entry.spendComposition || [],
      spendHeight: maxSpend
    }));
  }, [trend]);

  /* All unique categories across all months (preserving encounter order) */
  const allCategories = useMemo(() => {
    const seen = new Set<string>();
    for (const bar of trendBars) {
      for (const seg of bar.spendComposition) {
        if (!seen.has(seg.category)) {
          seen.add(seg.category);
        }
      }
    }
    return Array.from(seen);
  }, [trendBars]);

  const maxSpend = useMemo(
    () => Math.max(1, ...trendBars.map((bar) => bar.spend)),
    [trendBars]
  );

  const ticks = useMemo(() => computeTicks(maxSpend), [maxSpend]);
  const chartMax = ticks[ticks.length - 1] || maxSpend;

  /* Max bar height in pixels */
  const MAX_BAR_HEIGHT = 200;

  const tickLabelWidth = 56;

  if (loading) {
    return (
      <div className={BOARD_CLASS} data-testid="spend-composition-board">
        <h3 className={LOADING_TITLE_CLASS}>Spend Composition</h3>
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
      <div className={BOARD_CLASS} data-testid="spend-composition-board">
        <h3 className={LOADING_TITLE_CLASS}>Spend Composition</h3>
        <p className="mt-8 text-sm text-text-secondary">No spend data available.</p>
      </div>
    );
  }

  return (
    <div className={BOARD_CLASS} data-testid="spend-composition-board">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className={EYEBROW_CLASS}>Spend lens</div>
          <h3 className={TITLE_CLASS}>Spend Composition</h3>
          <p className={DESCRIPTION_CLASS}>
            Category-level breakdown of monthly spend across the selected range.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Display mode toggle */}
          <div
            className="flex rounded-full border border-border-subtle bg-surface-field p-0.5"
            role="radiogroup"
            aria-label="Stack display mode"
          >
            <button
              type="button"
              role="radio"
              aria-checked={displayMode === "absolute"}
              onClick={() => setDisplayMode("absolute")}
              className={cn(
                TOGGLE_ACTIVE_CLASS,
                displayMode !== "absolute" && TOGGLE_INACTIVE_CLASS
              )}
              data-testid="spend-chart-mode-absolute"
            >
              Absolute
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={displayMode === "percent"}
              onClick={() => setDisplayMode("percent")}
              className={cn(
                TOGGLE_ACTIVE_CLASS,
                displayMode !== "percent" && TOGGLE_INACTIVE_CLASS
              )}
              data-testid="spend-chart-mode-percent"
            >
              Percent
            </button>
          </div>
        </div>
      </div>

      {/* Chart area */}
      <div className="mt-8 overflow-x-auto pb-2">
        <div className="flex min-h-[260px] min-w-full items-end gap-0">
          {/* Y-axis */}
          <div
            className="flex shrink-0 flex-col justify-between py-0 text-right"
            style={{ width: tickLabelWidth, height: MAX_BAR_HEIGHT }}
          >
            {ticks.slice().reverse().map((tick) => (
              <span
                key={tick}
                className="text-[11px] leading-none text-text-muted"
              >
                {formatTickValue(tick)}
              </span>
            ))}
          </div>

          {/* Grid + bars */}
          <div className="relative min-w-0 flex-1">
            {/* Horizontal grid lines */}
            <div
              className="pointer-events-none absolute inset-0 flex flex-col justify-between"
              style={{ height: MAX_BAR_HEIGHT }}
            >
              {ticks.slice().reverse().map((tick, index) => (
                <div
                  key={tick}
                  className={cn(
                    "border-t",
                    index === ticks.length - 1 ? "border-border-subtle" : "border-border-subtle/40"
                  )}
                />
              ))}
            </div>

            {/* Bars */}
            <div
              className="relative flex items-end gap-3 px-2"
              style={{ height: MAX_BAR_HEIGHT }}
            >
              {trendBars.map((item) => {
                const hasComposition = item.spendComposition.length > 0;
                const barHeight = displayMode === "percent"
                  ? MAX_BAR_HEIGHT
                  : Math.max(12, Math.round((item.spend / chartMax) * MAX_BAR_HEIGHT));

                return (
                  <div
                    key={item.month}
                    className="group flex min-w-[52px] flex-1 flex-col items-center gap-2"
                  >
                    {/* Total spend label */}
                    <span className="whitespace-nowrap text-xs font-medium text-text-primary">
                      {money(item.spend)}
                    </span>

                    {/* Stacked bar */}
                    {hasComposition ? (
                      <div
                        className="flex w-full flex-col-reverse overflow-hidden rounded-t-xl border border-border-subtle"
                        style={{ height: barHeight }}
                      >
                        {(displayMode === "percent"
                          ? item.spendComposition
                          : item.spendComposition
                        ).map((seg) => {
                          const segFraction = displayMode === "percent"
                            ? (seg.share / 100)
                            : (seg.amount / chartMax);
                          const segHeight = Math.max(
                            2,
                            Math.round(segFraction * (displayMode === "percent" ? MAX_BAR_HEIGHT : barHeight))
                          );

                          return (
                            <div
                              key={seg.category}
                              style={{
                                height: segHeight,
                                backgroundColor: getCategoryColor(seg.category)
                              }}
                              title={`${seg.category}: ${money(seg.amount)} (${seg.share.toFixed(1)}%)`}
                            />
                          );
                        })}
                      </div>
                    ) : (
                      /* Fallback: solid bar */
                      <div
                        className="w-full rounded-t-xl border border-border-subtle bg-accent"
                        style={{ height: barHeight }}
                        title={`Spend: ${money(item.spend)}`}
                      />
                    )}

                    {/* Month label */}
                    <span
                      className={cn(
                        "text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted",
                        "group-hover:text-text-secondary"
                      )}
                    >
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Category legend */}
      {allCategories.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border-subtle pt-4">
          {allCategories.slice(0, 8).map((category) => (
            <div key={category} className="flex items-center gap-1.5">
              <div
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: getCategoryColor(category) }}
              />
              <span className="max-w-[120px] truncate text-xs text-text-secondary">
                {category}
              </span>
            </div>
          ))}
          {allCategories.length > 8 && (
            <span className="text-xs text-text-muted">
              +{allCategories.length - 8} more
            </span>
          )}
        </div>
      )}
    </div>
  );
}
