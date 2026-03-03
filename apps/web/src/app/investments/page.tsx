"use client";

import { useEffect, useMemo, useState } from "react";
import { MoreHorizontal, Search, TrendingUp } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import type {
  InvestmentAccountSummary,
  InvestmentAllocation,
  InvestmentOverviewResponse,
  InvestmentPosition
} from "@/lib/api/types";
import { useApi } from "@/hooks/useApi";
import { money } from "@/lib/utils";

const timeFrames = ["1D", "1W", "1M", "3M", "YTD", "1Y", "ALL"] as const;
type Timeframe = (typeof timeFrames)[number];
type PositionSort = "value_desc" | "value_asc" | "day_change_desc" | "symbol_asc";

const fallbackOverviewSeries = [42, 37, 46, 34, 40, 38, 49, 44, 53, 47, 58, 54, 61];
const fallbackSecuritySeries = [36, 33, 40, 31, 37, 35, 44, 41, 49, 43, 51, 47, 54];

const fallbackFeaturedSecurity: InvestmentPosition = {
  id: "invhold_fallback_nflx",
  user_id: "fallback",
  holding_key: "fallback-nflx-holding",
  account_name: "Robinhood",
  symbol: "NFLX",
  asset_name: "Netflix Inc",
  asset_class: "equity",
  quantity: 2.87,
  average_cost: 224.54,
  market_price: 299.05,
  previous_close_price: 295.98,
  currency: "USD",
  as_of_date: "2026-03-01",
  source_type: "manual",
  source_file_id: null,
  created_at: "2026-03-01T00:00:00.000Z",
  updated_at: "2026-03-01T00:00:00.000Z",
  market_value: 858.27,
  cost_basis: 644.43,
  unrealized_gain: 213.84,
  unrealized_return_pct: 33.18,
  day_change_value: 8.81,
  day_change_pct: 1.04
};

const fallbackAccounts: InvestmentAccountSummary[] = [
  {
    account_name: "Robinhood",
    latest_as_of_date: "2026-03-01",
    day_change_pct: 1.81,
    day_change_value: 111.87,
    market_value: 6281.54,
    cost_basis: 5599.67,
    unrealized_gain: 681.87,
    position_count: 5
  },
  {
    account_name: "Coinbase",
    latest_as_of_date: "2026-03-01",
    day_change_pct: -0.22,
    day_change_value: -7.41,
    market_value: 3360.12,
    cost_basis: 3491.24,
    unrealized_gain: -131.12,
    position_count: 2
  },
  {
    account_name: "Wealthfront",
    latest_as_of_date: "2026-03-01",
    day_change_pct: 1.97,
    day_change_value: 56.24,
    market_value: 2906.82,
    cost_basis: 2710.56,
    unrealized_gain: 196.26,
    position_count: 3
  }
];

const fallbackAllocations: InvestmentAllocation[] = [
  { asset_class: "equity", market_value: 0, share_pct: 43.61 },
  { asset_class: "crypto", market_value: 0, share_pct: 29.61 },
  { asset_class: "etf", market_value: 0, share_pct: 26.77 }
];

