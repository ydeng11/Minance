"use client";

import { ArrowRight, Landmark } from "lucide-react";
import { cn, money } from "@/lib/utils";
import type { ExplorerAnalyticsResponse, OverviewResponse } from "@/lib/api/types";
import { CategoryBreakdown } from "./CategoryBreakdown";
import { ExplorerCard } from "./ExplorerCard";
import { MerchantAnalysis } from "./MerchantAnalysis";
import { TrendChart } from "./TrendChart";

interface AccountPerspectiveProps {
  overview: OverviewResponse | null;
  trend: ExplorerAnalyticsResponse["trend"]["items"];
  accounts: ExplorerAnalyticsResponse["accounts"]["items"];
  selectedAccount: string;
  onAccountClick: (account: string) => void;
  onOpenTransactions: () => void;
  onApplyMonthFilter: (month: string) => void;
  onCategoryClick: (category: string) => void;
  onMerchantClick: (merchant: string) => void;
  loading?: boolean;
}

const FOCUS_RING_CLASS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg";
const HEADER_ACTION_CLASS =
  `inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-border-subtle bg-surface-field px-4 text-sm font-medium text-text-secondary transition hover:bg-surface-elevated hover:text-text-primary ${FOCUS_RING_CLASS}`;
const ACCOUNT_SKELETON_CLASS = "h-16 animate-pulse rounded-2xl bg-surface-field";
const ACCOUNT_BUTTON_CLASS =
  `flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left transition ${FOCUS_RING_CLASS}`;
const ACCOUNT_BUTTON_ACTIVE_CLASS = "border-accent/35 bg-accent-soft";
const ACCOUNT_BUTTON_INACTIVE_CLASS = "border-border-subtle bg-surface-panel/70 hover:border-border-strong hover:bg-surface-elevated";
const ACCOUNT_ICON_CLASS =
  "flex h-11 w-11 items-center justify-center rounded-2xl border border-border-subtle bg-surface-field text-text-secondary";
const ACCOUNT_TITLE_CLASS = "text-sm font-semibold text-text-primary";
const ACCOUNT_META_CLASS = "mt-1 text-xs uppercase tracking-[0.18em] text-text-muted";
const ACCOUNT_AMOUNT_CLASS = "text-base font-semibold text-text-primary";
const ACCOUNT_SHARE_CLASS = "mt-1 text-sm text-text-secondary";

export function AccountPerspective({
  overview,
  trend,
  accounts,
  selectedAccount,
  onAccountClick,
  onOpenTransactions,
  onApplyMonthFilter,
  onCategoryClick,
  onMerchantClick,
  loading
}: AccountPerspectiveProps) {
  const activeAccount = accounts.find(
    (entry) =>
      selectedAccount === entry.accountId ||
      selectedAccount === entry.accountKey ||
      selectedAccount === entry.accountName
  ) || null;

  return (
    <div className="space-y-6" data-testid="explorer-account-view">
      <ExplorerCard
        title="Account Lens"
        subtitle={activeAccount
          ? `Focused on ${activeAccount.accountName}. Pick another account to compare how spending shifts.`
          : "Follow the accounts driving outflow, then drill into categories and merchants from there."}
        headerAction={activeAccount ? (
          <button
            type="button"
            onClick={onOpenTransactions}
            data-testid="explorer-open-transactions"
            className={HEADER_ACTION_CLASS}
          >
            Transactions
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : null}
        testId="explorer-account-rankings"
      >
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className={ACCOUNT_SKELETON_CLASS} />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map((entry) => (
              <button
                key={entry.accountId || entry.accountKey}
                type="button"
                onClick={() => onAccountClick(entry.accountId || entry.accountKey || entry.accountName)}
                className={cn(
                  ACCOUNT_BUTTON_CLASS,
                  selectedAccount === entry.accountId ||
                    selectedAccount === entry.accountKey ||
                    selectedAccount === entry.accountName
                    ? ACCOUNT_BUTTON_ACTIVE_CLASS
                    : ACCOUNT_BUTTON_INACTIVE_CLASS
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={ACCOUNT_ICON_CLASS}>
                    <Landmark className="h-5 w-5" />
                  </div>
                  <div>
                    <div className={ACCOUNT_TITLE_CLASS}>{entry.accountName}</div>
                    <div className={ACCOUNT_META_CLASS}>
                      {entry.sourceInstitution || "Manual"} · {entry.transactionCount} transactions
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={ACCOUNT_AMOUNT_CLASS}>{money(entry.outflow)}</div>
                  <div className={ACCOUNT_SHARE_CLASS}>{entry.share.toFixed(1)}% of outflow</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </ExplorerCard>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div>
          <TrendChart
            overview={overview}
            trend={trend}
            onApplyMonthFilter={onApplyMonthFilter}
            loading={loading}
          />
        </div>
        <CategoryBreakdown overview={overview} onCategoryClick={onCategoryClick} loading={loading} />
      </div>

      <MerchantAnalysis overview={overview} onMerchantClick={onMerchantClick} loading={loading} />
    </div>
  );
}
