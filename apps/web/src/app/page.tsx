"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownRight, ArrowUpRight, CreditCard, DollarSign } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { RANGE_OPTIONS } from "@/lib/constants";
import { cn, money } from "@/lib/utils";
import { useApi } from "@/hooks/useApi";
import type { OverviewResponse } from "@/lib/api/types";
import { buildDashboardTrendBars } from "./dashboardPresentation";
import { buildMerchantPresentation } from "./explorer/presentation";
import { StatusMessage } from "@/components/feedback/StatusMessage";
import { SuggestionsCallout } from "@/components/recurrings/SuggestionsCallout";

const DASHBOARD_FILTERS_STORAGE_KEY = "minance:dashboard:filters";
const RANGE_VALUES = new Set<string>(RANGE_OPTIONS.map((entry) => entry.value));

type TransactionsDrillDown = {
  category?: string;
  query?: string;
  type?: "expense" | "income" | "transfer";
  tag?: string;
};

const FOCUS_RING_CLASS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg";
const FILTER_PANEL_CLASS =
  "flex flex-wrap gap-2 rounded-[24px] border border-border-subtle bg-surface-panel/85 p-2 shadow-panel";
const SELECT_CLASS =
  "rounded-2xl border border-border-subtle bg-surface-field px-3 py-2 text-sm text-text-primary outline-none transition focus:border-accent focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg";
const HERO_KPI_BUTTON_CLASS =
  `group w-full rounded-[36px] border border-border-subtle bg-surface-panel/90 p-6 text-left text-text-primary shadow-panel transition hover:-translate-y-0.5 hover:border-border-strong hover:bg-surface-elevated active:translate-y-0 sm:p-8 ${FOCUS_RING_CLASS}`;
const SUPPORT_KPI_BUTTON_CLASS =
  `rounded-[28px] border border-border-subtle bg-surface-elevated/70 p-4 text-left transition hover:-translate-y-0.5 hover:border-border-strong hover:bg-surface-elevated active:translate-y-0 ${FOCUS_RING_CLASS}`;
const PANEL_CLASS =
  "rounded-[32px] border border-border-subtle bg-surface-panel/70 p-5 shadow-panel sm:p-6";
const DRILLDOWN_ROW_CLASS =
  `w-full rounded-[24px] border border-border-subtle bg-surface-field/70 px-4 py-4 text-left transition hover:border-border-strong hover:bg-surface-elevated active:translate-y-px ${FOCUS_RING_CLASS}`;
const EYEBROW_CLASS = "text-[11px] font-semibold uppercase tracking-[0.24em] text-text-muted";
const BODY_TEXT_CLASS = "text-sm leading-6 text-text-secondary";

