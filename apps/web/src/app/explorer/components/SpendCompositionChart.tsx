"use client";

import { useMemo, useState } from "react";
import { cn, money } from "@/lib/utils";
import type { ExplorerAnalyticsResponse } from "@/lib/api/types";

interface SpendCompositionChartProps {
  trend?: ExplorerAnalyticsResponse["trend"]["items"];
  loading?: boolean;
}

/* ── Category color palette (exact hex values from reference design) ── */

const CATEGORY_CHART_COLORS = [
  "#2f6ea5", // blue
  "#d7ac4f", // gold
  "#8fd0a6", // mint
  "#b7c794", // sage
  "#8151a3", // purple
  "#c45f90", // berry
  "#4aa08f", // teal
  "#e0c36a", // bright gold
  "#7da4d6", // sky
  "#d36f4b", // coral
  "#6ebd70", // green
  "#a783c9", // lavender
];

const OTHER_SPEND_CATEGORY = "Other spend";
const OTHER_SPEND_COLOR = "#54615d";
const COLOR_CACHE = new Map<string, string>();

function simpleHash(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function getCategoryColor(category: string): string {
  if (category === OTHER_SPEND_CATEGORY) return OTHER_SPEND_COLOR;
  const cached = COLOR_CACHE.get(category);
  if (cached) return cached;
  const color = CATEGORY_CHART_COLORS[simpleHash(category) % CATEGORY_CHART_COLORS.length];
  COLOR_CACHE.set(category, color);
  return color;
}

function buildCategoryColorMap(categories: string[]): Map<string, string> {
  const colorMap = new Map<string, string>();
  let paletteIndex = 0;

  for (const category of categories) {
    if (category === OTHER_SPEND_CATEGORY) {
      colorMap.set(category, OTHER_SPEND_COLOR);
      continue;
    }

    colorMap.set(category, CATEGORY_CHART_COLORS[paletteIndex % CATEGORY_CHART_COLORS.length]);
    paletteIndex += 1;
  }

  return colorMap;
}

/* ── Design tokens ── */

const BOARD_CLASS =
  "rounded-2xl border border-border-subtle bg-surface-panel p-6";
const EYEBROW_CLASS = "text-xs font-semibold tracking-wider uppercase text-accent";
const TITLE_CLASS = "text-xl font-bold tracking-tight text-text-primary mt-0.5";
const DESCRIPTION_CLASS = "text-xs text-text-secondary mt-1";
const LOADING_TITLE_CLASS = "text-sm font-medium text-text-secondary";
const SKELETON_BAR_CLASS = "h-28 flex-1 animate-pulse rounded-2xl bg-surface-field";
const TOGGLE_ACTIVE_CLASS = "rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent transition";
const TOGGLE_INACTIVE_CLASS = "rounded-full px-3 py-1 text-xs font-medium text-text-secondary transition hover:text-text-primary";

/* ── Chart dimensions (single source of truth) ──
 *
 * BAR_GRID_HEIGHT is the shared coordinate space for:
 *   - Y-axis tick positions
 *   - Grid line positions
 *   - Bar segment heights
 *
 * CHART_HEIGHT adds a label lane above that coordinate space so
 * top ticks and total labels cannot be clipped by the chart edge. */

const CHART_HEIGHT = 360;
const BAR_GRID_HEIGHT = 320;
const TOTAL_LABEL_HEIGHT = 14;
const TOTAL_LABEL_GAP = 8;
const PLOT_HEIGHT = CHART_HEIGHT;
const Y_AXIS_WIDTH = 48;
const BAR_MAX_WIDTH = 64;
const TOOLTIP_WIDTH = 192;
const TOOLTIP_GAP = 12;
const MIN_OTHER_AMOUNT = 0.01;

type TrendItem = ExplorerAnalyticsResponse["trend"]["items"][number];
type SpendCompositionSegment = NonNullable<TrendItem["spendComposition"]>[number];

/* ── Helpers ── */

function formatMonthLabel(month: string, includeYear: boolean) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1, 1));
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    ...(includeYear ? { year: "2-digit" } : {})
  }).format(date);
}

