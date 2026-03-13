"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LineChart, X } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { useApi } from "@/hooks/useApi";
import type { Account, Category, ExplorerAnalyticsResponse, OverviewResponse, SavedView } from "@/lib/api/types";
import {
  buildTransactionsFilterSearchParams,
  createDefaultTransactionsFilterState,
  toValidFilterState as toValidTransactionsFilterState
} from "../transactions/filters";
import {
  buildExplorerFilterSearchParams,
  parseExplorerFilterState,
  savedExplorerFiltersToState,
  toValidExplorerFilterState,
  toExplorerAnalyticsApiParams
} from "./filters";
import { AccountPerspective } from "./components/AccountPerspective";
import { ExplorerAdvancedFilters } from "./components/ExplorerAdvancedFilters";
import { ExplorerCommandBar } from "./components/ExplorerCommandBar";
import { CategoryPerspective } from "./components/CategoryPerspective";
import { ExplorerPerspectiveTabs } from "./components/ExplorerPerspectiveTabs";
import { ExplorerSummaryBand } from "./components/ExplorerSummaryBand";
import { OverviewPerspective } from "./components/OverviewPerspective";
import { SavedViews } from "./components/SavedViews";
import { VisualizationGrid } from "./components/VisualizationGrid";

export default function ExplorerPage() {
  const api = useApi();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamKey = searchParams.toString();

  // Parse and validate filters from URL
  const parsedFilters = useMemo(
    () => toValidExplorerFilterState(parseExplorerFilterState(searchParams)),
    [searchParamKey, searchParams]
  );

  // State
  const [filters, setFilters] = useState(parsedFilters);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [explorer, setExplorer] = useState<ExplorerAnalyticsResponse | null>(null);
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const syncFilters = useCallback(
    (nextFilters: typeof filters) => {
      const next = toValidExplorerFilterState(nextFilters);
      setFilters(next);
      const nextSearchParams = buildExplorerFilterSearchParams(next);
      router.push(`/explorer?${nextSearchParams.toString()}`);
    },
    [router]
  );

  // Sync filters with URL changes
  useEffect(() => {
    setFilters(parsedFilters);
  }, [parsedFilters]);

  // Fetch categories and accounts on mount
  useEffect(() => {
    async function loadMetadata() {
      try {
        const [categoriesData, accountsData, viewsData] = await Promise.all([
          api.categories.list(),
          api.accounts.list(),
          api.savedViews.list()
        ]);
        setCategories(categoriesData.categories);
        setAccounts(accountsData.accounts);
        setSavedViews(viewsData.items);
      } catch (error) {
        if (error instanceof ApiError) {
          setMessage(error.message);
        } else {
          setMessage("Failed to load metadata.");
        }
      }
    }
    void loadMetadata();
  }, [api]);

  // Fetch analytics data when filters change
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setMessage("");

      try {
        const analyticsParams = toExplorerAnalyticsApiParams(filters);
        const [explorerData, viewsData] = await Promise.all([
          api.analytics.explorer(analyticsParams),
          api.savedViews.list()
        ]);
        setExplorer(explorerData);
        setSavedViews(viewsData.items);
      } catch (error) {
        if (error instanceof ApiError) {
          setMessage(error.message);
        } else {
          setMessage("Failed to load data.");
        }
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, [api, filters]);

  // Update filters and sync to URL
  const updateFilters = useCallback(
    (updates: Partial<typeof filters>) => {
      syncFilters({ ...filters, ...updates });
    },
    [filters, syncFilters]
  );

  // Handle month click in trend chart - filter to that month
  const handleMonthClick = useCallback(
    (month: string) => {
      const [year, monthNum] = month.split("-");
      const startDate = `${year}-${monthNum}-01`;
      const endDate = new Date(Number(year), Number(monthNum), 0).toISOString().slice(0, 10);
      updateFilters({
        range: "custom",
        start: startDate,
        end: endDate
      });
    },
    [updateFilters]
  );

  // Handle category click - filter to that category
  const handleCategoryClick = useCallback(
    (category: string) => {
      updateFilters({ category });
    },
    [updateFilters]
  );

  // Handle account click - filter to that account
  const handleAccountClick = useCallback(
    (account: string) => {
      updateFilters({ account });
    },
    [updateFilters]
  );

  // Handle merchant click - filter to that merchant
  const handleMerchantClick = useCallback(
    (merchant: string) => {
      updateFilters({ merchant });
    },
    [updateFilters]
  );

  const openTransactionsDrillDown = useCallback(
    (overrides: Partial<{ query: string; category: string; account: string; transactionType: typeof filters.transactionType; tag: string }>) => {
      const transactionFilters = toValidTransactionsFilterState({
        ...createDefaultTransactionsFilterState(),
        query: overrides.query ?? filters.query,
        category: overrides.category ?? filters.category,
        account: overrides.account ?? filters.account,
        minAmount: filters.minAmount,
        maxAmount: filters.maxAmount,
        range: filters.range,
        start: filters.start,
        end: filters.end,
        categoryView: filters.categoryView,
        transactionType: overrides.transactionType ?? filters.transactionType,
        tag: overrides.tag ?? filters.tag,
        page: 1
      });
      const nextSearchParams = buildTransactionsFilterSearchParams(transactionFilters);
      router.push(`/transactions?${nextSearchParams.toString()}`);
    },
    [filters, router]
  );

  // Saved views handlers
  async function handleSaveView(name: string) {
    try {
      await api.savedViews.create(name, { ...filters });
      setMessage("Saved view created.");
      const viewsData = await api.savedViews.list();
      setSavedViews(viewsData.items);
    } catch (error) {
      if (error instanceof ApiError) {
        setMessage(error.message);
      } else {
        setMessage("Failed to save view.");
      }
    }
  }

  function handleApplyView(view: SavedView) {
    const nextFilters = savedExplorerFiltersToState(view.filters);
    syncFilters(nextFilters);
    setMessage(`Applied view: ${view.name}`);
  }

  async function handleDeleteView(viewId: string) {
    try {
      await api.savedViews.remove(viewId);
      setSavedViews((previous) => previous.filter((view) => view.id !== viewId));
      setMessage("Saved view removed.");
    } catch (error) {
      if (error instanceof ApiError) {
        setMessage(error.message);
      } else {
        setMessage("Failed to delete view.");
      }
    }
  }

  // Calculate date range display
  const dateRangeDisplay = useMemo(() => {
    if (filters.range === "custom" && filters.start && filters.end) {
      return `${filters.start} to ${filters.end}`;
    }
    const rangeLabels: Record<string, string> = {
      all: "All time",
      "30d": "Last 30 days",
      "90d": "Last 90 days",
      "365d": "Last 12 months",
      ytd: "Year to date"
    };
    return rangeLabels[filters.range] || filters.range;
  }, [filters.range, filters.start, filters.end]);

  const overview = useMemo<OverviewResponse | null>(() => {
    if (!explorer) {
      return null;
    }

    return {
      summary: explorer.summary.current,
      trend: explorer.trend.items,
      topCategories: explorer.categories.items.slice(0, 5),
      topMerchants: explorer.merchants.items.slice(0, 5),
      meta: explorer.meta
    };
  }, [explorer]);

  const activeFilters = useMemo(() => {
    const items: Array<{
      key: string;
      label: string;
      clear: () => void;
    }> = [];

    if (filters.account) {
      items.push({
        key: "account",
        label: filters.account,
        clear: () => updateFilters({ account: "" })
      });
    }
    if (filters.category) {
      items.push({
        key: "category",
        label: filters.category,
        clear: () => updateFilters({ category: "" })
      });
    }
    if (filters.review !== "all") {
      items.push({
        key: "review",
        label: filters.review === "reviewed" ? "Reviewed" : "Needs Review",
        clear: () => updateFilters({ review: "all" })
      });
    }
    if (filters.transactionType !== "all") {
      items.push({
        key: "type",
        label: filters.transactionType.charAt(0).toUpperCase() + filters.transactionType.slice(1),
        clear: () => updateFilters({ transactionType: "all" })
      });
    }
    if (filters.direction !== "all") {
      items.push({
        key: "direction",
        label: filters.direction === "outflow" ? "Outflow" : "Inflow",
        clear: () => updateFilters({ direction: "all" })
      });
    }
    if (filters.tag) {
      items.push({
        key: "tag",
        label: `Tag: ${filters.tag}`,
        clear: () => updateFilters({ tag: "" })
      });
    }
    if (filters.merchant) {
      items.push({
        key: "merchant",
        label: `Merchant: ${filters.merchant}`,
        clear: () => updateFilters({ merchant: "" })
      });
    }
    if (filters.compare === "previous") {
      items.push({
        key: "compare",
        label: "Compare: Previous Period",
        clear: () => updateFilters({ compare: "none" })
      });
    }

    return items;
  }, [filters, updateFilters]);

  return (
    <div className="space-y-8" data-testid="explorer-page">
      {/* Header */}
      <header className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-emerald-500/30 bg-emerald-500/10">
            <LineChart className="h-6 w-6 text-emerald-300" />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-emerald-300/80">
              Analytics workspace
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-50 sm:text-4xl">
              Explorer
            </h2>
            <p className="mt-2 max-w-2xl text-neutral-400">
              Rich account and category analysis across {dateRangeDisplay.toLowerCase()}.
            </p>
          </div>
        </div>
      </header>

      {message && (
        <p
          className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-300"
          data-testid="explorer-message"
        >
          {message}
        </p>
      )}

      {showAdvancedFilters ? (
        <ExplorerAdvancedFilters
          filters={filters}
          categories={categories}
          onApply={(updates) => {
            updateFilters(updates);
            setShowAdvancedFilters(false);
          }}
          onClose={() => setShowAdvancedFilters(false)}
        />
      ) : null}

      <main className="min-w-0 space-y-6">
        <ExplorerCommandBar
          filters={filters}
          accounts={accounts}
          onChange={updateFilters}
          onOpenAdvancedFilters={() => setShowAdvancedFilters(true)}
        />

        <div className="flex flex-wrap items-center gap-2" data-testid="explorer-active-filters">
          {activeFilters.length ? (
            activeFilters.map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={filter.clear}
                className="inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-200 transition hover:bg-neutral-900"
              >
                {filter.label}
                <X className="h-3.5 w-3.5 text-neutral-500" />
              </button>
            ))
          ) : (
            <div className="rounded-full border border-neutral-900 bg-neutral-950/80 px-3 py-1.5 text-sm text-neutral-500">
              All transactions in view
            </div>
          )}
        </div>

        <ExplorerSummaryBand
          summary={explorer?.summary || null}
          comparison={explorer?.comparison || null}
          loading={loading}
        />

        <ExplorerPerspectiveTabs
          perspective={filters.perspective}
          onChange={(perspective) => updateFilters({ perspective })}
        />

        {filters.perspective === "overview" ? (
          <OverviewPerspective
            overview={overview}
            comparison={explorer?.comparison || null}
            heatmap={explorer?.heatmap.items || []}
            anomalies={explorer?.anomalies.items || []}
            onMonthClick={handleMonthClick}
            onCategoryClick={handleCategoryClick}
            onMerchantClick={handleMerchantClick}
            loading={loading}
          />
        ) : filters.perspective === "category" ? (
          <CategoryPerspective
            overview={overview}
            selectedCategory={filters.category}
            onCategoryClick={handleCategoryClick}
            onMonthClick={handleMonthClick}
            onMerchantClick={handleMerchantClick}
            loading={loading}
          />
        ) : filters.perspective === "account" ? (
          <AccountPerspective
            overview={overview}
            accounts={explorer?.accounts.items || []}
            selectedAccount={filters.account}
            onAccountClick={(account) => openTransactionsDrillDown({ account })}
            onMonthClick={handleMonthClick}
            onCategoryClick={handleCategoryClick}
            onMerchantClick={handleMerchantClick}
            loading={loading}
          />
        ) : (
          <VisualizationGrid
            overview={overview}
            heatmap={explorer?.heatmap.items || []}
            anomalies={explorer?.anomalies.items || []}
            onMonthClick={handleMonthClick}
            onCategoryClick={handleCategoryClick}
            onAccountClick={handleAccountClick}
            onMerchantClick={handleMerchantClick}
            loading={loading}
          />
        )}

        <SavedViews
          savedViews={savedViews}
          onSave={handleSaveView}
          onApply={handleApplyView}
          onDelete={handleDeleteView}
        />
      </main>
    </div>
  );
}
