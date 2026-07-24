"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LineChart } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { useApi } from "@/hooks/useApi";
import type { Account, Category, InsightFactsResponse, ExplorerAnalyticsResponse, SavedView } from "@/lib/api/types";
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
import { getSharedFilters, setSharedFilters } from "@/lib/sharedFilters";
import { RANGE_OPTIONS } from "@/lib/constants";
import { ExplorerViewContent } from "./components/ExplorerViewContent";
import { SavedViewsToolbar } from "./components/SavedViews";
import { MoneyFlowTimeline } from "./components/MoneyFlowTimeline";
import { ChangeDriversChart } from "./components/ChangeDriversChart";
import { InsightEvidenceLedger } from "./components/InsightEvidenceLedger";
import { useViewController } from "@/components/view/ViewController";
import { DEFAULT_SAVED_VIEW_ID, buildExplorerSavedViews, isDefaultSavedView } from "./savedViews";
import { buildInsightHeadline } from "./insightPresentation";

type DriverDimension = "category" | "account" | "merchant";

const PANEL_CLASS = "rounded-[28px] border border-border-subtle bg-surface-panel/75 p-5 shadow-panel sm:p-6";
const FOCUS_RING_CLASS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg";

function monthBounds(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return {
    start: `${month}-01`,
    end: new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10)
  };
}