function Sparkline({ values, gradientId, lineColor }: { values: number[]; gradientId: string; lineColor: string }) {
  const width = 460;
  const height = 188;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);

  const points = values
    .map((value, index) => {
      const x = (index / Math.max(1, values.length - 1)) * width;
      const y = height - ((value - min) / span) * height;
      return `${x},${y}`;
    })
    .join(" ");

  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-44 w-full" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity="0.28" />
          <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#${gradientId})`} />
      <polyline points={points} fill="none" stroke={lineColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function formatSignedPercent(value: number, digits = 2) {
  const magnitude = Math.abs(Number(value || 0)).toFixed(digits);
  const sign = value >= 0 ? "+" : "-";
  return `${sign} ${magnitude}%`;
}

function formatSignedNumber(value: number, digits = 2) {
  const magnitude = Math.abs(Number(value || 0)).toFixed(digits);
  const sign = value >= 0 ? "+" : "-";
  return `${sign}${magnitude}`;
}

function formatLabelFromAssetClass(value: string) {
  return String(value || "Other")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatRelativeDate(value: string | null) {
  if (!value) {
    return "No updates";
  }
  return `As of ${value}`;
}

function sortPositions(items: InvestmentPosition[], mode: PositionSort) {
  const next = [...items];
  next.sort((left, right) => {
    if (mode === "value_asc") {
      return left.market_value - right.market_value;
    }
    if (mode === "day_change_desc") {
      return right.day_change_value - left.day_change_value;
    }
    if (mode === "symbol_asc") {
      return left.symbol.localeCompare(right.symbol);
    }
    return right.market_value - left.market_value;
  });
  return next;
}

export default function InvestmentsPage() {
  const api = useApi();
  const [timeframe, setTimeframe] = useState<Timeframe>("3M");
  const [searchQuery, setSearchQuery] = useState("");
  const [positionSort, setPositionSort] = useState<PositionSort>("value_desc");
  const [overview, setOverview] = useState<InvestmentOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    const timeoutId = setTimeout(() => {
      void (async () => {
        setLoading(true);
        try {
          const response = await api.investments.overview({
            timeframe,
            query: searchQuery || undefined
          });
          if (!cancelled) {
            setOverview(response.overview);
            setMessage("");
          }
        } catch (error) {
          if (cancelled) {
            return;
          }
          if (error instanceof ApiError) {
            setMessage(error.message);
          } else {
            setMessage("Failed to load investments overview.");
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      })();
    }, 150);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [api, timeframe, searchQuery]);

  const hasLiveData = Boolean(overview?.meta?.total_positions && overview.meta.total_positions > 0);
  const showFallback = !overview && loading;

  const featuredSecurity = hasLiveData
    ? overview?.featured_security || overview?.positions?.[0] || null
    : showFallback
      ? fallbackFeaturedSecurity
      : null;

  const accounts = useMemo(
    () => (hasLiveData ? overview?.accounts || [] : showFallback ? fallbackAccounts : []),
    [hasLiveData, overview, showFallback]
  );

  const allocations = useMemo(
    () => (hasLiveData ? overview?.allocations || [] : showFallback ? fallbackAllocations : []),
    [hasLiveData, overview, showFallback]
  );

  const positions = useMemo(() => {
    if (hasLiveData) {
      return overview?.positions || [];
    }
    return showFallback ? [fallbackFeaturedSecurity] : [];
  }, [hasLiveData, overview, showFallback]);

  const sortedPositions = useMemo(() => sortPositions(positions, positionSort), [positions, positionSort]);

  const overviewSeries = useMemo(() => {
    const values = overview?.performance?.portfolio?.map((point) => point.total_market_value) || [];
    if (values.length >= 2) {
      return values;
    }
    if (showFallback) {
      return fallbackOverviewSeries;
    }
    return [0, 0, 0];
  }, [overview, showFallback]);

  const securitySeries = useMemo(() => {
    const values = overview?.performance?.security?.map((point) => point.total_market_value) || [];
    if (values.length >= 2) {
      return values;
    }
    if (showFallback) {
      return fallbackSecuritySeries;
    }
    return [0, 0, 0];
  }, [overview, showFallback]);

  const totalMarketValue = hasLiveData ? overview?.summary.total_market_value || 0 : showFallback ? 13253 : 0;
  const totalReturnPct = hasLiveData ? overview?.summary.unrealized_return_pct || 0 : showFallback ? 2.29 : 0;
  const securityPriceChange = featuredSecurity
    ? featuredSecurity.previous_close_price == null
      ? featuredSecurity.day_change_value
      : Number((featuredSecurity.market_price - featuredSecurity.previous_close_price).toFixed(2))
    : 0;

  return (
    <div className="space-y-6" data-testid="investments-page">
      <header className="rounded-2xl border border-[#17446f] bg-[#031327] px-5 py-4 shadow-[0_0_0_1px_rgba(15,58,96,0.35)]">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-100">Investments</h2>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#24527f] bg-[#041b34] text-slate-200 transition hover:bg-[#072343]"
            aria-label="Open investments options"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </header>

      {message ? (
        <p className="rounded-lg border border-[#24527f] bg-[#031b34]/70 px-3 py-2 text-sm text-slate-200" data-testid="global-message">
          {message}
        </p>
      ) : null}

      {loading ? (
        <p className="text-xs uppercase tracking-wide text-slate-400" data-testid="investments-loading">
          Refreshing investments data...
        </p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]" data-testid="investments-main-grid">
        <div className="space-y-6">
          <section
            className="rounded-2xl border border-[#17446f] bg-gradient-to-b from-[#062141] via-[#041a32] to-[#031327] p-6 shadow-[0_8px_24px_rgba(3,12,26,0.5)]"
            data-testid="investments-overview-card"
          >
            <div className="mb-4 text-center">
              <p className={totalReturnPct >= 0 ? "text-sm font-semibold text-emerald-300" : "text-sm font-semibold text-rose-300"}>
                {formatSignedPercent(totalReturnPct)}
              </p>
              <p className="text-4xl font-semibold tracking-tight text-slate-100">{money(totalMarketValue)}</p>
              <p className="text-sm text-slate-400">portfolio market value</p>
            </div>

            <div className="rounded-xl border border-[#15456d] bg-[#03172c]/80 p-4">
              <div className={loading ? "opacity-70" : "opacity-100"}>
                <Sparkline values={overviewSeries} gradientId="overview-series" lineColor="#64dc7b" />
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-sm text-slate-300" role="group" aria-label="Overview time range">
                {timeFrames.map((entry) => (
                  <button
                    key={entry}
                    type="button"
                    onClick={() => setTimeframe(entry)}
                    aria-pressed={entry === timeframe}
                    className={
                      entry === timeframe
                        ? "rounded-full bg-[#24508a] px-3 py-1 font-semibold text-slate-100"
                        : "rounded-full px-3 py-1 text-slate-400 transition hover:bg-[#13345c] hover:text-slate-100"
                    }
                  >
                    {entry}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section
            className="rounded-2xl border border-[#17446f] bg-gradient-to-b from-[#041a32] to-[#031327] p-6"
            data-testid="investments-accounts-panel"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-100">Accounts</h3>
              <span className="text-xs uppercase tracking-wide text-slate-400">balance change</span>
            </div>

            <div className="space-y-4">
              {accounts.length ? (
                accounts.map((entry) => {
                  const tone = entry.day_change_pct >= 0 ? "up" : "down";
                  return (
                    <article key={entry.account_name} className="flex items-center justify-between rounded-xl border border-[#133c64] bg-[#031b34]/70 px-3 py-2">
                      <div>
                        <p className="font-medium text-slate-100">{entry.account_name}</p>
                        <p className="text-xs text-slate-400">{formatRelativeDate(entry.latest_as_of_date)}</p>
                      </div>
                      <div className="text-right">
                        <p
                          className={
                            tone === "up"
                              ? "text-sm font-medium text-emerald-300"
                              : "text-sm font-medium text-rose-300"
                          }
                        >
                          {formatSignedPercent(entry.day_change_pct)}
                        </p>
                        <p className="text-sm font-semibold text-slate-100">{money(entry.market_value)}</p>
                      </div>
                    </article>
                  );
                })
              ) : (
                <p className="rounded-xl border border-[#133c64] bg-[#031b34]/70 px-3 py-3 text-sm text-slate-300">
                  No linked investment accounts yet.
                </p>
              )}
            </div>

            <div className="mt-8">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-xl font-semibold text-slate-100">Allocation</h4>
                <span className="text-xs uppercase tracking-wide text-slate-400">By percentage</span>
              </div>
              <div className="space-y-3">
                {allocations.length ? (
                  allocations.map((entry) => (
                    <div key={entry.asset_class} className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
                      <span className="text-slate-200">{formatLabelFromAssetClass(entry.asset_class)}</span>
                      <div className="h-1.5 rounded-full bg-[#12355a]">
                        <div className="h-1.5 rounded-full bg-[#6c9cd8]" style={{ width: `${Math.max(0, Math.min(100, entry.share_pct))}%` }} />
                      </div>
                      <span className="text-sm font-medium text-slate-200">{entry.share_pct.toFixed(2)}%</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-300">Allocation appears after your first holdings import.</p>
                )}
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section
            className="rounded-2xl border border-[#17446f] bg-gradient-to-b from-[#041a32] to-[#031327] p-6"
            data-testid="investments-security-card"
          >
            {featuredSecurity ? (
              <>
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <span className="inline-flex rounded-md border border-[#255784] bg-[#06223f] px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-slate-300">
                      {formatLabelFromAssetClass(featuredSecurity.asset_class)}
                    </span>
                    <p className="mt-2 text-4xl font-semibold tracking-tight text-slate-100">{featuredSecurity.symbol}</p>
                    <p className="text-lg text-slate-400">{featuredSecurity.asset_name}</p>
                  </div>
                  <div className="text-right">
                    <p className={
                      securityPriceChange >= 0
                        ? "inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-300"
                        : "inline-flex items-center gap-1 rounded-full bg-rose-500/20 px-2 py-0.5 text-xs font-semibold text-rose-300"
                    }>
                      <TrendingUp className="h-3.5 w-3.5" /> {formatSignedNumber(securityPriceChange)}
                    </p>
                    <p className="mt-2 text-4xl font-semibold tracking-tight text-slate-100">{money(featuredSecurity.market_price)}</p>
                    <p className="text-sm text-slate-400">{formatRelativeDate(featuredSecurity.as_of_date)}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-[#15456d] bg-[#03172c]/80 p-4">
                  <div className={loading ? "opacity-70" : "opacity-100"}>
                    <Sparkline values={securitySeries} gradientId="security-series" lineColor="#64dc7b" />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-sm text-slate-300" role="group" aria-label="Security time range">
                    {timeFrames.map((entry) => (
                      <button
                        key={entry}
                        type="button"
                        onClick={() => setTimeframe(entry)}
                        aria-pressed={entry === timeframe}
                        className={
                          entry === timeframe
                            ? "rounded-full bg-[#24508a] px-3 py-1 font-semibold text-slate-100"
                            : "rounded-full px-3 py-1 text-slate-400 transition hover:bg-[#13345c] hover:text-slate-100"
                        }
                      >
                        {entry}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-[#15456d] bg-[#03172c]/80 p-4">
                <p className="text-sm text-slate-300">No security snapshots yet. Import holdings to unlock security performance.</p>
              </div>
            )}
          </section>

          <section
            className="rounded-2xl border border-[#17446f] bg-gradient-to-b from-[#041a32] to-[#031327] p-6"
            data-testid="investments-metrics-panel"
          >
            <h3 className="text-xl font-semibold text-slate-100">Metrics</h3>
            {featuredSecurity ? (
              <div className="mt-4 space-y-3 text-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Average cost</span>
                  <span className="font-semibold">{money(featuredSecurity.average_cost)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Total return</span>
                  <span className="font-semibold">
                    {money(featuredSecurity.unrealized_gain)} ({formatSignedPercent(featuredSecurity.unrealized_return_pct)})
                  </span>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-300">Metrics appear when position data is available.</p>
            )}
          </section>

          <section
            className="rounded-2xl border border-[#17446f] bg-gradient-to-b from-[#041a32] to-[#031327] p-6"
            data-testid="investments-positions-panel"
          >
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <h3 className="text-xl font-semibold text-slate-100">Positions</h3>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <label className="sr-only" htmlFor="investments-positions-sort">Sort positions</label>
                <select
                  id="investments-positions-sort"
                  value={positionSort}
                  onChange={(event) => setPositionSort(event.target.value as PositionSort)}
                  className="rounded-lg border border-[#24527f] bg-[#031a31] px-3 py-1.5 text-sm text-slate-100 outline-none transition focus:border-[#6c9cd8] focus:ring-1 focus:ring-[#6c9cd8]/40"
                  data-testid="investments-positions-sort"
                >
                  <option value="value_desc">Largest value</option>
                  <option value="value_asc">Smallest value</option>
                  <option value="day_change_desc">Top day gain</option>
                  <option value="symbol_asc">Symbol A-Z</option>
                </select>
                <div className="relative min-w-56">
                  <label htmlFor="investments-sidebar-search" className="sr-only">
                    Search positions
                  </label>
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    id="investments-sidebar-search"
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search"
                    className="w-full rounded-lg border border-[#24527f] bg-[#031a31] py-1.5 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-[#6c9cd8] focus:ring-1 focus:ring-[#6c9cd8]/40"
                    data-testid="investments-sidebar-search"
                  />
                </div>
              </div>
            </div>

            {sortedPositions.length ? (
              <div className="overflow-x-auto rounded-xl border border-[#133c64] bg-[#031b34]/70">
                <table className="min-w-full text-sm text-slate-200">
                  <thead className="bg-[#031428] text-xs uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Symbol</th>
                      <th className="px-3 py-2 text-left font-medium">Account</th>
                      <th className="px-3 py-2 text-right font-medium">Shares</th>
                      <th className="px-3 py-2 text-right font-medium">Market value</th>
                      <th className="px-3 py-2 text-right font-medium">Day change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedPositions.map((position) => (
                      <tr key={position.id} className="border-t border-[#133c64]">
                        <td className="px-3 py-2 font-semibold text-slate-100">{position.symbol}</td>
                        <td className="px-3 py-2">{position.account_name}</td>
                        <td className="px-3 py-2 text-right">{position.quantity.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right font-semibold text-slate-100">{money(position.market_value)}</td>
                        <td className={position.day_change_value >= 0 ? "px-3 py-2 text-right text-emerald-300" : "px-3 py-2 text-right text-rose-300"}>
                          {money(position.day_change_value)} ({formatSignedPercent(position.day_change_pct)})
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="rounded-xl border border-[#133c64] bg-[#031b34]/70 px-3 py-3 text-sm text-slate-300">
                No positions match your current filters.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
