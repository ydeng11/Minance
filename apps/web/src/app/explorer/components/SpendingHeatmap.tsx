"use client";

import { money } from "@/lib/utils";
import type { HeatmapItem } from "@/lib/api/types";
import {
  getWeekdayHeatToneClassName,
  WEEKDAY_HEAT_TONE_CLASS_NAMES,
  WEEKDAY_LABELS
} from "./weekdayHeatmapPresentation";

interface SpendingHeatmapProps {
  heatmap: HeatmapItem[];
  loading?: boolean;
}

const HEATMAP_PANEL_CLASS =
  "rounded-[28px] border border-border-subtle bg-surface-panel/85 p-6 shadow-panel";
const HEATMAP_TITLE_CLASS = "text-xs font-semibold uppercase tracking-wide text-text-muted";
const HEATMAP_DESCRIPTION_CLASS = "mt-2 text-sm text-text-secondary";
const HEATMAP_SKELETON_CLASS = "aspect-square animate-pulse rounded-2xl bg-surface-field";
const HEATMAP_LEGEND_CLASS =
  "flex items-center gap-2 rounded-full border border-border-subtle bg-surface-field px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted";
const HEATMAP_WEEKDAY_LABEL_CLASS =
  "mt-6 grid grid-cols-7 gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted";

export function SpendingHeatmap({ heatmap, loading }: SpendingHeatmapProps) {
  const weeks = Array.from(new Set(heatmap.map((entry) => entry.week))).slice(0, 7);
  const heatmapMap = new Map(heatmap.map((entry) => [`${entry.week}-${entry.weekday}`, entry]));
  const displayCells = weeks.flatMap((week) =>
    WEEKDAY_LABELS.map((_, weekday) => {
      return heatmapMap.get(`${week}-${weekday}`) || {
        week,
        weekday,
        amount: 0,
        count: 0
      };
    })
  );
  const maxAmount = Math.max(0, ...displayCells.map((entry) => entry.amount));

  if (loading) {
    return (
      <section className={HEATMAP_PANEL_CLASS}>
        <h4 className={HEATMAP_TITLE_CLASS}>Spending Heatmap</h4>
        <div className="mt-4 grid grid-cols-7 gap-2">
          {Array.from({ length: 49 }).map((_, index) => (
            <div key={index} className={HEATMAP_SKELETON_CLASS} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className={HEATMAP_PANEL_CLASS}>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h4 className={HEATMAP_TITLE_CLASS}>Spending Heatmap</h4>
          <p className={HEATMAP_DESCRIPTION_CLASS}>
            Daily intensity across the selected range.
          </p>
        </div>
        <div
          className={HEATMAP_LEGEND_CLASS}
          data-testid="analytics-heatmap-legend"
        >
          <span>Low</span>
          {WEEKDAY_HEAT_TONE_CLASS_NAMES.map((className, index) => (
            <span key={index} className={`h-3 w-3 rounded-full ${className}`} />
          ))}
          <span>High</span>
        </div>
      </div>
      <div
        className={HEATMAP_WEEKDAY_LABEL_CLASS}
        data-testid="analytics-heatmap-weekdays"
      >
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="text-center">
            {label}
          </div>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-7 gap-2" data-testid="analytics-heatmap">
        {displayCells.length ? (
          displayCells.map((entry) => (
            <div
              key={`${entry.week}-${entry.weekday}`}
              className={`aspect-square min-h-[42px] rounded-2xl ${getWeekdayHeatToneClassName(entry.amount, maxAmount)}`}
              title={`${WEEKDAY_LABELS[entry.weekday]} • ${entry.amount > 0 ? money(entry.amount) : "No spend"}`}
              role="img"
              aria-label={`${WEEKDAY_LABELS[entry.weekday]} ${entry.amount > 0 ? money(entry.amount) : "No spend"}`}
            />
          ))
        ) : (
          <p className="col-span-7 text-sm text-text-secondary">No spend data for range.</p>
        )}
      </div>
    </section>
  );
}
