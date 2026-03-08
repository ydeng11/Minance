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
      <section className="rounded-xl border border-neutral-900 bg-neutral-950 p-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Spending Heatmap</h4>
        <div className="mt-3 grid grid-cols-7 gap-1.5">
          {Array.from({ length: 49 }).map((_, index) => (
            <div key={index} className="aspect-square animate-pulse rounded-md bg-neutral-900" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-neutral-900 bg-neutral-950 p-4">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Spending Heatmap</h4>
      <div className="mt-3 grid grid-cols-7 gap-1.5" data-testid="analytics-heatmap">
        {heatmap.length ? (
          heatmap.slice(0, 49).map((entry) => {
            const intensity = Math.min(0.9, Math.max(0.1, entry.amount / Math.max(...heatmap.map((item) => item.amount), 1)));
            return (
              <div
                key={`${entry.week}-${entry.weekday}`}
                className="grid aspect-square place-items-center rounded-md text-[11px] text-neutral-950"
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
