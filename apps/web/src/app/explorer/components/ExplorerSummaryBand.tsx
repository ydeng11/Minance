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

const CONTEXT_BAND_CLASS_NAME = "mt-auto rounded-[22px] border border-neutral-900 bg-neutral-950/80 px-4 py-3";

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
  const currentSummary = summary?.current;
  const summaryDelta = summary?.delta;
  const comparisonEnabled = comparison?.enabled ?? false;

  const items = [
    {
      key: "spend",
      label: "Total Spend",
      value: currentSummary ? money(currentSummary.totalSpend) : "$0.00",
      delta: summaryDelta?.totalSpend || null,
      icon: CreditCard,
      sparklineKey: "spend" as const
    },
    {
      key: "income",
      label: "Total Income",
      value: currentSummary ? money(currentSummary.totalIncome) : "$0.00",
      delta: summaryDelta?.totalIncome || null,
      icon: ArrowDownRight,
      sparklineKey: "income" as const
    },
    {
      key: "net",
      label: "Net Flow",
      value: currentSummary ? money(currentSummary.netFlow) : "$0.00",
      delta: summaryDelta?.netFlow || null,
      icon: Wallet,
      sparklineKey: "net" as const
    },
    {
      key: "recurring",
      label: "Recurring Spend",
      value: currentSummary ? money(currentSummary.recurringSpend) : "$0.00",
      delta: summaryDelta?.recurringSpend || null,
      icon: Repeat,
      sparklineKey: null
    }
  ];

  return (
    <div
      className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
      data-testid="explorer-summary-band"
    >
      {items.map((item) => {
        const sparklineData = item.sparklineKey
          ? summary?.sparkline.map((point) => point[item.sparklineKey]) || []
          : [];
        const secondaryState = buildSummarySecondaryState({
          comparisonEnabled,
          deltaLabel: "Compared with previous period",
          sparkline: sparklineData
        });
        const deltaText = formatDelta(item.delta);
        const valueToneClassName =
          item.key === "net" && (currentSummary?.netFlow ?? 0) < 0
            ? "text-amber-300"
            : "text-neutral-50";
        const sparklineStrokeClassName = item.key === "net" ? "stroke-amber-300" : "stroke-emerald-400";

        return (
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
                    <p className={`mt-4 font-semibold tracking-tight ${valueToneClassName} ${getSummaryValueClassName(item.value)}`}>
                      {item.value}
                    </p>
                  </div>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
                    <item.icon className="h-5 w-5" />
                  </div>
                </div>

                <div className={CONTEXT_BAND_CLASS_NAME}>
                  {secondaryState.mode === "sparkline" ? (
                    <>
                      <div className="flex items-center justify-between gap-3 text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
                        <span>{secondaryState.label}</span>
                        <span>within current filters</span>
                      </div>
                      <ExplorerMiniSparkline
                        data={sparklineData}
                        testId={`explorer-summary-sparkline-${item.key}`}
                        strokeClassName={sparklineStrokeClassName}
                      />
                    </>
                  ) : (
                    <>
                      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
                        {comparisonEnabled ? secondaryState.label : "Selected range"}
                      </p>
                      <p className="mt-1 text-sm text-neutral-300">
                        {comparisonEnabled ? (deltaText || "No prior-period delta available.") : "Within current filters."}
                      </p>
                    </>
                  )}
                </div>
              </>
            )}
          </ExplorerCard>
        );
      })}
    </div>
  );
}
