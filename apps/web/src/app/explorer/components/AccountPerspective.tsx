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
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-neutral-800 bg-neutral-950 px-4 text-sm font-medium text-neutral-200 transition hover:bg-neutral-900"
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
              <div key={index} className="h-16 animate-pulse rounded-2xl bg-neutral-900" />
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
                  "flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left transition",
                  selectedAccount === entry.accountId ||
                    selectedAccount === entry.accountKey ||
                    selectedAccount === entry.accountName
                    ? "border-emerald-400/30 bg-emerald-400/10"
                    : "border-neutral-900 bg-neutral-950/70 hover:border-neutral-800 hover:bg-neutral-900/80"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-900 text-neutral-300">
                    <Landmark className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-neutral-100">{entry.accountName}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.18em] text-neutral-500">
                      {entry.sourceInstitution || "Manual"} · {entry.transactionCount} transactions
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base font-semibold text-neutral-50">{money(entry.outflow)}</div>
                  <div className="mt-1 text-sm text-neutral-400">{entry.share.toFixed(1)}% of outflow</div>
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