/** Round up to a clean ceiling that divides into even ticks. */
function niceMax(value: number): number {
  if (value <= 0) return 100;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const n = value / magnitude;

  if (n <= 1.2) return magnitude * 1.5;
  if (n <= 1.5) return magnitude * 2;
  if (n <= 2)   return magnitude * 2;
  if (n <= 3)   return magnitude * 3;
  if (n <= 4)   return magnitude * 4;
  if (n <= 5)   return magnitude * 5;
  if (n <= 6)   return magnitude * 6;
  if (n <= 8)   return magnitude * 8;
  if (n <= 10)  return magnitude * 10;
  return magnitude * 12;
}

/** Generate 7 nice tick values (6 intervals) from 0 to max. */
function computeTicks(maxValue: number): number[] {
  const ceiling = niceMax(maxValue);
  const step = ceiling / 6;
  return [0, step, step * 2, step * 3, step * 4, step * 5, ceiling];
}

function formatTickValue(value: number): string {
  if (value === 0) return "$0";
  if (value >= 1000) {
    const k = value / 1000;
    return k === Math.floor(k) ? `$${k}k` : `$${k.toFixed(1)}k`;
  }
  return `$${Math.round(value)}`;
}

function tickPosition(tick: number, chartMax: number): string {
  return `${(tick / chartMax) * BAR_GRID_HEIGHT}px`;
}

function buildSpendSegments(spend: number, composition: SpendCompositionSegment[]): SpendCompositionSegment[] {
  const segments = composition.filter((segment) => segment.amount > 0);
  const compositionTotal = segments.reduce((sum, segment) => sum + segment.amount, 0);
  const missingAmount = spend - compositionTotal;

  if (missingAmount <= MIN_OTHER_AMOUNT) {
    return segments;
  }

  return [
    ...segments,
    {
      category: OTHER_SPEND_CATEGORY,
      amount: missingAmount,
      share: spend > 0 ? (missingAmount / spend) * 100 : 0
    }
  ];
}

export function resolveTooltipSide(selectedIndex: number, totalBars: number): "left" | "right" {
  if (totalBars <= 1) return "right";
  return selectedIndex >= Math.floor(totalBars / 2) ? "left" : "right";
}

/* ── Component ── */

