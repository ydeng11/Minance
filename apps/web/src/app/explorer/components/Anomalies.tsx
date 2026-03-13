"use client";

import { buildMerchantPresentation } from "../presentation";
import { money } from "@/lib/utils";
import type { AnomalyItem } from "@/lib/api/types";

interface AnomaliesProps {
  anomalies: AnomalyItem[];
  loading?: boolean;
}

export function Anomalies({ anomalies, loading }: AnomaliesProps) {
  if (loading) {
    return (
      <section className="rounded-[28px] border border-neutral-900 bg-neutral-950/75 p-6">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Anomalies</h4>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-[22px] bg-neutral-900" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[28px] border border-neutral-900 bg-neutral-950/75 p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Anomalies</h4>
          <p className="mt-2 text-sm text-neutral-500">
            Outliers and new-spend behavior worth a second look.
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2" data-testid="analytics-anomalies">
        {anomalies.length ? (
          anomalies.slice(0, 8).map((entry) => {
            const presentation = buildMerchantPresentation(entry.merchant);
            const reasonLabel = entry.reason === "amount_outlier" ? "Amount outlier" : "New merchant spike";

            return (
              <article
                key={entry.transactionId}
                className="rounded-[22px] border border-neutral-900 bg-neutral-900/80 p-4"
                data-testid="analytics-anomaly-card"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-neutral-100">{presentation.displayName}</div>
                    <div className="mt-1 truncate text-xs text-neutral-500" title={presentation.caption}>
                      {presentation.caption}
                    </div>
                  </div>
                  <div className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-amber-200">
                    {reasonLabel}
                  </div>
                </div>

                <div className="mt-4 flex items-end justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-neutral-50">{money(entry.amount)}</div>
                    <div className="mt-1 text-xs text-neutral-500">
                      {entry.transactionDate} · {entry.emoji ? `${entry.emoji} ` : ""}{entry.category}
                    </div>
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <div className="rounded-[22px] border border-neutral-900 bg-neutral-900/70 p-4 text-sm text-neutral-400">
            No anomalies detected. Spending looks stable in this range.
          </div>
        )}
      </div>
    </section>
  );
}
