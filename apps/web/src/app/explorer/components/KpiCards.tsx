"use client";

import { DollarSign, CreditCard, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { money } from "@/lib/utils";
import type { OverviewResponse } from "@/lib/api/types";

interface KpiCardsProps {
  overview: OverviewResponse | null;
  loading?: boolean;
}

export function KpiCards({ overview, loading }: KpiCardsProps) {
  const netFlow = overview?.summary?.netFlow || 0;
  const totalSpend = overview?.summary?.totalSpend || 0;
  const totalIncome = overview?.summary?.totalIncome || 0;
  const transactionCount = overview?.summary?.transactionCount || 0;
  const averageTransaction = transactionCount > 0 ? (totalSpend + totalIncome) / transactionCount : 0;

  const cards = [
    {
      id: "net-flow",
      label: "Net Flow",
      value: money(netFlow),
      icon: DollarSign,
      trend: netFlow >= 0 ? "+positive" : "-negative",
      trendColor: netFlow >= 0 ? "text-emerald-400" : "text-rose-400",
      bgColor: netFlow >= 0 ? "bg-emerald-500/10" : "bg-rose-500/10"
    },
    {
      id: "spent",
      label: "Total Spent",
      value: money(totalSpend),
      icon: CreditCard,
      trend: `${transactionCount} tx`,
      trendColor: "text-emerald-400",
      bgColor: "bg-emerald-500/10"
    },
    {
      id: "income",
      label: "Total Income",
      value: money(totalIncome),
      icon: ArrowDownRight,
      trend: "credits",
      trendColor: "text-sky-400",
      bgColor: "bg-sky-500/10"
    },
    {
      id: "average",
      label: "Avg Transaction",
      value: money(averageTransaction),
      icon: ArrowUpRight,
      trend: "per tx",
      trendColor: "text-neutral-400",
      bgColor: "bg-neutral-500/10"
    }
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-24 animate-pulse rounded-2xl border border-neutral-900 bg-neutral-950/70"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.id}
          className="rounded-2xl border border-neutral-900 bg-neutral-950/70 p-4 transition hover:border-neutral-700 hover:bg-neutral-900/70"
        >
          <div className="flex items-center gap-2 text-neutral-400">
            <card.icon className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">{card.label}</span>
          </div>
          <div className="mt-2 flex items-end justify-between gap-2">
            <div className="text-xl font-semibold text-neutral-100">{card.value}</div>
            <span
              className={`rounded-full px-2 py-1 text-xs ${card.bgColor} ${card.trendColor}`}
            >
              {card.trend}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
