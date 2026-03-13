"use client";

import { ArrowDownRight, CreditCard, Repeat, Wallet } from "lucide-react";
import { buildSummarySecondaryState, getSummaryValueClassName } from "../presentation";
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
          contentClassName="flex h-full flex-col gap-4"
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
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-neutral-500">
                    {item.label}
                  </p>
                  <p
                    className={
                      item.key === "net" && (summary?.current.netFlow || 0) < 0
                        ? `mt-4 font-semibold tracking-tight text-amber-300 ${getSummaryValueClassName(item.value)}`
                        : `mt-4 font-semibold tracking-tight text-neutral-50 ${getSummaryValueClassName(item.value)}`
                    }
                  >
                    {item.value}
                  </p>
                </div>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
                  <item.icon className="h-5 w-5" />
                </div>
              </div>
              {(() => {
                const sparklineData = item.sparklineKey
                  ? summary?.sparkline.map((point) => point[item.sparklineKey]) || []
                  : [];
                const secondaryState = buildSummarySecondaryState({
                  comparisonEnabled: comparison?.enabled ?? false,
                  deltaLabel: "Compared with previous period",
                  sparkline: sparklineData
                });
                const deltaText = formatDelta(item.delta);

                if (secondaryState.mode === "sparkline") {
                  return (
                    <div className="mt-auto rounded-[22px] border border-neutral-900 bg-neutral-950/80 px-4 py-3">
                      <div className="flex items-center justify-between gap-3 text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
                        <span>{secondaryState.label}</span>
                        <span>within current filters</span>
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
                  <div className="mt-auto rounded-[22px] border border-neutral-900 bg-neutral-950/80 px-4 py-3">
                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
                      {comparison?.enabled ? secondaryState.label : "Selected range"}
                    </p>
                    <p className="mt-1 text-sm text-neutral-300">
                      {comparison?.enabled
                        ? (deltaText || "No prior-period delta available.")
                        : "Within current filters."}
                    </p>
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