export default function DashboardPage() {
  const api = useApi();
  const router = useRouter();

  const [range, setRange] = useState("3m");
  const [categoryView, setCategoryView] = useState<"granular" | "coarse">("granular");
  const [hydrated, setHydrated] = useState(false);
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [suggestionsCount, setSuggestionsCount] = useState(0);

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

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    api.recurrings
      .getSuggestions({ count_only: true })
      .then((result) => {
        if ("count" in result) {
          setSuggestionsCount(result.count);
        }
      })
      .catch(() => {
        // Silently ignore suggestions count errors
      });
  }, [api.recurrings, hydrated]);

  const trendBars = useMemo(() => {
    return buildDashboardTrendBars({
      range,
      trend: overview?.trend
    });
  }, [overview, range]);
  const topCategories = (overview?.topCategories ?? []).slice(0, 8);
  const topMerchants = (overview?.topMerchants ?? []).slice(0, 8);
  const maxCategoryAmount = Math.max(1, ...topCategories.map((entry) => entry.amount));
  const netFlow = overview?.summary.netFlow ?? 0;
  const netFlowValue = overview ? money(netFlow) : "$0.00";
  const spendValue = overview ? money(overview.summary.totalSpend) : "$0.00";
  const incomeValue = overview ? money(overview.summary.totalIncome) : "$0.00";
  const recurringValue = overview ? money(overview.summary.recurringSpend) : "$0.00";
  const transactionCountLabel = overview ? `${overview.summary.transactionCount} tx` : "0 tx";

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
    <div className="space-y-8" data-testid="dashboard-page">
      <header className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-warning">
            Finance review
          </p>
          <div>
            <h2 className="font-display text-4xl font-semibold tracking-tight text-text-primary sm:text-5xl">
              The money story, arranged for quick decisions.
            </h2>
            <p className={`mt-3 max-w-3xl ${BODY_TEXT_CLASS}`}>
              Start with the signal, inspect the shifts, then move into the ledger the moment something needs action.
            </p>
          </div>
        </div>
        <div className={FILTER_PANEL_CLASS}>
          <select
            value={categoryView}
            onChange={(event) => setCategoryView(event.target.value as "granular" | "coarse")}
            data-testid="dashboard-category-view"
            aria-label="Category view"
            className={SELECT_CLASS}
          >
            <option value="granular">Granular View</option>
            <option value="coarse">Coarse View</option>
          </select>
          <select
            value={range}
            onChange={(event) => setRange(event.target.value)}
            data-testid="dashboard-range"
            aria-label="Date range"
            className={SELECT_CLASS}
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
        <StatusMessage>{message}</StatusMessage>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-12" data-testid="dashboard-kpis">
        <div className="xl:col-span-7" data-testid="dashboard-hero-metric">
          <button
            type="button"
            onClick={() => openTransactionsDrillDown()}
            data-testid="dashboard-kpi-net-flow"
            aria-label={`Open transactions for net flow ${netFlowValue}`}
            className={HERO_KPI_BUTTON_CLASS}
          >
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-text-secondary">
                  <DollarSign className="h-4 w-4 text-warning" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-warning">Net flow</span>
                </div>
                <div>
                  <div className="font-display text-5xl font-semibold leading-none tracking-tight text-text-primary sm:text-6xl">
                    {netFlowValue}
                  </div>
                  <p className={`mt-3 max-w-xl ${BODY_TEXT_CLASS}`}>
                    Your headline result for the selected range, tuned for fast read-before-you-drill.
                  </p>
                </div>
              </div>
              <div className="max-w-xs space-y-3 rounded-[28px] border border-border-subtle bg-surface-field/70 px-4 py-4">
                <div className="text-[11px] font-medium uppercase tracking-[0.22em] text-text-muted">Current posture</div>
                <div className={cn("text-sm font-semibold", netFlow >= 0 ? "text-accent" : "text-danger")}>
                  {netFlow >= 0 ? "Positive cash movement" : "Outflows are overtaking inflows"}
                </div>
                <div className="text-sm text-text-secondary">Tap through to review the underlying transactions in context.</div>
              </div>
            </div>
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 xl:col-span-5 xl:grid-cols-1" data-testid="dashboard-support-metrics">
          <button
            type="button"
            onClick={() => openTransactionsDrillDown({ type: "expense" })}
            data-testid="dashboard-kpi-spent"
            aria-label={`Open expense transactions totaling ${spendValue}`}
            className={SUPPORT_KPI_BUTTON_CLASS}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-text-secondary">
                <CreditCard className="h-4 w-4 text-danger" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-muted">Spent</span>
              </div>
              <span className="rounded-full border border-border-subtle bg-surface-field px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-secondary">
                {transactionCountLabel}
              </span>
            </div>
            <div className="mt-5 flex items-end justify-between gap-3">
              <div className="font-display text-3xl font-semibold tracking-tight text-text-primary">{spendValue}</div>
              <div className="text-right text-xs uppercase tracking-[0.16em] text-danger">outflow focus</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => openTransactionsDrillDown({ type: "income" })}
            data-testid="dashboard-kpi-income"
            aria-label={`Open income transactions totaling ${incomeValue}`}
            className={SUPPORT_KPI_BUTTON_CLASS}
          >
            <div className="flex items-center gap-2 text-text-secondary">
              <ArrowDownRight className="h-4 w-4 text-accent" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-muted">Income</span>
            </div>
            <div className="mt-4 font-display text-3xl font-semibold tracking-tight text-text-primary">{incomeValue}</div>
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-border-subtle pt-3 text-sm text-text-secondary">
              <span>Credits booked in scope</span>
              <span className="text-accent">stable inflow</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => openTransactionsDrillDown({ tag: "recurring" })}
            data-testid="dashboard-kpi-recurring-spend"
            aria-label={`Open recurring transactions totaling ${recurringValue}`}
            className={SUPPORT_KPI_BUTTON_CLASS}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 text-text-secondary">
                <ArrowUpRight className="h-4 w-4 text-warning" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-muted">Recurring spend</span>
              </div>
              <SuggestionsCallout count={suggestionsCount} />
            </div>
            <div className="mt-4 font-display text-3xl font-semibold tracking-tight text-text-primary">{recurringValue}</div>
            <p className={`mt-3 ${BODY_TEXT_CLASS}`}>
              The amount most likely to keep repeating unless you intervene.
            </p>
          </button>
        </div>
      </div>

      <section className="rounded-[36px] border border-border-subtle bg-surface-panel/85 p-6 shadow-panel sm:p-8" data-testid="dashboard-trend">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className={EYEBROW_CLASS}>Net flow trend</div>
            <h3 className="mt-2 font-display text-3xl font-semibold tracking-tight text-text-primary">
              Movement over the selected window
            </h3>
            <p className={`mt-2 max-w-2xl ${BODY_TEXT_CLASS}`}>
              Scan the shifts first, then decide whether the ledger deserves a closer pass.
            </p>
          </div>
          <div className="rounded-full border border-border-subtle bg-surface-field px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-text-secondary">
            {RANGE_OPTIONS.find((option) => option.value === range)?.label ?? range}
          </div>
        </div>
        <div
          className="mt-8 grid min-h-64 items-end gap-3 border-t border-border-subtle pt-6"
          style={{ gridTemplateColumns: `repeat(${trendBars.length || 6}, minmax(0, 1fr))` }}
        >
          {loading
            ? Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-10 animate-pulse rounded-[18px] bg-surface-field" />
              ))
            : trendBars.length === 0
              ? (
                <p className="col-span-6 text-sm text-text-secondary">No trend data for this range.</p>
              )
              : trendBars.map((item) => (
                  <div key={item.month} className="flex flex-col items-center gap-3">
                    <div
                      className={cn(
                        "w-full rounded-t-[20px] border border-border-subtle",
                        item.isPositive ? "bg-accent" : "bg-danger"
                      )}
                      style={{ height: item.barHeight }}
                      title={`${item.month}: ${money(item.net)}`}
                    />
                    <div className="rounded-full border border-border-subtle bg-surface-field px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary">
                      {item.month.slice(5)}
                    </div>
                  </div>
                ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <section
          className={PANEL_CLASS}
          data-testid="dashboard-categories-section"
        >
          <div className="flex items-end justify-between gap-4">
            <div>
              <h4 className={EYEBROW_CLASS}>Category pressure</h4>
              <p className={`mt-2 max-w-lg ${BODY_TEXT_CLASS}`}>
                Ranked lanes for the categories taking the most room in the current view.
              </p>
            </div>
          </div>
          <div className="mt-5 space-y-3" data-testid="analytics-category-bars">
            {topCategories.map((entry, index) => (
              <button
                type="button"
                key={entry.category}
                onClick={() => openTransactionsDrillDown({ category: entry.category })}
                data-testid={`dashboard-category-drilldown-${index}`}
                className={DRILLDOWN_ROW_CLASS}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="rounded-full border border-border-subtle bg-surface-panel px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                        #{index + 1}
                      </span>
                      <span className="truncate text-sm font-semibold text-text-primary">
                        {entry.emoji ? `${entry.emoji} ` : ""}{entry.category}
                      </span>
                    </div>
                  </div>
                  <strong className="font-display text-2xl font-semibold tracking-tight text-text-primary">{money(entry.amount)}</strong>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-panel">
                  <div
                    className="h-full rounded-full bg-warning"
                    style={{ width: `${Math.max(8, (entry.amount / maxCategoryAmount) * 100)}%` }}
                  />
                </div>
              </button>
            ))}
          </div>
        </section>

        <section
          className={PANEL_CLASS}
          data-testid="dashboard-merchants-section"
        >
          <div>
            <h4 className={EYEBROW_CLASS}>Merchant watchlist</h4>
            <p className={`mt-2 ${BODY_TEXT_CLASS}`}>
              Clean merchant identity for the names most worth recognizing on sight.
            </p>
          </div>
          <div className="mt-5 space-y-3" data-testid="analytics-merchant-bars">
            {topMerchants.map((entry, index) => {
              const presentation = buildMerchantPresentation(entry.merchant);

              return (
                <button
                  type="button"
                  key={entry.merchant}
                  onClick={() => openTransactionsDrillDown({ query: entry.merchant })}
                  data-testid={`dashboard-merchant-drilldown-${index}`}
                  className={`flex items-center justify-between gap-4 ${DRILLDOWN_ROW_CLASS}`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] border border-border-subtle bg-surface-panel text-xs font-semibold text-accent">
                      {presentation.monogram}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-text-primary">{presentation.displayName}</div>
                      <div className="mt-1 truncate text-xs text-text-muted">{presentation.caption}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <strong className="font-display text-2xl font-semibold tracking-tight text-text-primary">{money(entry.amount)}</strong>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-text-muted">{entry.share.toFixed(1)}% share</div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <section
        className="rounded-[28px] border border-border-subtle bg-surface-panel/85 px-5 py-5 shadow-panel sm:px-6"
        data-testid="dashboard-ledger-handoff"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className={EYEBROW_CLASS}>Ledger handoff</div>
            <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight text-text-primary">Need the full working table?</h3>
            <p className={`mt-2 max-w-2xl ${BODY_TEXT_CLASS}`}>
              Open the Transactions page for the detailed ledger, header filters, and manual transaction entry.
            </p>
          </div>
          <button
            type="button"
            onClick={() => openTransactionsDrillDown()}
            data-testid="dashboard-open-transactions"
            className={`rounded-2xl bg-warning px-4 py-3 text-sm font-semibold text-app-bg transition hover:bg-warning/90 ${FOCUS_RING_CLASS}`}
          >
            Open transactions
          </button>
        </div>
      </section>
    </div>
  );
}
