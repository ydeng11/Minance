"use client";

import { money } from "@/lib/utils";
import type { HeatmapItem } from "@/lib/api/types";

interface SpendingHeatmapProps {
  heatmap: HeatmapItem[];
  loading?: boolean;
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const HEATMAP_TONE_CLASS_NAMES = [
  "bg-neutral-900 ring-1 ring-inset ring-neutral-800",
  "bg-emerald-950 ring-1 ring-inset ring-emerald-900/80",
  "bg-emerald-800 ring-1 ring-inset ring-emerald-700/80",
  "bg-emerald-500 ring-1 ring-inset ring-emerald-400/80"
] as const;

function getHeatmapToneClassName(amount: number, maxAmount: number) {
  if (amount <= 0 || maxAmount <= 0) {
    return HEATMAP_TONE_CLASS_NAMES[0];
  }

  const ratio = amount / maxAmount;
  if (ratio < 0.34) {
    return HEATMAP_TONE_CLASS_NAMES[1];
  }

  if (ratio < 0.67) {
    return HEATMAP_TONE_CLASS_NAMES[2];
  }

  return HEATMAP_TONE_CLASS_NAMES[3];
}

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
      <section className="rounded-[28px] border border-neutral-900 bg-neutral-950/75 p-6">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Spending Heatmap</h4>
        <div className="mt-4 grid grid-cols-7 gap-2">
          {Array.from({ length: 49 }).map((_, index) => (
            <div key={index} className="aspect-square animate-pulse rounded-2xl bg-neutral-900" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[28px] border border-neutral-900 bg-neutral-950/75 p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Spending Heatmap</h4>
          <p className="mt-2 text-sm text-neutral-500">
            Daily intensity across the selected range.
          </p>
        </div>
        <div
          className="flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-400"
          data-testid="analytics-heatmap-legend"
        >
          <span>Low</span>
          {HEATMAP_TONE_CLASS_NAMES.map((className, index) => (
            <span key={index} className={`h-3 w-3 rounded-full ${className}`} />
          ))}
          <span>High</span>
        </div>
      </div>
      <div
        className="mt-6 grid grid-cols-7 gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500"
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
              className={`aspect-square min-h-[42px] rounded-2xl ${getHeatmapToneClassName(entry.amount, maxAmount)}`}
              title={`${WEEKDAY_LABELS[entry.weekday]} • ${entry.amount > 0 ? money(entry.amount) : "No spend"}`}
              aria-label={`${WEEKDAY_LABELS[entry.weekday]} ${entry.amount > 0 ? money(entry.amount) : "No spend"}`}
            />
          ))
        ) : (
          <p className="col-span-7 text-sm text-neutral-400">No spend data for range.</p>
        )}
      </div>
    </section>
  );
}