export default function ExplorerPage() {
  const api = useApi();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { registerView } = useViewController();
  const parsedFilters = useMemo(() => toValidExplorerFilterState(parseExplorerFilterState(searchParams)), [searchParams]);
  const [filters, setFilters] = useState(parsedFilters);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [explorer, setExplorer] = useState<ExplorerAnalyticsResponse | null>(null);
  const [insights, setInsights] = useState<InsightFactsResponse | null>(null);
  const [monthInsights, setMonthInsights] = useState<InsightFactsResponse | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState(() => searchParams.get("currency") || "");
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [dimension, setDimension] = useState<DriverDimension>("category");
  const [selectedDriverKey, setSelectedDriverKey] = useState<string | null>(null);
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [activeSavedViewId, setActiveSavedViewId] = useState(DEFAULT_SAVED_VIEW_ID);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const syncFilters = useCallback((nextFilters: typeof filters) => {
    const next = toValidExplorerFilterState(nextFilters);
    setFilters(next);
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
    if (selectedCurrency) nextSearchParams.set("currency", selectedCurrency);
    router.push(`/explorer?${nextSearchParams.toString()}`);
  }, [router, selectedCurrency]);

  const updateFilters = useCallback((updates: Partial<typeof filters>) => {
    syncFilters({ ...filters, ...updates });
  }, [filters, syncFilters]);

  useEffect(() => setFilters(parsedFilters), [parsedFilters]);

  useEffect(() => {
    if (searchParams.toString()) return;
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
    const params = buildExplorerFilterSearchParams(merged);
    router.replace(`/explorer?${params.toString()}`);
    // Initial shared-filter hydration is intentionally one-shot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    Promise.all([api.categories.list(), api.accounts.list(), api.savedViews.list()])
      .then(([categoryData, accountData, viewData]) => {
        setCategories(categoryData.categories);
        setAccounts(accountData.accounts);
        setSavedViews(viewData.items);
      })
      .catch((error) => setMessage(error instanceof ApiError ? error.message : "Failed to load Explorer metadata."));
  }, [api]);

  const insightParams = useMemo(() => {
    const analyticsParams = toExplorerAnalyticsApiParams(filters);
    return {
      range: analyticsParams.range,
      start: analyticsParams.start,
      end: analyticsParams.end,
      currency: selectedCurrency || undefined,
      category_view: analyticsParams.category_view,
      account: analyticsParams.account,
      category: analyticsParams.category,
      invert_categories: analyticsParams.invert_categories,
      merchant: analyticsParams.merchant,
      tag: analyticsParams.tag,
      recurring_rule_id: analyticsParams.recurring_rule_id,
      min_amount: analyticsParams.min_amount,
      max_amount: analyticsParams.max_amount
    };
  }, [filters, selectedCurrency]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setMessage("");
    Promise.all([
      api.analytics.explorer({ ...toExplorerAnalyticsApiParams(filters), currency: selectedCurrency || undefined }),
      api.analytics.insights(insightParams),
      api.savedViews.list()
    ]).then(([explorerData, insightData, viewData]) => {
      if (!active) return;
      setExplorer(explorerData);
      setInsights(insightData);
      setSavedViews(viewData.items);
      const months = explorerData.trend.items.map((item) => item.month);
      setSelectedMonth((current) => current && months.includes(current) ? current : months.at(-1) || null);
    }).catch((error) => {
      if (active) setMessage(error instanceof ApiError ? error.message : "Failed to load Explorer analysis.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [api, filters, insightParams, selectedCurrency]);

  useEffect(() => {
    if (!selectedMonth || !insights?.scope.currency) {
      setMonthInsights(null);
      return;
    }
    const bounds = monthBounds(selectedMonth);
    let active = true;
    setMonthInsights(null);
    api.analytics.insights({
      ...insightParams,
      range: undefined,
      ...bounds,
      currency: insights.scope.currency
    }).then((result) => {
      if (active) setMonthInsights(result);
    }).catch(() => {
      if (active) setMonthInsights(null);
    });
    return () => { active = false; };
  }, [api, insightParams, insights?.scope.currency, selectedMonth]);

  const visibleInsights = monthInsights || insights;
  const drivers = visibleInsights?.changeAttribution?.dimensions[dimension] || [];
  const selectedDriver = drivers.find((driver) => driver.key === selectedDriverKey) || drivers.find((driver) => driver.meaningful) || drivers[0] || null;

  useEffect(() => {
    setSelectedDriverKey(null);
  }, [dimension, selectedMonth]);

  const openTransactions = useCallback((overrides: Partial<{ category: string; account: string; merchant: string; query: string }>) => {
    const bounds = selectedMonth ? monthBounds(selectedMonth) : null;
    const transactionFilters = toValidTransactionsFilterState({
      ...createDefaultTransactionsFilterState(),
      query: overrides.query || "",
      categories: [overrides.category || ""].filter(Boolean),
      accounts: [overrides.account || ""].filter(Boolean),
      range: bounds ? "custom" : filters.range,
      start: bounds?.start || filters.start,
      end: bounds?.end || filters.end,
      categoryView: filters.categoryView,
      transactionTypes: ["expense"],
      page: 1
    });
    const params = buildTransactionsFilterSearchParams(transactionFilters);
    if (overrides.merchant) params.set("query", overrides.merchant);
    router.push(`/transactions?${params.toString()}`);
  }, [filters, router, selectedMonth]);

  const handleSaveView = useCallback(async (view: SavedView) => {
    try {
      const response = view.id === DEFAULT_SAVED_VIEW_ID
        ? await api.savedViews.create("Default", { ...filters })
        : await api.savedViews.update(view.id, view.name, { ...filters });
      setSavedViews((previous) => [response.view, ...previous.filter((entry) => entry.id !== response.view.id && !(isDefaultSavedView(response.view) && isDefaultSavedView(entry)))]);
      setActiveSavedViewId(response.view.id);
      setMessage(`Saved view: ${response.view.name}`);
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Failed to save view.");
    }
  }, [api, filters]);

  const handleCreateView = useCallback(async (name: string) => {
    if (name.trim().toLowerCase() === "default") return handleSaveView(buildExplorerSavedViews(savedViews)[0]);
    try {
      const response = await api.savedViews.create(name, { ...filters });
      setSavedViews((previous) => [response.view, ...previous]);
      setActiveSavedViewId(response.view.id);
      setMessage(`Saved view: ${response.view.name}`);
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Failed to save view.");
    }
  }, [api, filters, handleSaveView, savedViews]);

  const handleApplyView = useCallback((view: SavedView) => {
    setActiveSavedViewId(view.id);
    syncFilters(savedExplorerFiltersToState(view.filters));
  }, [syncFilters]);

  const handleDeleteView = useCallback(async (view: SavedView) => {
    try {
      if (view.id !== DEFAULT_SAVED_VIEW_ID) await api.savedViews.remove(view.id);
      setSavedViews((previous) => previous.filter((entry) => entry.id !== view.id));
      if (activeSavedViewId === view.id || isDefaultSavedView(view)) {
        setActiveSavedViewId(DEFAULT_SAVED_VIEW_ID);
        syncFilters(savedExplorerFiltersToState({}));
      }
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Failed to remove view.");
    }
  }, [activeSavedViewId, api, syncFilters]);

  const viewContent = useMemo(() => <ExplorerViewContent filters={filters} accounts={accounts} categories={categories} availableTags={explorer?.meta.availableTags || []} amountBounds={explorer?.meta.amountBounds || null} onApply={syncFilters} />, [accounts, categories, explorer, filters, syncFilters]);
  const viewToolbar = useMemo(() => <SavedViewsToolbar savedViews={savedViews} activeViewId={activeSavedViewId} onSave={handleSaveView} onCreate={handleCreateView} onApply={handleApplyView} onDelete={handleDeleteView} loading={loading} />, [activeSavedViewId, handleApplyView, handleCreateView, handleDeleteView, handleSaveView, loading, savedViews]);

  useEffect(() => {
    registerView({ title: "Explorer filters", description: "Adjust the analysis scope without leaving the page.", content: viewContent, toolbar: viewToolbar });
    return () => registerView(null);
  }, [registerView, viewContent, viewToolbar]);

  const dateRangeDisplay = filters.range === "custom" && filters.start && filters.end
    ? `${filters.start} to ${filters.end}`
    : RANGE_OPTIONS.find((option) => option.value === filters.range)?.label || filters.range;
  const activeFilterLabels = [
    filters.account && `Account: ${accounts.find((account) => account.id === filters.account || account.normalizedKey === filters.account)?.displayName || filters.account}`,
    filters.categories.length && buildExplorerCategoryFilterLabel(filters.categories, filters.invertCategories),
    filters.merchant && `Merchant: ${filters.merchant}`,
    filters.recurring && "Recurring only"
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-7" data-testid="explorer-page">
      <header className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-accent/30 bg-accent-soft text-accent"><LineChart className="h-6 w-6" /></div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-accent">Follow the money</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">Explorer</h1>
          <p className="mt-1 text-text-secondary">See what changed, why it changed, and the transactions behind it · {dateRangeDisplay}</p>
        </div>
      </header>

      {message ? <StatusMessage>{message}</StatusMessage> : null}
      {activeFilterLabels.length ? <div className="flex flex-wrap gap-2">{activeFilterLabels.map((label) => <span key={label} className="rounded-full border border-border-subtle bg-surface-field px-3 py-1.5 text-sm text-text-secondary">{label}</span>)}</div> : null}

      {insights && !insights.scope.currency && insights.scope.availableCurrencies.length > 1 ? (
        <section className={PANEL_CLASS}>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">Choose a currency</p>
          <h2 className="mt-2 text-xl font-semibold text-text-primary">Currencies are never silently combined.</h2>
          <div className="mt-4 flex flex-wrap gap-2">{insights.scope.availableCurrencies.map((currency) => <button key={currency} type="button" onClick={() => setSelectedCurrency(currency)} className={`min-h-11 rounded-full border border-border-subtle px-4 text-sm font-semibold text-text-primary hover:bg-surface-elevated ${FOCUS_RING_CLASS}`}>{currency}</button>)}</div>
        </section>
      ) : (
        <>
          <section className={PANEL_CLASS} aria-labelledby="flow-title">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
              <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">Operating flow</p><h2 id="flow-title" className="mt-2 text-2xl font-semibold text-text-primary">Income and expenses, together</h2></div>
              {selectedMonth ? <button type="button" onClick={() => { const bounds = monthBounds(selectedMonth); updateFilters({ range: "custom", ...bounds }); }} className={`min-h-11 rounded-full bg-accent px-4 text-sm font-semibold text-app-bg hover:opacity-90 ${FOCUS_RING_CLASS}`}>Focus Explorer on {selectedMonth}</button> : null}
            </div>
            {loading ? <p className="py-16 text-center text-sm text-text-secondary">Building the money-flow view…</p> : <MoneyFlowTimeline items={explorer?.trend.items || []} selectedMonth={selectedMonth} onSelectMonth={setSelectedMonth} />}
          </section>

          <section className={PANEL_CLASS} aria-labelledby="drivers-title">
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">Why it changed</p><h2 id="drivers-title" className="mt-2 text-2xl font-semibold text-text-primary">{buildInsightHeadline(visibleInsights?.changeAttribution || null)}</h2></div>
              <div className="inline-flex w-fit rounded-full border border-border-subtle bg-surface-field p-1" aria-label="Driver dimension">{(["category", "account", "merchant"] as DriverDimension[]).map((item) => <button key={item} type="button" aria-pressed={dimension === item} onClick={() => setDimension(item)} className={`min-h-10 rounded-full px-4 text-sm capitalize outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${dimension === item ? "bg-surface-panel font-semibold text-text-primary shadow-sm" : "text-text-secondary"}`}>{item}</button>)}</div>
            </div>
            <ChangeDriversChart drivers={drivers} selectedKey={selectedDriver?.key || null} onSelect={(driver) => setSelectedDriverKey(driver.key)} />
          </section>

          <section className={PANEL_CLASS} aria-labelledby="evidence-title">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">Transaction evidence</p>
            <h2 id="evidence-title" className="mt-2 text-2xl font-semibold text-text-primary">{selectedDriver ? selectedDriver.label : "Choose a driver"}</h2>
            <div className="mt-3"><InsightEvidenceLedger driver={selectedDriver} onOpenTransaction={(entry) => openTransactions({ query: entry.merchant })} onOpenAll={() => openTransactions({ category: dimension === "category" ? selectedDriver?.key : "", account: dimension === "account" ? selectedDriver?.key : "", merchant: dimension === "merchant" ? selectedDriver?.key : "" })} /></div>
          </section>

          <footer className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs text-text-muted">
            <span>{insights?.scope.transactionCount || 0} transactions · {insights?.scope.accountsRepresented || 0} accounts · {insights?.scope.currency || "—"}</span>
            <span>{insights?.scope.reviewNeededCount || 0} need category review · transfers excluded</span>
          </footer>
        </>
      )}
    </div>
  );
}
