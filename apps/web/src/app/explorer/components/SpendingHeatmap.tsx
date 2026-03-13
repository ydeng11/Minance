"use client";

import { money } from "@/lib/utils";
import type { HeatmapItem } from "@/lib/api/types";

interface SpendingHeatmapProps {
  heatmap: HeatmapItem[];
  loading?: boolean;
}

export function SpendingHeatmap({ heatmap, loading }: SpendingHeatmapProps) {
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
        <div className="rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">
          49 cells
        </div>
      </div>
      <div className="mt-6 grid grid-cols-7 gap-2" data-testid="analytics-heatmap">
        {heatmap.length ? (
          heatmap.slice(0, 49).map((entry) => {
            const intensity = Math.min(0.9, Math.max(0.1, entry.amount / Math.max(...heatmap.map((item) => item.amount), 1)));
            return (
              <div
                key={`${entry.week}-${entry.weekday}`}
                className="grid aspect-square min-h-[42px] place-items-center rounded-2xl text-[11px] font-medium text-neutral-950"
                style={{ backgroundColor: `rgba(16, 185, 129, ${intensity})` }}
                title={`${entry.weekday}: ${money(entry.amount)}`}
              >
                {entry.weekday}
              </div>
            );
          })
        ) : (
          <p className="col-span-7 text-sm text-neutral-400">No spend data for range.</p>
        )}
      </div>
    </section>
  );
}
