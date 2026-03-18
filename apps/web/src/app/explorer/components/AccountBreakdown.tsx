"use client";

import { useMemo } from "react";
import { money } from "@/lib/utils";
import type { OverviewResponse } from "@/lib/api/types";

interface AccountBreakdownProps {
  overview: OverviewResponse | null;
  onAccountClick?: (account: string) => void;
  loading?: boolean;
}

// Mock account data based on trend data - in a real implementation,
// this would come from the API. For now we derive from the trend.
export function AccountBreakdown({ overview, onAccountClick, loading }: AccountBreakdownProps) {
  // Since the overview API doesn't include account breakdown,
  // we'll create a placeholder that can be enhanced later
  const accountData = useMemo(() => {
    // This is a placeholder - ideally the API would return account breakdown
    return [] as Array<{ account: string; amount: number }>;
  }, []);

  const maxAmount = Math.max(1, ...accountData.map((a) => a.amount));

  if (loading) {
    return (
      <div className="rounded-2xl border border-neutral-900 bg-neutral-950/70 p-6">
        <h3 className="text-sm font-medium text-neutral-300">Accounts</h3>
        <div className="mt-4 space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-10 animate-pulse rounded-md bg-neutral-900" />
          ))}
        </div>
      </div>
    );
  }

  if (accountData.length === 0) {
    return (
      <div className="rounded-2xl border border-neutral-900 bg-neutral-950/70 p-6">
        <h3 className="text-sm font-medium text-neutral-300">Accounts</h3>
        <p className="mt-8 text-sm text-neutral-400">
          Account breakdown coming soon.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-neutral-900 bg-neutral-950/70 p-6">
      <h3 className="text-sm font-medium text-neutral-300">Accounts</h3>
      <div className="mt-4 space-y-2">
        {accountData.map((entry) => {
          const barWidth = `${Math.max(5, (entry.amount / maxAmount) * 100)}%`;
          return (
            <button
              type="button"
              key={entry.account}
              onClick={() => onAccountClick?.(entry.account)}
              className="flex w-full items-center gap-3 rounded-md bg-neutral-900 px-3 py-2 text-left transition hover:bg-neutral-800"
            >
              <span className="flex-1 truncate text-sm text-neutral-300">{entry.account}</span>
              <div className="flex items-center gap-2">
                <div className="h-2 w-16 overflow-hidden rounded-full bg-neutral-800">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: barWidth }}
                  />
                </div>
                <strong className="w-20 text-right text-sm text-neutral-100">
                  {money(entry.amount)}
                </strong>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
