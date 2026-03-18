"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownRight, ArrowUpRight, CreditCard, DollarSign } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { RANGE_OPTIONS } from "@/lib/constants";
import { cn, money } from "@/lib/utils";
import { useApi } from "@/hooks/useApi";
import type { OverviewResponse } from "@/lib/api/types";

const DASHBOARD_FILTERS_STORAGE_KEY = "minance:dashboard:filters";
const RANGE_VALUES = new Set<string>(RANGE_OPTIONS.map((entry) => entry.value));

type TransactionsDrillDown = {
  category?: string;
  query?: string;
  type?: "expense" | "income" | "transfer";
  tag?: string;
};

export default function DashboardPage() {
  const api = useApi();
  const router = useRouter();

  const [range, setRange] = useState("90d");
  const [categoryView, setCategoryView] = useState<"granular" | "coarse">("granular");
  const [hydrated, setHydrated] = useState(false);
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadDashboardData(
    nextRange = range,
    nextCategoryView = categoryView,
    options: {
      allowAutoAllFallback?: boolean;
      preserveMessage?: boolean;
    } = {}
  ) {
    const allowAutoAllFallback = options.allowAutoAllFallback ?? true;
    const preserveMessage = options.preserveMessage ?? false;

    setLoading(true);
    if (!preserveMessage) {
      setMessage("");
    }

    try {
      const [overviewData] = await Promise.all([
        api.analytics.overview({ range: nextRange, category_view: nextCategoryView })
      ]);

      setOverview(overviewData);

      const outOfRange =
        nextRange !== "all" &&
        (overviewData?.summary?.transactionCount || 0) === 0 &&
        Number(overviewData?.meta?.dataBounds?.count || 0) > 0;

      if (allowAutoAllFallback && outOfRange) {
        setRange("all");
        setMessage("No transactions in this date range. Switched to all available data.");
        await loadDashboardData("all", nextCategoryView, {
          allowAutoAllFallback: false,
          preserveMessage: true
        });
      }
    } catch (error) {
      if (error instanceof ApiError) {
        setMessage(error.message);
      } else {
        setMessage("Failed to load dashboard data.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    void loadDashboardData(range, categoryView);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, range, categoryView]);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(DASHBOARD_FILTERS_STORAGE_KEY);
      if (!raw) {
        setHydrated(true);
        return;
      }

      const parsed = JSON.parse(raw) as {
        range?: string;
        categoryView?: string;
      };

      if (RANGE_VALUES.has(String(parsed.range || ""))) {
        setRange(String(parsed.range));
      }
      if (parsed.categoryView === "coarse" || parsed.categoryView === "granular") {
        setCategoryView(parsed.categoryView);
      }
    } catch {
      // Ignore storage parse failures and keep defaults.
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    window.sessionStorage.setItem(
      DASHBOARD_FILTERS_STORAGE_KEY,
      JSON.stringify({
        range,
        categoryView
      })
    );
  }, [categoryView, hydrated, range]);

  const trendBars = useMemo(() => {
    const trend = overview?.trend || [];

    // Dynamic bar count based on range
    const rangeToCount: Record<string, number> = {
      "7d": 7,
      "14d": 14,
      "30d": 4,
      "90d": 3,
      "180d": 6,
      "1y": 12,
      all: Math.min(trend.length, 24)
    };
    const barCount = rangeToCount[range] || 6;

    return trend.slice(-barCount).map((entry) => {
      const maxAbsNet = Math.max(1, ...trend.map((item) => Math.abs(item.net)));
      return {
        ...entry,
        barHeight: Math.max(14, Math.round((Math.abs(entry.net) / maxAbsNet) * 120)),
        isPositive: entry.net >= 0
      };
    });
  }, [overview, range]);

  function buildTransactionsDrillDownUrl(drillDown: TransactionsDrillDown = {}) {
    const searchParams = new URLSearchParams();
    searchParams.set("range", range);
    searchParams.set("category_view", categoryView);

    if (drillDown.category) {
      searchParams.set("category", drillDown.category);
    }
    if (drillDown.query) {
      searchParams.set("query", drillDown.query);
    }
    if (drillDown.type) {
      searchParams.set("type", drillDown.type);
    }
    if (drillDown.tag) {
      searchParams.set("tag", drillDown.tag);
    }

    return `/transactions?${searchParams.toString()}`;
  }

  function openTransactionsDrillDown(drillDown: TransactionsDrillDown = {}) {
    router.push(buildTransactionsDrillDownUrl(drillDown));
  }

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">Dashboard</h2>
          <p className="text-neutral-400">Quick overview of your finances at a glance.</p>
        </div>
        <div className="flex gap-2">
          <select
            value={categoryView}
            onChange={(event) => setCategoryView(event.target.value as "granular" | "coarse")}
            data-testid="dashboard-category-view"
            aria-label="Category view"
            className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 outline-none transition focus:border-emerald-500"
          >
            <option value="granular">Granular View</option>
            <option value="coarse">Coarse View</option>
          </select>
          <select
            value={range}
            onChange={(event) => setRange(event.target.value)}
            data-testid="dashboard-range"
            aria-label="Date range"
            className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 outline-none transition focus:border-emerald-500"
          >
            {RANGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      {message ? (
        <p className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-300" data-testid="global-message">
          {message}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4" data-testid="dashboard-kpis">
        {[
          {
            id: "net-flow",
            label: "Net Flow",
            value: overview ? money(overview.summary.netFlow) : "$0.00",
            icon: DollarSign,
            trend: overview && overview.summary.netFlow >= 0 ? "+positive" : "-negative",
            drillDown: {}
          },
          {
            id: "spent",
            label: "Spent this period",
            value: overview ? money(overview.summary.totalSpend) : "$0.00",
            icon: CreditCard,
            trend: overview ? `${overview.summary.transactionCount} tx` : "0 tx",
            drillDown: { type: "expense" as const }
          },
          {
            id: "income",
            label: "Income",
            value: overview ? money(overview.summary.totalIncome) : "$0.00",
            icon: ArrowDownRight,
            trend: "credits",
            drillDown: { type: "income" as const }
          },
          {
            id: "recurring-spend",
            label: "Recurring Spend",
            value: overview ? money(overview.summary.recurringSpend) : "$0.00",
            icon: ArrowUpRight,
            trend: "pattern",
            drillDown: { tag: "recurring" }
          }
        ].map((entry) => (
          <button
            type="button"
            key={entry.label}
            onClick={() => openTransactionsDrillDown(entry.drillDown)}
            data-testid={`dashboard-kpi-${entry.id}`}
            className="rounded-2xl border border-neutral-900 bg-neutral-950/70 p-4 text-left transition hover:border-neutral-700 hover:bg-neutral-900/70"
          >
            <div className="flex items-center gap-2 text-neutral-400">
              <entry.icon className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">{entry.label}</span>
            </div>
            <div className="mt-2 flex items-end justify-between gap-2">
              <div className="text-xl font-semibold text-neutral-100">{entry.value}</div>
              <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-400">{entry.trend}</span>
            </div>
            <p className="mt-2 text-xs text-emerald-400">View transactions</p>
          </button>
        ))}
      </div>

      <section className="rounded-2xl border border-neutral-900 bg-neutral-950/70 p-6" data-testid="dashboard-trend">
        <h3 className="text-sm font-medium text-neutral-300">Net Flow Trend</h3>
        <div
          className="mt-4 grid min-h-56 items-end gap-2"
          style={{ gridTemplateColumns: `repeat(${trendBars.length || 6}, minmax(0, 1fr))` }}
        >
          {loading
            ? Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-10 animate-pulse rounded-md bg-neutral-900" />
              ))
            : trendBars.length === 0
              ? (
                <p className="col-span-6 text-sm text-neutral-400">No trend data for this range.</p>
              )
              : trendBars.map((item) => (
                  <div key={item.month} className="flex flex-col items-center gap-2">
                    <div
                      className={cn(
                        "w-full rounded-md",
                        item.isPositive ? "bg-emerald-500/80" : "bg-rose-500/80"
                      )}
                      style={{ height: item.barHeight }}
                      title={`${item.month}: ${money(item.net)}`}
                    />
                    <div className="text-[11px] text-neutral-400">{item.month.slice(5)}</div>
                  </div>
                ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-neutral-900 bg-neutral-950 p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Top Categories</h4>
          <div className="mt-3 space-y-2" data-testid="analytics-category-bars">
            {(overview?.topCategories || []).slice(0, 8).map((entry, index) => (
              <button
                type="button"
                key={entry.category}
                onClick={() => openTransactionsDrillDown({ category: entry.category })}
                data-testid={`dashboard-category-drilldown-${index}`}
                className="flex w-full items-center justify-between rounded-md bg-neutral-900 px-3 py-2 text-left text-sm transition hover:bg-neutral-800"
              >
                <span className="text-neutral-300">{entry.emoji ? `${entry.emoji} ` : ""}{entry.category}</span>
                <strong className="text-neutral-100">{money(entry.amount)}</strong>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-neutral-900 bg-neutral-950 p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Top Merchants</h4>
          <div className="mt-3 space-y-2" data-testid="analytics-merchant-bars">
            {(overview?.topMerchants || []).slice(0, 8).map((entry, index) => (
              <button
                type="button"
                key={entry.merchant}
                onClick={() => openTransactionsDrillDown({ query: entry.merchant })}
                data-testid={`dashboard-merchant-drilldown-${index}`}
                className="flex w-full items-center justify-between rounded-md bg-neutral-900 px-3 py-2 text-left text-sm transition hover:bg-neutral-800"
              >
                <span className="text-neutral-300">{entry.merchant}</span>
                <strong className="text-neutral-100">{money(entry.amount)}</strong>
              </button>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-neutral-900 bg-[linear-gradient(135deg,rgba(10,16,18,0.95),rgba(7,11,13,0.78))] p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-[0.24em] text-emerald-300">Transaction ledger</div>
            <h3 className="mt-2 text-xl font-semibold text-neutral-50">Need the full table view?</h3>
            <p className="mt-2 max-w-2xl text-sm text-neutral-400">
              Open the Transactions page for the detailed ledger, header filters, and manual transaction entry.
            </p>
          </div>
          <button
            type="button"
            onClick={() => openTransactionsDrillDown()}
            data-testid="dashboard-open-transactions"
            className="rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-emerald-300"
          >
            Open transactions
          </button>
        </div>
      </section>
    </div>
  );
}
