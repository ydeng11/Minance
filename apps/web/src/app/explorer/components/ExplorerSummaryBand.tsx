"use client";

import { ArrowDownRight, CreditCard, Repeat, Wallet } from "lucide-react";
import { buildSummarySecondaryState } from "../presentation";
import { money } from "@/lib/utils";
import type { ExplorerAnalyticsResponse } from "@/lib/api/types";
import { ExplorerCard } from "./ExplorerCard";
import { ExplorerMiniSparkline } from "./ExplorerMiniSparkline";

interface ExplorerSummaryBandProps {
  summary: ExplorerAnalyticsResponse["summary"] | null;
  comparison: ExplorerAnalyticsResponse["comparison"] | null;
  loading?: boolean;
}

function formatDelta(delta: { delta: number; percent: number | null } | null | undefined, moneyMode = true) {
  if (!delta) {
    return null;
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
      icon: CreditCard,
      sparklineKey: "spend" as const
    },
    {
      key: "income",
      label: "Total Income",
      value: summary ? money(summary.current.totalIncome) : "$0.00",
      delta: summary?.delta?.totalIncome || null,
      icon: ArrowDownRight,
      sparklineKey: "income" as const
    },
    {
      key: "net",
      label: "Net Flow",
      value: summary ? money(summary.current.netFlow) : "$0.00",
      delta: summary?.delta?.netFlow || null,
      icon: Wallet,
      sparklineKey: "net" as const
    },
    {
      key: "recurring",
      label: "Recurring Spend",
      value: summary ? money(summary.current.recurringSpend) : "$0.00",
      delta: summary?.delta?.recurringSpend || null,
      icon: Repeat,
      sparklineKey: null
    }
  ];

  return (
    <div
      className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
      data-testid="explorer-summary-band"
    >
      {items.map((item) => (
        <ExplorerCard
          key={item.key}
          className="min-h-[196px]"
          contentClassName="flex h-full flex-col justify-between gap-7"
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
                  <p
                    className={
                      item.key === "net" && (summary?.current.netFlow || 0) < 0
                        ? "mt-4 text-4xl font-semibold tracking-tight text-amber-300"
                        : "mt-4 text-4xl font-semibold tracking-tight text-neutral-50"
                    }
                  >
                    {item.value}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
                    <item.icon className="h-5 w-5" />
                  </div>
                  {comparison?.enabled && formatDelta(item.delta) ? (
                    <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-200">
                      {formatDelta(item.delta)}
                    </div>
                  ) : null}
                </div>
              </div>
              {(() => {
                const sparklineData = item.sparklineKey
                  ? summary?.sparkline.map((point) => point[item.sparklineKey]) || []
                  : [];
                const secondaryState = buildSummarySecondaryState({
                  comparisonEnabled: comparison?.enabled ?? false,
                  deltaLabel: "Current range snapshot",
                  sparkline: sparklineData
                });

                if (secondaryState.mode === "sparkline") {
                  return (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-medium uppercase tracking-[0.18em] text-neutral-600">
                        <span>{secondaryState.label}</span>
                        <span className="text-neutral-500">7D</span>
                      </div>
                      <ExplorerMiniSparkline
                        data={sparklineData}
                        testId={`explorer-summary-sparkline-${item.key}`}
                        strokeClassName={item.key === "net" ? "stroke-amber-300" : "stroke-emerald-400"}
                      />
                    </div>
                  );
                }

                return (
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-600">
                      {comparison?.enabled ? "vs previous period" : "Current range"}
                    </p>
                    <p className="text-sm text-neutral-400">{secondaryState.label}</p>
                  </div>
                );
              })()}
            </>
          )}
        </ExplorerCard>
      ))}
    </div>
  );
}
