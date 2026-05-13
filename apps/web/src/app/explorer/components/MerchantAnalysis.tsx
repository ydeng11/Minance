"use client";

import { buildMerchantPresentation } from "../presentation";
import { money } from "@/lib/utils";
import type { OverviewResponse } from "@/lib/api/types";

interface MerchantAnalysisProps {
  overview: OverviewResponse | null;
  onMerchantClick?: (merchant: string) => void;
  loading?: boolean;
}

const FOCUS_RING_CLASS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg";
const SHELL_CLASS =
  "rounded-[32px] border border-border-subtle bg-surface-panel/85 p-6 shadow-panel";
const LOADING_TITLE_CLASS = "text-sm font-medium text-text-secondary";
const SKELETON_ROW_CLASS = "h-10 animate-pulse rounded-2xl bg-surface-field";
const EYEBROW_CLASS = "text-[11px] font-semibold uppercase tracking-[0.24em] text-text-muted";
const TITLE_CLASS = "mt-2 font-display text-3xl font-semibold tracking-tight text-text-primary";
const DESCRIPTION_CLASS = "mt-2 text-sm text-text-secondary";
const EMPTY_TEXT_CLASS = "mt-8 text-sm text-text-secondary";
const MERCHANT_ROW_CLASS =
  `flex w-full items-center justify-between rounded-2xl border border-transparent px-1 py-4 text-left transition hover:border-border-subtle hover:bg-surface-field/60 ${FOCUS_RING_CLASS}`;
const MONOGRAM_CLASS =
  "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[18px] border border-border-subtle bg-surface-field text-xs font-semibold text-accent";
const RANK_PILL_CLASS =
  "rounded-full border border-border-subtle bg-surface-field px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-text-muted";
const MERCHANT_NAME_CLASS = "truncate text-sm font-semibold text-text-primary";
const MERCHANT_CAPTION_CLASS = "mt-1 truncate text-xs text-text-muted";
const MERCHANT_AMOUNT_CLASS = "font-display text-2xl font-semibold tracking-tight text-text-primary";
const MERCHANT_SHARE_CLASS = "mt-1 text-xs uppercase tracking-[0.14em] text-text-muted";

export function MerchantAnalysis({ overview, onMerchantClick, loading }: MerchantAnalysisProps) {
  const merchants = overview?.topMerchants || [];

  if (loading) {
    return (
      <div className={SHELL_CLASS}>
        <h3 className={LOADING_TITLE_CLASS}>Top Merchants</h3>
        <div className="mt-4 space-y-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className={SKELETON_ROW_CLASS} />
          ))}
        </div>
      </div>
    );
  }

  if (merchants.length === 0) {
    return (
      <div className={SHELL_CLASS}>
        <div className={EYEBROW_CLASS}>Merchant watchlist</div>
        <h3 className={TITLE_CLASS}>Top Merchants</h3>
        <p className={EMPTY_TEXT_CLASS}>No merchant data available.</p>
      </div>
    );
  }

  return (
    <div className={SHELL_CLASS}>
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className={EYEBROW_CLASS}>Merchant watchlist</div>
          <h3 className={TITLE_CLASS}>Top Merchants</h3>
          <p className={DESCRIPTION_CLASS}>
            Clean labels, quick scanning, and the original source string tucked underneath.
          </p>
        </div>
      </div>
      <div className="mt-4 space-y-2" data-testid="analytics-merchant-bars">
        <div data-testid="analytics-merchant-watchlist" className="space-y-2">
          {merchants.slice(0, 8).map((entry) => {
            const presentation = buildMerchantPresentation(entry.merchant);

            return (
              <button
                type="button"
                key={entry.merchant}
                onClick={() => onMerchantClick?.(entry.merchant)}
                className={MERCHANT_ROW_CLASS}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className={MONOGRAM_CLASS}>
                    {presentation.monogram}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={RANK_PILL_CLASS}>
                        #{entry.rank}
                      </span>
                      <span className={MERCHANT_NAME_CLASS}>
                        {presentation.displayName}
                      </span>
                    </div>
                    <div
                      className={MERCHANT_CAPTION_CLASS}
                      data-testid="analytics-merchant-caption"
                      title={presentation.caption}
                    >
                      {presentation.caption}
                    </div>
                  </div>
                </div>
                <div className="ml-4 text-right">
                  <div className={MERCHANT_AMOUNT_CLASS}>{money(entry.amount)}</div>
                  <div className={MERCHANT_SHARE_CLASS}>{entry.share.toFixed(1)}% of scoped spend</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
