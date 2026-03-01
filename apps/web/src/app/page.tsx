"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, CreditCard, DollarSign, Save } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { RANGE_OPTIONS } from "@/lib/constants";
import { money } from "@/lib/utils";
import { useApi } from "@/hooks/useApi";
import type { AnomalyItem, HeatmapItem, OverviewResponse, SavedView } from "@/lib/api/types";

export default function DashboardPage() {
  const api = useApi();

  const [range, setRange] = useState("90d");
  const [categoryView, setCategoryView] = useState<"granular" | "coarse">("granular");
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [heatmap, setHeatmap] = useState<HeatmapItem[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyItem[]>([]);
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [savedViewName, setSavedViewName] = useState("");
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
      const [overviewData, heatmapData, anomaliesData, viewsData] = await Promise.all([
        api.analytics.overview({ range: nextRange, category_view: nextCategoryView }),
        api.analytics.heatmap({ range: nextRange, category_view: nextCategoryView }),
        api.analytics.anomalies({ range: nextRange, category_view: nextCategoryView }),
        api.savedViews.list()
      ]);

      setOverview(overviewData);
      setHeatmap(heatmapData.items);
      setAnomalies(anomaliesData.items);
      setSavedViews(viewsData.items);

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
    void loadDashboardData(range, categoryView);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, categoryView]);

  const trendBars = useMemo(() => {
    return (overview?.trend || []).slice(-6).map((entry) => {
      const maxSpend = Math.max(1, ...(overview?.trend || []).map((item) => item.spend));
      const maxIncome = Math.max(1, ...(overview?.trend || []).map((item) => item.income));
      return {
        ...entry,
        spendHeight: Math.max(14, Math.round((entry.spend / maxSpend) * 120)),
        incomeHeight: Math.max(10, Math.round((entry.income / maxIncome) * 90))
      };
    });
  }, [overview]);

  async function saveCurrentView() {
    if (!savedViewName.trim()) {
      setMessage("Saved view name is required.");
      return;
    }

    try {
      await api.savedViews.create(savedViewName.trim(), { range, categoryView });
      setSavedViewName("");
      setMessage("Saved view created.");
      const nextViews = await api.savedViews.list();
      setSavedViews(nextViews.items);
    } catch (error) {
      if (error instanceof ApiError) {
        setMessage(error.message);
      } else {
        setMessage("Failed to save view.");
      }
    }
  }

  async function deleteSavedView(viewId: string) {
    try {
      await api.savedViews.remove(viewId);
      const nextViews = await api.savedViews.list();
      setSavedViews(nextViews.items);
      setMessage("Saved view removed.");
    } catch (error) {
      if (error instanceof ApiError) {
        setMessage(error.message);
      } else {
        setMessage("Failed to delete saved view.");
      }
    }
  }

  function applySavedView(view: SavedView) {
    const savedRange = typeof view.filters?.range === "string" ? view.filters.range : null;
    const savedCategoryView = view.filters?.categoryView === "coarse" ? "coarse" : "granular";
    if (savedRange) {
      setRange(savedRange);
    }
    setCategoryView(savedCategoryView);
    setMessage(`Applied view: ${view.name}`);
  }

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">Dashboard</h2>
          <p className="text-neutral-400">Welcome back. Here is your financial overview.</p>
        </div>
        <div className="flex gap-2">
          <select
            value={categoryView}
            onChange={(event) => setCategoryView(event.target.value as "granular" | "coarse")}
            data-testid="dashboard-category-view"
            className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 outline-none transition focus:border-emerald-500"
          >
            <option value="granular">Granular View</option>
            <option value="coarse">Coarse View</option>
          </select>
          <select
            value={range}
            onChange={(event) => setRange(event.target.value)}
            data-testid="dashboard-range"
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
            label: "Net Flow",
            value: overview ? money(overview.summary.netFlow) : "$0.00",
            icon: DollarSign,
            trend: overview && overview.summary.netFlow >= 0 ? "+positive" : "-negative"
          },
          {
            label: "Spent this period",
            value: overview ? money(overview.summary.totalSpend) : "$0.00",
            icon: CreditCard,
            trend: overview ? `${overview.summary.transactionCount} tx` : "0 tx"
          },
          {
            label: "Income",
            value: overview ? money(overview.summary.totalIncome) : "$0.00",
            icon: ArrowDownRight,
            trend: "credits"
          },
          {
            label: "Recurring Spend",
            value: overview ? money(overview.summary.recurringSpend) : "$0.00",
            icon: ArrowUpRight,
            trend: "pattern"
          }
        ].map((entry) => (
          <article key={entry.label} className="rounded-2xl border border-neutral-900 bg-neutral-950/70 p-4">
            <div className="flex items-center gap-2 text-neutral-400">
              <entry.icon className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">{entry.label}</span>
            </div>
            <div className="mt-2 flex items-end justify-between gap-2">
              <div className="text-xl font-semibold text-neutral-100">{entry.value}</div>
              <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-400">{entry.trend}</span>
            </div>
          </article>
        ))}
      </div>

      <section className="rounded-2xl border border-neutral-900 bg-neutral-950/70 p-6" data-testid="dashboard-trend">
        <h3 className="text-sm font-medium text-neutral-300">Spending Trend</h3>
        <div className="mt-4 grid min-h-56 grid-cols-6 items-end gap-2">
          {loading
            ? Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-10 animate-pulse rounded-md bg-neutral-900" />
              ))
            : trendBars.length === 0
              ? (
                <p className="col-span-6 text-sm text-neutral-500">No trend data for this range.</p>
              )
              : trendBars.map((item) => (
                  <div key={item.month} className="flex flex-col items-center gap-2">
                    <div className="flex w-full items-end gap-1">
                      <div className="w-1/2 rounded-md bg-emerald-500/80" style={{ height: item.spendHeight }} />
                      <div className="w-1/2 rounded-md bg-sky-400/70" style={{ height: item.incomeHeight }} />
                    </div>
                    <div className="text-[11px] text-neutral-500">{item.month.slice(5)}</div>
                  </div>
                ))}
        </div>
      </section>

      <details className="rounded-2xl border border-neutral-900 bg-neutral-950/70" data-testid="advanced-insights" open>
        <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-neutral-300">Advanced Insights</summary>
        <div className="space-y-5 px-4 pb-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-xl border border-neutral-900 bg-neutral-950 p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Top Categories</h4>
              <div className="mt-3 space-y-2" data-testid="analytics-category-bars">
                {(overview?.topCategories || []).slice(0, 8).map((entry) => (
                  <div key={entry.category} className="flex items-center justify-between rounded-md bg-neutral-900 px-3 py-2 text-sm">
                    <span className="text-neutral-300">{entry.emoji ? `${entry.emoji} ` : ""}{entry.category}</span>
                    <strong className="text-neutral-100">{money(entry.amount)}</strong>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-neutral-900 bg-neutral-950 p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Top Merchants</h4>
              <div className="mt-3 space-y-2" data-testid="analytics-merchant-bars">
                {(overview?.topMerchants || []).slice(0, 8).map((entry) => (
                  <div key={entry.merchant} className="flex items-center justify-between rounded-md bg-neutral-900 px-3 py-2 text-sm">
                    <span className="text-neutral-300">{entry.merchant}</span>
                    <strong className="text-neutral-100">{money(entry.amount)}</strong>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-xl border border-neutral-900 bg-neutral-950 p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Spending Heatmap</h4>
              <div className="mt-3 grid grid-cols-7 gap-1.5" data-testid="analytics-heatmap">
                {heatmap.length ? (
                  heatmap.slice(0, 49).map((entry) => {
                    const intensity = Math.min(0.9, Math.max(0.1, entry.amount / Math.max(...heatmap.map((item) => item.amount), 1)));
                    return (
                      <div
                        key={`${entry.week}-${entry.weekday}`}
                        className="grid aspect-square place-items-center rounded-md text-[11px] text-neutral-950"
                        style={{ backgroundColor: `rgba(16, 185, 129, ${intensity})` }}
                      >
                        {entry.weekday}
                      </div>
                    );
                  })
                ) : (
                  <p className="col-span-7 text-sm text-neutral-500">No spend data for range.</p>
                )}
              </div>
            </section>

            <section className="rounded-xl border border-neutral-900 bg-neutral-950 p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Anomalies</h4>
              <div className="mt-3 space-y-2" data-testid="analytics-anomalies">
                {anomalies.length ? (
                  anomalies.slice(0, 8).map((entry) => (
                    <div key={entry.transactionId} className="flex items-center justify-between rounded-md bg-neutral-900 px-3 py-2 text-sm">
                      <span className="text-neutral-300">{entry.transactionDate} · {entry.merchant} · {entry.emoji ? `${entry.emoji} ` : ""}{entry.category}</span>
                      <strong className="text-neutral-100">{money(entry.amount)}</strong>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-neutral-500">No anomalies detected.</p>
                )}
              </div>
            </section>
          </div>

          <section className="rounded-xl border border-neutral-900 bg-neutral-950 p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Saved Views</h4>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
              <label className="grid flex-1 gap-1 text-sm text-neutral-300">
                Name
                <input
                  value={savedViewName}
                  onChange={(event) => setSavedViewName(event.target.value)}
                  data-testid="saved-view-name"
                  placeholder="Quarterly dining check"
                  className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-200 outline-none transition focus:border-emerald-500"
                />
              </label>
              <button
                type="button"
                onClick={saveCurrentView}
                data-testid="save-view-button"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800"
              >
                <Save className="h-4 w-4" />
                Save Current View
              </button>
            </div>

            <div className="mt-4 space-y-2" data-testid="saved-views-list">
              {savedViews.map((view) => (
                <div key={view.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-neutral-900 px-3 py-2 text-sm">
                  <span className="text-neutral-300">{view.name}</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => applySavedView(view)}
                      className="rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1 text-xs text-neutral-200 transition hover:bg-neutral-700"
                    >
                      Apply
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteSavedView(view.id)}
                      className="rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1 text-xs text-neutral-200 transition hover:bg-neutral-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </details>
    </div>
  );
}
