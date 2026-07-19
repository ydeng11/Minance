"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LineChart } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { useApi } from "@/hooks/useApi";
import type { Account, Category, ExplorerAnalyticsResponse, OverviewResponse, SavedView } from "@/lib/api/types";
import {
  buildTransactionsFilterSearchParams,
  createDefaultTransactionsFilterState,
  toValidFilterState as toValidTransactionsFilterState
} from "../transactions/filters";
import { StatusMessage } from "@/components/feedback/StatusMessage";
import {
  buildExplorerCategoryFilterLabel,
  buildExplorerFilterSearchParams,
  parseExplorerFilterState,
  savedExplorerFiltersToState,
  toValidExplorerFilterState,
  toExplorerAnalyticsApiParams,
  type ExplorerTransactionType
} from "./filters";
import { getSharedFilters, setSharedFilters, type TransactionTypeFilter } from "@/lib/sharedFilters";
import { RANGE_OPTIONS } from "@/lib/constants";
import { CategoryPerspective } from "./components/CategoryPerspective";
import { ExplorerPerspectiveTabs } from "./components/ExplorerPerspectiveTabs";
import { ExplorerSummaryBand } from "./components/ExplorerSummaryBand";
import { OverviewPerspective } from "./components/OverviewPerspective";
import { SavedViewsToolbar } from "./components/SavedViews";
import { ExplorerViewContent } from "./components/ExplorerViewContent";
import { VisualizationGrid } from "./components/VisualizationGrid";
import { useViewController } from "@/components/view/ViewController";
import { DEFAULT_SAVED_VIEW_ID, buildExplorerSavedViews, isDefaultSavedView } from "./savedViews";

const FOCUS_RING_CLASS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg";
const HEADER_ICON_CLASS =
  "flex h-12 w-12 items-center justify-center rounded-[18px] border border-accent/30 bg-accent-soft text-accent";
const HEADER_EYEBROW_CLASS = "text-[11px] font-medium uppercase tracking-[0.28em] text-accent";
const HEADER_TITLE_CLASS = "mt-2 text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl";
const HEADER_COPY_CLASS = "mt-2 max-w-2xl text-text-secondary";
const ACTIVE_FILTERS_PANEL_CLASS =
  "rounded-2xl border border-border-subtle bg-surface-panel/80 p-4 shadow-panel";
const ACTIVE_FILTER_BUTTON_CLASS =
  `inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface-field px-3 py-1.5 text-sm text-text-primary transition hover:bg-surface-elevated ${FOCUS_RING_CLASS}`;
const ACTIVE_FILTER_REMOVE_ICON_CLASS = "text-text-muted";