export function SpendCompositionChart({ trend, loading }: SpendCompositionChartProps) {
  const [displayMode, setDisplayMode] = useState<"absolute" | "percent">("absolute");
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const trendBars = useMemo(() => {
    const source = trend || [];
    if (source.length === 0) return [];
    const includeYear = source.length > 12;
    return source.map((entry) => ({
      ...entry,
      label: formatMonthLabel(entry.month, includeYear),
      ariaLabel: `${formatMonthLabel(entry.month, false)} spend: ${money(entry.spend)}`,
      spendComposition: entry.spendComposition || [],
    }));
  }, [trend]);

  const allCategories = useMemo(() => {
    const seen = new Set<string>();
    for (const bar of trendBars) {
      for (const seg of buildSpendSegments(bar.spend, bar.spendComposition)) {
        if (!seen.has(seg.category)) seen.add(seg.category);
      }
    }
    return Array.from(seen);
  }, [trendBars]);

  const categoryColors = useMemo(() => buildCategoryColorMap(allCategories), [allCategories]);

  const maxSpend = useMemo(
    () => Math.max(1, ...trendBars.map((bar) => bar.spend)),
    [trendBars]
  );

  const ticks = useMemo(() => computeTicks(maxSpend * 1.08), [maxSpend]);
  const chartMax = ticks[ticks.length - 1] || maxSpend;
  const chartGridTemplate = `repeat(${trendBars.length}, minmax(56px, 1fr))`;
  const selectedBar = selectedMonth
    ? trendBars.find((bar) => bar.month === selectedMonth)
    : null;
  const selectedBarIndex = selectedBar
    ? trendBars.findIndex((bar) => bar.month === selectedBar.month)
    : -1;
  const selectedTooltipSegments = selectedBar
    ? buildSpendSegments(selectedBar.spend, selectedBar.spendComposition).slice(0, 5)
    : [];
  const selectedTooltipSide = resolveTooltipSide(selectedBarIndex, trendBars.length);
  const tooltipSideOffset = (BAR_MAX_WIDTH / 2) + TOOLTIP_GAP + (TOOLTIP_WIDTH / 2);
  const colorForCategory = (category: string) => categoryColors.get(category) || getCategoryColor(category);

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
      <div className="mb-6">
        <span className={EYEBROW_CLASS}>Spend lens</span>
        <h3 className={TITLE_CLASS}>Spend Composition</h3>
        <p className={DESCRIPTION_CLASS}>
          Category-level breakdown of monthly spend across the selected range.
        </p>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        <div
          className="relative shrink-0 text-right font-mono text-[11px] leading-none text-text-muted"
          data-testid="spend-composition-y-axis"
          style={{ width: Y_AXIS_WIDTH, height: CHART_HEIGHT }}
        >
          <div className="absolute inset-x-0 bottom-0" style={{ height: PLOT_HEIGHT }}>
            {ticks.map((tick) => (
              <span
                key={tick}
                className="absolute right-0 translate-y-1/2"
                style={{ bottom: tickPosition(tick, chartMax) }}
              >
                {formatTickValue(tick)}
              </span>
            ))}
          </div>
        </div>

        <div className="min-w-[420px] flex-1">
          <div
            className="relative"
            data-testid="spend-composition-plot"
            style={{ height: PLOT_HEIGHT }}
          >
            {ticks.map((tick, index) => (
              <div
                key={tick}
                className={cn(
                  "pointer-events-none absolute left-0 w-full border-t border-border-subtle",
                  index === 0 ? "opacity-80" : index === ticks.length - 1 ? "opacity-60" : "opacity-30"
                )}
                data-testid={tick === 0 ? "spend-composition-zero-line" : undefined}
                style={{ bottom: tickPosition(tick, chartMax) }}
              />
            ))}

            <div
              className="relative grid h-full items-end gap-2 px-1 sm:gap-4"
              style={{ gridTemplateColumns: chartGridTemplate }}
            >
              {trendBars.map((item) => {
                const segments = buildSpendSegments(item.spend, item.spendComposition);
                const hasComposition = segments.length > 0;
                const isSelected = selectedMonth === item.month;
                const barHeight = displayMode === "percent"
                  ? BAR_GRID_HEIGHT
                  : Math.max(8, Math.round((item.spend / chartMax) * BAR_GRID_HEIGHT));
                const labelBottom = Math.min(
                  barHeight + TOTAL_LABEL_GAP,
                  BAR_GRID_HEIGHT + TOTAL_LABEL_GAP
                );
                const stackTotal = Math.max(
                  1,
                  segments.reduce((sum, segment) => sum + segment.amount, 0)
                );

                return (
                  <div
                    key={item.month}
                    className="group relative flex h-full items-end justify-center"
                    onMouseEnter={() => setSelectedMonth(item.month)}
                    onMouseLeave={() => setSelectedMonth(null)}
                    onMouseMove={() => setSelectedMonth(item.month)}
                    onPointerEnter={() => setSelectedMonth(item.month)}
                    onPointerLeave={() => setSelectedMonth(null)}
                    onPointerMove={() => setSelectedMonth(item.month)}
                  >
                    <span
                      className={cn(
                        "pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 whitespace-nowrap text-[11px] font-semibold leading-none tabular-nums transition-colors",
                        isSelected ? "text-text-primary" : "text-text-secondary"
                      )}
                      data-testid="spend-composition-total-label"
                      style={{ bottom: labelBottom, height: TOTAL_LABEL_HEIGHT }}
                    >
                      {money(item.spend)}
                    </span>

                    {hasComposition ? (
                      <div
                        className={cn(
                          "relative flex w-full flex-col-reverse overflow-hidden rounded-t-md border border-border-subtle/70 transition-all",
                          isSelected
                            ? "ring-2 ring-accent shadow-[0_0_26px_rgba(143,208,166,0.36)]"
                            : "group-hover:ring-2 group-hover:ring-accent/50"
                        )}
                        data-testid="spend-composition-bar"
                        style={{ height: barHeight, maxWidth: BAR_MAX_WIDTH }}
                      >
                        {segments.map((seg) => (
                          <div
                            key={seg.category}
                            className="w-full"
                            style={{
                              flexBasis: 0,
                              flexGrow: Math.max(seg.amount / stackTotal, 0.001),
                              minHeight: 2,
                              backgroundColor: colorForCategory(seg.category),
                            }}
                            title={`${seg.category}: ${money(seg.amount)} (${seg.share.toFixed(1)}%)`}
                          />
                        ))}
                      </div>
                    ) : (
                      <div
                        className={cn(
                          "w-full rounded-t-md border border-border-subtle/70 bg-accent/70 transition-all",
                          isSelected
                            ? "ring-2 ring-accent shadow-[0_0_26px_rgba(143,208,166,0.36)]"
                            : "group-hover:ring-2 group-hover:ring-accent/50"
                        )}
                        data-testid="spend-composition-bar"
                        style={{ height: barHeight, maxWidth: BAR_MAX_WIDTH }}
                        title={`Spend: ${money(item.spend)}`}
                      />
                    )}

                  </div>
                );
              })}
            </div>

            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 z-30 grid gap-2 px-1 sm:gap-4"
              data-testid="spend-composition-tooltip-layer"
              style={{ height: BAR_GRID_HEIGHT, gridTemplateColumns: chartGridTemplate }}
            >
              {trendBars.map((item) => (
                <div key={item.month} className="flex h-full items-center justify-center">
                  {selectedBar?.month === item.month && selectedTooltipSegments.length > 0 && (
                    <div
                      className="w-48 rounded-lg border border-border-subtle bg-surface-elevated/95 p-2.5 shadow-2xl backdrop-blur"
                      data-testid="spend-composition-tooltip"
                      data-tooltip-side={selectedTooltipSide}
                      style={{
                        transform: `translateX(${selectedTooltipSide === "right" ? tooltipSideOffset : -tooltipSideOffset}px)`
                      }}
                    >
                      <div className="space-y-1.5 font-mono text-[10px]">
                        {selectedTooltipSegments.map((seg) => (
                          <div key={seg.category} className="flex items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-1.5">
                              <span
                                className="h-2 w-2 shrink-0 rounded-full"
                                style={{ backgroundColor: colorForCategory(seg.category) }}
                              />
                              <span className="truncate text-text-secondary">{seg.category}</span>
                            </div>
                            <span className="shrink-0 text-text-primary">{seg.share.toFixed(1)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div
        className="mt-2 grid gap-2 px-1 sm:gap-4"
        style={{
          marginLeft: Y_AXIS_WIDTH + 12,
          gridTemplateColumns: chartGridTemplate
        }}
      >
        {trendBars.map((item) => {
          const isSelected = selectedMonth === item.month;
          return (
            <span
              key={item.month}
              className={cn(
                "text-center text-[10px] font-medium tracking-wider uppercase transition-colors",
                isSelected
                  ? "text-accent font-semibold"
                  : "text-text-muted"
              )}
            >
              {item.label}
            </span>
          );
        })}
      </div>

      {/* ──────────────── LEGEND ──────────────── */}
      {allCategories.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-border-subtle pt-4">
          {allCategories.slice(0, 10).map((category) => (
            <div key={category} className="flex items-center gap-1.5 text-xs text-text-secondary">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
                data-testid="spend-composition-legend-swatch"
                style={{ backgroundColor: colorForCategory(category) }}
              />
              {category}
            </div>
          ))}
          {allCategories.length > 10 && (
            <span className="text-xs text-text-muted">
              +{allCategories.length - 10} more
            </span>
          )}
        </div>
      )}

      {/* ──────────────── DISPLAY MODE TOGGLE ──────────────── */}
      <div className="mt-4 flex justify-end">
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
            className={displayMode === "absolute" ? TOGGLE_ACTIVE_CLASS : TOGGLE_INACTIVE_CLASS}
            data-testid="spend-chart-mode-absolute"
          >
            Absolute
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={displayMode === "percent"}
            onClick={() => setDisplayMode("percent")}
            className={displayMode === "percent" ? TOGGLE_ACTIVE_CLASS : TOGGLE_INACTIVE_CLASS}
            data-testid="spend-chart-mode-percent"
          >
            Percent
          </button>
        </div>
      </div>
    </div>
  );
}
