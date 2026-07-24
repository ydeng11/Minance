"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CircleAlert, RefreshCw, WalletCards } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { RANGE_OPTIONS } from "@/lib/constants";
import { money } from "@/lib/utils";
import { useApi } from "@/hooks/useApi";
import type { InsightFactsResponse } from "@/lib/api/types";
import { StatusMessage } from "@/components/feedback/StatusMessage";
import { buildInsightHeadline } from "./explorer/insightPresentation";
import { buildHomeStories, describeOperatingFlow } from "./homeInsightPresentation";

const DASHBOARD_FILTERS_STORAGE_KEY = "minance:dashboard:filters";
const RANGE_VALUES: Set<string> = new Set(RANGE_OPTIONS.map((entry) => entry.value));
const PANEL_CLASS =
  "rounded-[30px] border border-border-subtle bg-surface-panel/75 p-5 shadow-panel sm:p-7";
const FOCUS_RING_CLASS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg";

export default function HomePage() {
  const api = useApi();
  const router = useRouter();
  const [range, setRange] = useState("3m");
  const [categoryView, setCategoryView] = useState<"granular" | "coarse">("granular");
  const [currency, setCurrency] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [insights, setInsights] = useState<InsightFactsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(DASHBOARD_FILTERS_STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { range?: string; categoryView?: string; currency?: string };
        if (RANGE_VALUES.has(saved.range || "")) setRange(saved.range || "3m");
        if (saved.categoryView === "coarse" || saved.categoryView === "granular") setCategoryView(saved.categoryView);
        if (typeof saved.currency === "string") setCurrency(saved.currency);
      }
    } catch {
      // Invalid session state should never block the financial brief.
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.sessionStorage.setItem(DASHBOARD_FILTERS_STORAGE_KEY, JSON.stringify({ range, categoryView, currency }));
  }, [categoryView, currency, hydrated, range]);

  useEffect(() => {
    if (!hydrated) return;
    let active = true;
    setLoading(true);
    setMessage("");
    api.analytics.insights({ range, category_view: categoryView, currency: currency || undefined })
      .then((result) => {
        if (!active) return;
        setInsights(result);
        if (currency && result.scope.availableCurrencies.length && !result.scope.availableCurrencies.includes(currency)) {
          setCurrency("");
        }
      })
      .catch((error) => {
        if (active) setMessage(error instanceof ApiError ? error.message : "Failed to build your financial brief.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [api, categoryView, currency, hydrated, range]);

  const stories = useMemo(() => insights ? buildHomeStories(insights) : null, [insights]);
  const leadDriver = insights?.changeAttribution?.dimensions.category.find((driver) => driver.meaningful)
    || insights?.changeAttribution?.dimensions.category[0];
  const showReviewStory = Boolean(insights?.reviewTransactions.length);
  const showCommitmentsStory = Boolean(
    insights?.recurring?.upcoming30Days.length
    || insights?.recurring?.priceDrift.length
    || insights?.recurring?.possibleRecurringCount
  );

  function openExplorer(overrides: Record<string, string> = {}) {
    const params = new URLSearchParams({ range, category_view: categoryView, compare: "previous", ...(currency ? { currency } : {}), ...overrides });
    router.push(`/explorer?${params.toString()}`);
  }

  function openTransactions(query: string) {
    const params = new URLSearchParams({ range, type: "expense", query });
    router.push(`/transactions?${params.toString()}`);
  }

  return (
    <div className="space-y-7" data-testid="dashboard-page">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">Your money brief</p>
          <h1 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight text-text-primary sm:text-5xl">What changed, what needs attention, and whether you’re okay.</h1>
        </div>
        <div className="flex flex-wrap gap-2 rounded-[22px] border border-border-subtle bg-surface-panel p-2 shadow-panel">
          <label className="sr-only" htmlFor="home-range">Date range</label>
          <select id="home-range" value={range} onChange={(event) => setRange(event.target.value)} className={`min-h-11 rounded-2xl border border-border-subtle bg-surface-field px-3 text-sm text-text-primary ${FOCUS_RING_CLASS}`}>
            {RANGE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <label className="sr-only" htmlFor="home-category-view">Category detail</label>
          <select id="home-category-view" value={categoryView} onChange={(event) => setCategoryView(event.target.value as "granular" | "coarse")} className={`min-h-11 rounded-2xl border border-border-subtle bg-surface-field px-3 text-sm text-text-primary ${FOCUS_RING_CLASS}`}>
            <option value="granular">Detailed categories</option>
            <option value="coarse">Broad categories</option>
          </select>
        </div>
      </header>

      {message ? <StatusMessage>{message}</StatusMessage> : null}

      {loading && !insights ? (
        <section className={`${PANEL_CLASS} flex min-h-72 items-center justify-center`}><span className="inline-flex items-center gap-2 text-sm text-text-secondary"><RefreshCw className="h-4 w-4 animate-spin" />Building your brief…</span></section>
      ) : insights && !insights.scope.currency && insights.scope.availableCurrencies.length > 1 ? (
        <section className={PANEL_CLASS}>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">One currency at a time</p>
          <h2 className="mt-2 text-2xl font-semibold text-text-primary">Choose the currency you want to understand.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">Minance will not combine unlike currencies into a misleading total.</p>
          <div className="mt-5 flex flex-wrap gap-2">{insights.scope.availableCurrencies.map((item) => <button key={item} type="button" onClick={() => setCurrency(item)} className={`min-h-11 rounded-full border border-border-subtle px-5 text-sm font-semibold text-text-primary hover:bg-surface-elevated ${FOCUS_RING_CLASS}`}>{item}</button>)}</div>
        </section>
      ) : insights?.operatingFlow ? (
        <>
          <section className={`${PANEL_CLASS} overflow-hidden`} aria-labelledby="flow-story-title" data-testid="home-primary-story">
            <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Operating flow · {insights.scope.currency}</p>
                <h2 id="flow-story-title" className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">{describeOperatingFlow(insights.operatingFlow)}</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary">{buildInsightHeadline(insights.changeAttribution)}</p>
                <button type="button" aria-label="Explain this operating flow in Explorer" onClick={() => openExplorer(leadDriver ? { category: leadDriver.key } : {})} className={`mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-app-bg hover:opacity-90 ${FOCUS_RING_CLASS}`}>Explain this change <ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
              </div>
              <dl className="grid grid-cols-3 gap-3 border-t border-border-subtle pt-5 lg:grid-cols-1 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0">
                <div><dt className="text-xs text-text-muted">Income</dt><dd className="mt-1 text-xl font-semibold tabular-nums text-text-primary">{money(insights.operatingFlow.current.income)}</dd></div>
                <div><dt className="text-xs text-text-muted">Expenses</dt><dd className="mt-1 text-xl font-semibold tabular-nums text-text-primary">{money(insights.operatingFlow.current.expense)}</dd></div>
                <div><dt className="text-xs text-text-muted">Net</dt><dd className={`mt-1 text-xl font-semibold tabular-nums ${insights.operatingFlow.current.net < 0 ? "text-warning" : "text-accent"}`}>{money(insights.operatingFlow.current.net)}</dd></div>
              </dl>
            </div>
            <p className="mt-7 border-t border-border-subtle pt-4 text-xs text-text-muted">{insights.scope.transactionCount} transactions · {insights.scope.accountsRepresented} accounts · transfers excluded{insights.scope.comparisonEligible ? " · compared with the preceding equal-length period" : " · more history needed for comparison"}</p>
          </section>

          {showReviewStory || showCommitmentsStory ? <div className="grid gap-6 xl:grid-cols-2">
            {showReviewStory ? <section className={PANEL_CLASS} aria-labelledby="review-title" data-testid="home-review-story">
              <div className="flex items-center gap-3"><CircleAlert className="h-5 w-5 text-warning" /><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">Worth a look</p><h2 id="review-title" className="mt-1 text-xl font-semibold text-text-primary">Transactions outside your usual pattern</h2></div></div>
              <div className="mt-5 divide-y divide-border-subtle">
                {insights.reviewTransactions.slice(0, 3).map((entry) => <button key={entry.transactionId} type="button" aria-label={`Open transactions for ${entry.merchant}, ${money(entry.amount)}`} onClick={() => openTransactions(entry.merchant)} className={`grid min-h-16 w-full grid-cols-[1fr_auto] items-center gap-4 rounded-xl px-2 text-left hover:bg-surface-elevated ${FOCUS_RING_CLASS}`}><span><span className="block text-sm font-medium text-text-primary">{entry.merchant}</span><span className="mt-1 block text-xs text-text-secondary">{entry.transactionDate} · {entry.category} · above your merchant pattern</span></span><span className="text-sm font-semibold tabular-nums text-text-primary">{money(entry.amount)}</span></button>)}
              </div>
            </section> : null}

            {showCommitmentsStory ? <section className={PANEL_CLASS} aria-labelledby="commitments-title" data-testid="home-commitments-story">
              <div className="flex items-center gap-3"><WalletCards className="h-5 w-5 text-accent" /><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">Commitments</p><h2 id="commitments-title" className="mt-1 text-xl font-semibold text-text-primary">Recurring money already in motion</h2></div></div>
              <div className="mt-5 flex items-baseline justify-between gap-4 border-b border-border-subtle pb-5"><span className="text-sm text-text-secondary">Active monthly equivalent</span><strong className="text-2xl tabular-nums text-text-primary">{money(insights.recurring?.activeMonthlyEquivalent || 0)}</strong></div>
              <div className="mt-4 space-y-3">
                {(insights.recurring?.upcoming30Days || []).slice(0, 2).map((entry) => <div key={entry.id} className="flex min-h-11 items-center justify-between gap-4"><span className="text-sm text-text-primary">{entry.name}<span className="ml-2 text-xs text-text-muted">{entry.nextRunAt}</span></span><span className="text-sm font-semibold tabular-nums text-text-primary">{money(entry.amount)}</span></div>)}
                {(insights.recurring?.priceDrift || []).slice(0, 1).map((entry) => <p key={entry.ruleId} className="rounded-2xl bg-warning-soft px-4 py-3 text-sm text-warning">{entry.name} changed from {money(entry.expectedAmount)} to {money(entry.recentAmount)}.</p>)}
                {insights.recurring?.possibleRecurringCount ? <button type="button" onClick={() => router.push("/recurrings?tab=suggestions")} className={`min-h-11 text-left text-sm font-semibold text-accent hover:underline ${FOCUS_RING_CLASS}`}>{insights.recurring.possibleRecurringCount} possible recurring {insights.recurring.possibleRecurringCount === 1 ? "pattern" : "patterns"} to review — not counted as commitments</button> : null}
              </div>
            </section> : null}
          </div> : null}
        </>
      ) : null}

      {stories ? <span className="sr-only">Showing one primary and {stories.supporting.length} supporting financial stories.</span> : null}
    </div>
  );
}
