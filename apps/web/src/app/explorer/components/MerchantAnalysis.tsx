"use client";

import { buildMerchantPresentation } from "../presentation";
import { money } from "@/lib/utils";
import type { OverviewResponse } from "@/lib/api/types";

interface MerchantAnalysisProps {
  overview: OverviewResponse | null;
  onMerchantClick?: (merchant: string) => void;
  loading?: boolean;
}

export function MerchantAnalysis({ overview, onMerchantClick, loading }: MerchantAnalysisProps) {
  const merchants = overview?.topMerchants || [];

  if (loading) {
    return (
      <div className="rounded-2xl border border-neutral-900 bg-neutral-950/70 p-6">
        <h3 className="text-sm font-medium text-neutral-300">Top Merchants</h3>
        <div className="mt-4 space-y-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-10 animate-pulse rounded-md bg-neutral-900" />
          ))}
        </div>
      </div>
    );
  }

  if (merchants.length === 0) {
    return (
      <div className="rounded-2xl border border-neutral-900 bg-neutral-950/70 p-6">
        <h3 className="text-sm font-medium text-neutral-300">Top Merchants</h3>
        <p className="mt-8 text-sm text-neutral-400">No merchant data available.</p>
      </div>
    );
  }

  return (
    <div className="rounded-[28px] border border-neutral-900 bg-neutral-950/75 p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h3 className="text-sm font-medium text-neutral-300">Top Merchants</h3>
          <p className="mt-2 text-sm text-neutral-500">
            Clean labels, quick scanning, and the original source string tucked underneath.
          </p>
        </div>
      </div>
      <div className="mt-4 space-y-2" data-testid="analytics-merchant-bars">
        {merchants.slice(0, 8).map((entry) => {
          const presentation = buildMerchantPresentation(entry.merchant);
          return (
            <button
              type="button"
              key={entry.merchant}
              onClick={() => onMerchantClick?.(entry.merchant)}
              className="flex w-full items-center justify-between rounded-[22px] border border-neutral-900 bg-neutral-900/80 px-4 py-3 text-left transition hover:border-neutral-800 hover:bg-neutral-900"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-950 text-xs font-semibold text-emerald-200">
                  {presentation.monogram}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-neutral-800 bg-neutral-950 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-neutral-500">
                      #{entry.rank}
                    </span>
                    <span className="truncate text-sm font-semibold text-neutral-100">
                      {presentation.displayName}
                    </span>
                  </div>
                  <div
                    className="mt-1 truncate text-xs text-neutral-500"
                    data-testid="analytics-merchant-caption"
                    title={presentation.caption}
                  >
                    {presentation.caption}
                  </div>
                </div>
              </div>
              <div className="ml-4 text-right">
                <div className="text-sm font-semibold text-neutral-100">{money(entry.amount)}</div>
                <div className="mt-1 text-xs text-neutral-500">{entry.share.toFixed(1)}% of scoped spend</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
