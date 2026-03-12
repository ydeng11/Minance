"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, LineChart, SlidersHorizontal } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { useApi } from "@/hooks/useApi";
import type { Account, Category, OverviewResponse, HeatmapItem, AnomalyItem, SavedView } from "@/lib/api/types";
import {
  buildExplorerFilterSearchParams,
  parseExplorerFilterState,
  savedExplorerFiltersToState,
  toValidExplorerFilterState,
  toExplorerAnalyticsApiParams
} from "./filters";
import { FilterSidebar } from "./components/FilterSidebar";
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
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [heatmap, setHeatmap] = useState<HeatmapItem[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyItem[]>([]);
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [showMobileFilters, setShowMobileFilters] = useState(false);

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
        const [overviewData, heatmapData, anomaliesData, viewsData] = await Promise.all([
          api.analytics.overview(analyticsParams),
          api.analytics.heatmap(analyticsParams),
          api.analytics.anomalies(analyticsParams),
          api.savedViews.list()
        ]);
        setOverview(overviewData);
        setHeatmap(heatmapData.items);
        setAnomalies(anomaliesData.items);
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

  return (
    <div className="space-y-6" data-testid="explorer-page">
      {/* Header */}
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10">
            <LineChart className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">Explorer</h2>
            <p className="text-neutral-400">
              Deep dive analytics and insights. {dateRangeDisplay}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Mobile filter toggle */}
          <button
            type="button"
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-neutral-800 bg-neutral-900 px-3 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800 lg:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </button>
          <button
            type="button"
            className="inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-neutral-800 bg-neutral-900 px-3 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
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

      {/* Main Content */}
      <div className="flex gap-6">
        {/* Filter Sidebar - Desktop always visible, Mobile toggleable */}
        <div className={showMobileFilters ? "block" : "hidden lg:block"}>
          <FilterSidebar
            filters={filters}
            onChange={updateFilters}
            categories={categories}
            accounts={accounts}
            availableTags={[]}
          />
        </div>

        {/* Main Content Area */}
        <main className="flex-1 space-y-6">
          {/* Visualizations */}
          <VisualizationGrid
            overview={overview}
            heatmap={heatmap}
            anomalies={anomalies}
            onMonthClick={handleMonthClick}
            onCategoryClick={handleCategoryClick}
            onAccountClick={handleAccountClick}
            onMerchantClick={handleMerchantClick}
            loading={loading}
          />

          {/* Saved Views */}
          <SavedViews
            savedViews={savedViews}
            onSave={handleSaveView}
            onApply={handleApplyView}
            onDelete={handleDeleteView}
          />
        </main>
      </div>
    </div>
  );
}
