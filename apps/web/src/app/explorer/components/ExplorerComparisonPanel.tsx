"use client";

import { ArrowDownRight, ArrowUpRight, Scale } from "lucide-react";
import { money } from "@/lib/utils";
import type { ExplorerAnalyticsResponse } from "@/lib/api/types";
import { ExplorerCard } from "./ExplorerCard";

interface ExplorerComparisonPanelProps {
  comparison: ExplorerAnalyticsResponse["comparison"] | null;
  loading?: boolean;
}

function formatDelta(delta: { delta: number; percent: number | null } | null | undefined) {
  if (!delta) {
    return "No delta";
  }
  const prefix = delta.delta > 0 ? "+" : "";
  if (delta.percent == null) {
    return `${prefix}${money(delta.delta)}`;
  }
  return `${prefix}${money(delta.delta)} · ${prefix}${delta.percent}%`;
}

export function ExplorerComparisonPanel({ comparison, loading }: ExplorerComparisonPanelProps) {
  const metrics = [
    {
      key: "spend",
      label: "Spend delta",
      value: formatDelta(comparison?.delta?.totalSpend),
      icon: ArrowUpRight
    },
    {
      key: "income",
      label: "Income delta",
      value: formatDelta(comparison?.delta?.totalIncome),
      icon: ArrowDownRight
    },
    {
      key: "net",
      label: "Net flow delta",
      value: formatDelta(comparison?.delta?.netFlow),
      icon: Scale
    }
  ];

  return (
    <ExplorerCard
      title="Period Comparison"
      subtitle="Current range against the previous matching window."
      testId="explorer-comparison-panel"
      className="h-full"
    >
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-16 animate-pulse rounded-2xl bg-neutral-900" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {metrics.map((metric) => (
            <div
              key={metric.key}
              className="flex items-center justify-between rounded-2xl border border-neutral-900 bg-neutral-950/80 px-4 py-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-900 text-neutral-300">
                  <metric.icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
                    {metric.label}
                  </div>
                  <div className="mt-1 text-sm text-neutral-300">{metric.value}</div>
                </div>
              </div>
              <div className="text-right text-xs text-neutral-500">
                {comparison?.enabled ? "vs previous" : "Comparison off"}
              </div>
            </div>
          ))}
        </div>
      )}
    </ExplorerCard>
  );
}
