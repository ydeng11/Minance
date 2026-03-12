"use client";

import { ArrowDownRight, ArrowUpRight, CreditCard, Repeat, Wallet } from "lucide-react";
import { money } from "@/lib/utils";
import type { ExplorerAnalyticsResponse } from "@/lib/api/types";
import { ExplorerCard } from "./ExplorerCard";

interface ExplorerSummaryBandProps {
  summary: ExplorerAnalyticsResponse["summary"] | null;
  comparison: ExplorerAnalyticsResponse["comparison"] | null;
  loading?: boolean;
}

function formatDelta(delta: { delta: number; percent: number | null } | null | undefined, moneyMode = true) {
  if (!delta) {
    return "No comparison";
  }

  const prefix = delta.delta > 0 ? "+" : "";
  const value = moneyMode ? money(delta.delta) : `${prefix}${delta.delta}`;
  if (delta.percent == null) {
    return value;
  }
  return `${value} · ${prefix}${delta.percent}%`;
}

export function ExplorerSummaryBand({ summary, comparison, loading }: ExplorerSummaryBandProps) {
  const items = [
    {
      key: "spend",
      label: "Total Spend",
      value: summary ? money(summary.current.totalSpend) : "$0.00",
      delta: summary?.delta?.totalSpend || null,
      icon: CreditCard
    },
    {
      key: "income",
      label: "Total Income",
      value: summary ? money(summary.current.totalIncome) : "$0.00",
      delta: summary?.delta?.totalIncome || null,
      icon: ArrowDownRight
    },
    {
      key: "net",
      label: "Net Flow",
      value: summary ? money(summary.current.netFlow) : "$0.00",
      delta: summary?.delta?.netFlow || null,
      icon: Wallet
    },
    {
      key: "recurring",
      label: "Recurring Spend",
      value: summary ? money(summary.current.recurringSpend) : "$0.00",
      delta: summary?.delta?.recurringSpend || null,
      icon: Repeat
    },
    {
      key: "transactions",
      label: "Transactions",
      value: summary ? String(summary.current.transactionCount) : "0",
      delta: summary?.delta?.transactionCount || null,
      icon: ArrowUpRight,
      moneyMode: false
    }
  ];

  return (
    <div
      className="grid gap-4 md:grid-cols-2 xl:grid-cols-5"
      data-testid="explorer-summary-band"
    >
      {items.map((item) => (
        <ExplorerCard
          key={item.key}
          className="min-h-[164px]"
          contentClassName="flex h-full flex-col justify-between gap-6"
        >
          {loading ? (
            <div className="space-y-4">
              <div className="h-4 w-24 animate-pulse rounded-full bg-neutral-900" />
              <div className="h-10 w-32 animate-pulse rounded-2xl bg-neutral-900" />
              <div className="h-4 w-28 animate-pulse rounded-full bg-neutral-900" />
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-neutral-500">
                    {item.label}
                  </p>
                  <p className="mt-4 text-3xl font-semibold tracking-tight text-neutral-50">
                    {item.value}
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
                  <item.icon className="h-5 w-5" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-600">
                  {comparison?.enabled ? "vs previous period" : "current range"}
                </p>
                <p className="text-sm text-neutral-400">{formatDelta(item.delta, item.moneyMode !== false)}</p>
              </div>
            </>
          )}
        </ExplorerCard>
      ))}
    </div>
  );
}
