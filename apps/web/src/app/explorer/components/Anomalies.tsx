"use client";

import { money } from "@/lib/utils";
import type { AnomalyItem } from "@/lib/api/types";

interface AnomaliesProps {
  anomalies: AnomalyItem[];
  loading?: boolean;
}

export function Anomalies({ anomalies, loading }: AnomaliesProps) {
  if (loading) {
    return (
      <section className="rounded-xl border border-neutral-900 bg-neutral-950 p-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Anomalies</h4>
        <div className="mt-3 space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-10 animate-pulse rounded-md bg-neutral-900" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-neutral-900 bg-neutral-950 p-4">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Anomalies</h4>
      <div className="mt-3 space-y-2" data-testid="analytics-anomalies">
        {anomalies.length ? (
          anomalies.slice(0, 8).map((entry) => (
            <div key={entry.transactionId} className="flex items-center justify-between rounded-md bg-neutral-900 px-3 py-2 text-sm">
              <span className="text-neutral-300">{entry.transactionDate} · {entry.merchant} · {entry.emoji ? `${entry.emoji} ` : ""}{entry.category}</span>
              <strong className="text-neutral-100">{money(entry.amount)}</strong>
            </div>
          ))
        ) : (
          <p className="text-sm text-neutral-400">No anomalies detected.</p>
        )}
      </div>
    </section>
  );
}
