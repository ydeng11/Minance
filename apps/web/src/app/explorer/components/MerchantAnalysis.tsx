"use client";

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
    <div className="rounded-2xl border border-neutral-900 bg-neutral-950/70 p-6">
      <h3 className="text-sm font-medium text-neutral-300">Top Merchants</h3>
      <div className="mt-4 space-y-2" data-testid="analytics-merchant-bars">
        {merchants.slice(0, 8).map((entry) => (
          <button
            type="button"
            key={entry.merchant}
            onClick={() => onMerchantClick?.(entry.merchant)}
            className="flex w-full items-center justify-between rounded-md bg-neutral-900 px-3 py-2 text-left transition hover:bg-neutral-800"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-800 text-[10px] font-medium text-neutral-400">
                {entry.rank}
              </span>
              <span className="text-sm text-neutral-300">{entry.merchant}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-neutral-500">{entry.share.toFixed(1)}%</span>
              <strong className="text-sm text-neutral-100">{money(entry.amount)}</strong>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