export default function ExplorerPage() {
  const api = useApi();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { registerView } = useViewController();

  // Parse and validate filters from URL
  const parsedFilters = useMemo(
    () => toValidExplorerFilterState(parseExplorerFilterState(searchParams)),
    [searchParams]
  );

  // State
  const [filters, setFilters] = useState(parsedFilters);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [explorer, setExplorer] = useState<ExplorerAnalyticsResponse | null>(null);
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [activeSavedViewId, setActiveSavedViewId] = useState(DEFAULT_SAVED_VIEW_ID);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const syncFilters = useCallback(
    (nextFilters: typeof filters) => {
      const next = toValidExplorerFilterState(nextFilters);
      setFilters(next);

      // Update shared filters for cross-page sync
      setSharedFilters({
        range: next.range,
        start: next.start,
        end: next.end,
        categories: next.categories,
        accounts: next.account ? [next.account] : [],
        tag: next.tag,
        transactionTypes: next.transactionTypes,
        categoryView: next.categoryView,
        recurring: next.recurring
      });

      const nextSearchParams = buildExplorerFilterSearchParams(next);
      router.push(`/explorer?${nextSearchParams.toString()}`);
    },
    [router]
  );

  // Sync filters with URL changes
  useEffect(() => {
    setFilters(parsedFilters);
  }, [parsedFilters]);

  // On mount, apply shared filters if no URL params present
  useEffect(() => {
    const hasUrlParams = searchParams.toString().length > 0;
    if (!hasUrlParams) {
      const shared = getSharedFilters();
      const merged = toValidExplorerFilterState({
        ...filters,
        range: shared.range,
        start: shared.start,
        end: shared.end,
        categories: shared.categories,
        account: shared.accounts[0] || "",
        tag: shared.tag,
        transactionTypes: shared.transactionTypes as ExplorerTransactionType[],
        categoryView: shared.categoryView,
        recurring: shared.recurring
      });
      setFilters(merged);
      const nextSearchParams = buildExplorerFilterSearchParams(merged);
      router.replace(`/explorer?${nextSearchParams.toString()}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Apply the selected trend month to Explorer filters.
  const handleApplyMonthFilter = useCallback(
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
      updateFilters({ categories: [category] });
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
    (overrides: Partial<{ category: string; account: string; transactionType: "expense" | "income" | "transfer"; tag: string }>) => {
      const singleCategory = filters.categories.length === 1 ? filters.categories[0] : "";
      const singleTransactionType = filters.transactionTypes.length === 1 ? filters.transactionTypes[0] : null;
      const transactionTypeValue = overrides.transactionType ?? singleTransactionType;
      const transactionFilters = toValidTransactionsFilterState({
        ...createDefaultTransactionsFilterState(),
        categories: [overrides.category ?? singleCategory].filter(Boolean),
        accounts: [overrides.account ?? filters.account].filter(Boolean),
        minAmount: filters.minAmount,
        maxAmount: filters.maxAmount,
        range: filters.range,
        start: filters.start,
        end: filters.end,
        categoryView: filters.categoryView,
        transactionTypes: transactionTypeValue ? [transactionTypeValue] : [],
        tag: overrides.tag ?? filters.tag,
        recurring: filters.recurring,
        page: 1
      });
      const nextSearchParams = buildTransactionsFilterSearchParams(transactionFilters);
      router.push(`/transactions?${nextSearchParams.toString()}`);
    },
    [filters, router]
  );

  // Saved views handlers
  const handleSaveView = useCallback(async (view: SavedView) => {
    try {
      const response = view.id === DEFAULT_SAVED_VIEW_ID
        ? await api.savedViews.create("Default", { ...filters })
        : await api.savedViews.update(view.id, view.name, { ...filters });
      setSavedViews((previous) => {
        const withoutSavedView = previous.filter((entry) => entry.id !== response.view.id);
        const remainingViews = isDefaultSavedView(response.view)
          ? withoutSavedView.filter((entry) => !isDefaultSavedView(entry))
          : withoutSavedView;
        return [response.view, ...remainingViews];
      });
      setActiveSavedViewId(response.view.id);
      setMessage(`Saved view: ${response.view.name}`);
    } catch (error) {
      if (error instanceof ApiError) {
        setMessage(error.message);
      } else {
        setMessage("Failed to save view.");
      }
    }
  }, [api, filters]);

  const handleCreateView = useCallback(async (name: string) => {
    if (name.trim().toLowerCase() === "default") {
      await handleSaveView(buildExplorerSavedViews(savedViews)[0]);
      return;
    }
    try {
      const response = await api.savedViews.create(name, { ...filters });
      setSavedViews((previous) => [response.view, ...previous]);
      setActiveSavedViewId(response.view.id);
      setMessage(`Saved view: ${response.view.name}`);
    } catch (error) {
      if (error instanceof ApiError) {
        setMessage(error.message);
      } else {
        setMessage("Failed to save view.");
      }
    }
  }, [api, filters, handleSaveView, savedViews]);

  const handleApplyView = useCallback((view: SavedView) => {
    const nextFilters = savedExplorerFiltersToState(view.filters);
    setActiveSavedViewId(view.id);
    syncFilters(nextFilters);
    setMessage(`Applied view: ${view.name}`);
  }, [syncFilters]);

  const handleDeleteView = useCallback(async (view: SavedView) => {
    const resetToDefault = activeSavedViewId === view.id || isDefaultSavedView(view);
    try {
      if (view.id !== DEFAULT_SAVED_VIEW_ID) {
        await api.savedViews.remove(view.id);
        setSavedViews((previous) => previous.filter((entry) => entry.id !== view.id));
      }
      if (resetToDefault) {
        setActiveSavedViewId(DEFAULT_SAVED_VIEW_ID);
        syncFilters(savedExplorerFiltersToState({}));
      }
      setMessage(isDefaultSavedView(view) ? "Default view reset." : "Saved view removed.");
    } catch (error) {
      if (error instanceof ApiError) {
        setMessage(error.message);
      } else {
        setMessage("Failed to delete view.");
      }
    }
  }, [activeSavedViewId, api, syncFilters]);

  // Calculate date range display
  const dateRangeDisplay = useMemo(() => {
    if (filters.range === "custom" && filters.start && filters.end) {
      return `${filters.start} to ${filters.end}`;
    }
    const preset = RANGE_OPTIONS.find((option) => option.value === filters.range);
    return preset?.label ?? filters.range;
  }, [filters.range, filters.start, filters.end]);

  const overview = useMemo<OverviewResponse | null>(() => {
    if (!explorer) {
      return null;
    }

    return {
      summary: explorer.summary.current,
      trend: explorer.trend.items,
      topCategories: explorer.categories.items.filter((entry) => entry.amount > 0).slice(0, 5),
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
    const activeAccount = accounts.find(
      (account) =>
        filters.account === account.id ||
        filters.account === account.normalizedKey ||
        filters.account === account.displayName
    );

    if (filters.account) {
      items.push({
        key: "account",
        label: activeAccount?.displayName || filters.account,
        clear: () => updateFilters({ account: "" })
      });
    }
    if (filters.categories.length) {
      items.push({
        key: "category",
        label: buildExplorerCategoryFilterLabel(filters.categories, filters.invertCategories),
        clear: () => updateFilters({ categories: [] })
      });
    }
    if (filters.transactionTypes.length) {
      items.push({
        key: "type",
        label: `Types: ${filters.transactionTypes
          .map((transactionType) => transactionType.charAt(0).toUpperCase() + transactionType.slice(1))
          .join(", ")}`,
        clear: () => updateFilters({ transactionTypes: [] })
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
    if (filters.recurring) {
      items.push({
        key: "recurring",
        label: "Recurring only",
        clear: () => updateFilters({ recurring: false })
      });
    }
    if (filters.categoryView !== "granular") {
      items.push({
        key: "categoryView",
        label: `View: ${filters.categoryView === "coarse" ? "Coarse" : "Granular"}`,
        clear: () => updateFilters({ categoryView: "granular" })
      });
    }
    if (filters.range !== "90d") {
      const preset = RANGE_OPTIONS.find((option) => option.value === filters.range);
      items.push({
        key: "range",
        label:
          filters.range === "custom" && filters.start && filters.end
            ? `Range: ${filters.start} to ${filters.end}`
            : `Range: ${preset?.label || filters.range}`,
        clear: () => updateFilters({ range: "90d", start: "", end: "" })
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
  }, [accounts, filters, updateFilters]);

  const viewContent = useMemo(
    () => (
      <ExplorerViewContent
        filters={filters}
        accounts={accounts}
        categories={categories}
        availableTags={explorer?.meta?.availableTags || []}
        amountBounds={explorer?.meta?.amountBounds || null}
        onApply={syncFilters}
      />
    ),
    [accounts, categories, explorer?.meta?.amountBounds, explorer?.meta?.availableTags, filters, syncFilters]
  );

  const savedViewsToolbar = useMemo(
    () => (
      <SavedViewsToolbar
        savedViews={savedViews}
        activeViewId={activeSavedViewId}
        onSave={handleSaveView}
        onCreate={handleCreateView}
        onApply={handleApplyView}
        onDelete={handleDeleteView}
        loading={loading}
      />
    ),
    [
      activeSavedViewId,
      handleApplyView,
      handleCreateView,
      handleDeleteView,
      handleSaveView,
      loading,
      savedViews
    ]
  );

  useEffect(() => {
    registerView({
      title: "Explorer filters",
      description: "Adjust the analysis view from the shell without leaving the page.",
      content: viewContent,
      toolbar: savedViewsToolbar
    });

    return () => registerView(null);
  }, [registerView, savedViewsToolbar, viewContent]);

  return (
    <div className="space-y-8" data-testid="explorer-page">
      {/* Header */}
      <header className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <div className={HEADER_ICON_CLASS}>
            <LineChart className="h-6 w-6" />
          </div>
          <div>
            <p className={HEADER_EYEBROW_CLASS}>
              Analytics workspace
            </p>
            <h2 className={HEADER_TITLE_CLASS}>
              Explorer
            </h2>
            <p className={HEADER_COPY_CLASS}>
              Rich account and category analysis across {dateRangeDisplay.toLowerCase()}.
            </p>
          </div>
        </div>
      </header>

      {message && (
        <StatusMessage data-testid="explorer-message">
          {message}
        </StatusMessage>
      )}

      {activeFilters.length ? (
        <section
          className={ACTIVE_FILTERS_PANEL_CLASS}
          data-testid="explorer-active-filters"
        >
          <div className="flex flex-wrap items-center gap-2">
            {activeFilters.map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={filter.clear}
                className={ACTIVE_FILTER_BUTTON_CLASS}
              >
                {filter.label}
                <span className={ACTIVE_FILTER_REMOVE_ICON_CLASS}>×</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <main className="min-w-0 space-y-6">
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
            trend={explorer?.trend.items || []}
            trendRangeLabel={dateRangeDisplay}
            onApplyMonthFilter={handleApplyMonthFilter}
            onCategoryClick={handleCategoryClick}
            onMerchantClick={handleMerchantClick}
            loading={loading}
          />
        ) : filters.perspective === "category" ? (
          <CategoryPerspective
            overview={overview}
            categories={explorer?.categories.items || []}
            categoryWeekdayHeatmap={explorer?.categoryWeekdayHeatmap.items || []}
            selectedCategories={filters.categories}
            invertCategories={filters.invertCategories}
            onCategoryClick={handleCategoryClick}
            trend={explorer?.trend.items || []}
            onApplyMonthFilter={handleApplyMonthFilter}
            loading={loading}
          />
        ) : (
          <VisualizationGrid
            overview={overview}
            heatmap={explorer?.heatmap.items || []}
            anomalies={explorer?.anomalies.items || []}
            onApplyMonthFilter={handleApplyMonthFilter}
            onCategoryClick={handleCategoryClick}
            onAccountClick={handleAccountClick}
            onMerchantClick={handleMerchantClick}
            loading={loading}
          />
        )}

      </main>
    </div>
  );
}
