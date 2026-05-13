"use client";

import { useMemo } from "react";
import { money } from "@/lib/utils";
import type { OverviewResponse } from "@/lib/api/types";

interface AccountBreakdownProps {
  overview: OverviewResponse | null;
  onAccountClick?: (account: string) => void;
  loading?: boolean;
}

const CARD_CLASS = "rounded-2xl border border-border-subtle bg-surface-panel/85 p-6 shadow-panel";
const TITLE_CLASS = "text-sm font-medium text-text-primary";
const SKELETON_ROW_CLASS = "h-10 animate-pulse rounded-md bg-surface-field";
const EMPTY_TEXT_CLASS = "mt-8 text-sm text-text-secondary";
const ROW_BUTTON_CLASS =
  "flex w-full items-center gap-3 rounded-md border border-border-subtle bg-surface-field px-3 py-2 text-left transition hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg";
const TRACK_CLASS = "h-2 w-16 overflow-hidden rounded-full bg-surface-elevated";
const BAR_CLASS = "h-full rounded-full bg-accent";

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
      <div className={CARD_CLASS}>
        <h3 className={TITLE_CLASS}>Accounts</h3>
        <div className="mt-4 space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className={SKELETON_ROW_CLASS} />
          ))}
        </div>
      </div>
    );
  }

  if (accountData.length === 0) {
    return (
      <div className={CARD_CLASS}>
        <h3 className={TITLE_CLASS}>Accounts</h3>
        <p className={EMPTY_TEXT_CLASS}>
          Account breakdown coming soon.
        </p>
      </div>
    );
  }

  return (
    <div className={CARD_CLASS}>
      <h3 className={TITLE_CLASS}>Accounts</h3>
      <div className="mt-4 space-y-2">
        {accountData.map((entry) => {
          const barWidth = `${Math.max(5, (entry.amount / maxAmount) * 100)}%`;
          return (
            <button
              type="button"
              key={entry.account}
              onClick={() => onAccountClick?.(entry.account)}
              className={ROW_BUTTON_CLASS}
            >
              <span className="flex-1 truncate text-sm text-text-secondary">{entry.account}</span>
              <div className="flex items-center gap-2">
                <div className={TRACK_CLASS}>
                  <div
                    className={BAR_CLASS}
                    style={{ width: barWidth }}
                  />
                </div>
                <strong className="w-20 text-right text-sm text-text-primary">
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
