import { MoreHorizontal, Search, TrendingUp } from "lucide-react";

const accountRows = [
  { name: "Robinhood", updated: "2 days ago", change: "+ 1.81%", value: "$ 6,281.54", tone: "up" as const },
  { name: "Coinbase", updated: "2 days ago", change: "- 0.22%", value: "$ 3,360.12", tone: "down" as const },
  { name: "Wealthfront", updated: "2 days ago", change: "+ 1.97%", value: "$ 2,906.82", tone: "up" as const }
];

const allocationRows = [
  { name: "Equity", value: "43.61%", width: "43.61%" },
  { name: "Crypto", value: "29.61%", width: "29.61%" },
  { name: "ETF", value: "26.77%", width: "26.77%" }
];

const timeFrames = ["1D", "1W", "1M", "3M", "YTD", "1Y", "ALL"];

const overviewSeries = [42, 37, 46, 34, 40, 38, 49, 44, 53, 47, 58, 54, 61];
const securitySeries = [36, 33, 40, 31, 37, 35, 44, 41, 49, 43, 51, 47, 54];

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

export default function InvestmentsPage() {
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

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]" data-testid="investments-main-grid">
        <div className="space-y-6">
          <section
            className="rounded-2xl border border-[#17446f] bg-gradient-to-b from-[#062141] via-[#041a32] to-[#031327] p-6 shadow-[0_8px_24px_rgba(3,12,26,0.5)]"
            data-testid="investments-overview-card"
          >
            <div className="mb-4 text-center">
              <p className="text-sm font-semibold text-emerald-300">+ 2.29%</p>
              <p className="text-4xl font-semibold tracking-tight text-slate-100">$13,253</p>
              <p className="text-sm text-slate-400">estimated return</p>
            </div>

            <div className="rounded-xl border border-[#15456d] bg-[#03172c]/80 p-4">
              <Sparkline values={overviewSeries} gradientId="overview-series" lineColor="#64dc7b" />
              <div className="mt-4 flex flex-wrap gap-2 text-sm text-slate-300">
                {timeFrames.map((entry) => (
                  <button
                    key={entry}
                    type="button"
                    className={
                      entry === "3M"
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
              <span className="text-xs uppercase tracking-wide text-slate-400">3M balance change</span>
            </div>

            <div className="space-y-4">
              {accountRows.map((entry) => (
                <article key={entry.name} className="flex items-center justify-between rounded-xl border border-[#133c64] bg-[#031b34]/70 px-3 py-2">
                  <div>
                    <p className="font-medium text-slate-100">{entry.name}</p>
                    <p className="text-xs text-slate-400">{entry.updated}</p>
                  </div>
                  <div className="text-right">
                    <p
                      className={
                        entry.tone === "up"
                          ? "text-sm font-medium text-emerald-300"
                          : "text-sm font-medium text-rose-300"
                      }
                    >
                      {entry.change}
                    </p>
                    <p className="text-sm font-semibold text-slate-100">{entry.value}</p>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-8">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-xl font-semibold text-slate-100">Allocation</h4>
                <span className="text-xs uppercase tracking-wide text-slate-400">By percentage</span>
              </div>
              <div className="space-y-3">
                {allocationRows.map((entry) => (
                  <div key={entry.name} className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
                    <span className="text-slate-200">{entry.name}</span>
                    <div className="h-1.5 rounded-full bg-[#12355a]">
                      <div className="h-1.5 rounded-full bg-[#6c9cd8]" style={{ width: entry.width }} />
                    </div>
                    <span className="text-sm font-medium text-slate-200">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section
            className="rounded-2xl border border-[#17446f] bg-gradient-to-b from-[#041a32] to-[#031327] p-6"
            data-testid="investments-security-card"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <span className="inline-flex rounded-md border border-[#255784] bg-[#06223f] px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-slate-300">
                  Stock
                </span>
                <p className="mt-2 text-4xl font-semibold tracking-tight text-slate-100">NFLX</p>
                <p className="text-lg text-slate-400">Netflix Inc</p>
              </div>
              <div className="text-right">
                <p className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                  <TrendingUp className="h-3.5 w-3.5" /> +3.07
                </p>
                <p className="mt-2 text-4xl font-semibold tracking-tight text-slate-100">$299.05</p>
                <p className="text-sm text-slate-400">Price at 4:00 PM</p>
              </div>
            </div>

            <div className="rounded-xl border border-[#15456d] bg-[#03172c]/80 p-4">
              <Sparkline values={securitySeries} gradientId="security-series" lineColor="#64dc7b" />
              <div className="mt-4 flex flex-wrap gap-2 text-sm text-slate-300">
                {timeFrames.map((entry) => (
                  <button
                    key={entry}
                    type="button"
                    className={
                      entry === "3M"
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
            data-testid="investments-metrics-panel"
          >
            <h3 className="text-xl font-semibold text-slate-100">Metrics</h3>
            <div className="mt-4 space-y-3 text-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Average cost</span>
                <span className="font-semibold">$224.54</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Total return</span>
                <span className="font-semibold">$213.84 (33.18%)</span>
              </div>
            </div>
          </section>

          <section
            className="rounded-2xl border border-[#17446f] bg-gradient-to-b from-[#041a32] to-[#031327] p-6"
            data-testid="investments-positions-panel"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-100">Positions</h3>
              <div className="relative hidden md:block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="search"
                  placeholder="Search"
                  className="rounded-lg border border-[#24527f] bg-[#031a31] py-1.5 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-[#6c9cd8] focus:ring-1 focus:ring-[#6c9cd8]/40"
                  data-testid="investments-sidebar-search"
                />
              </div>
            </div>

            <div className="rounded-xl border border-[#133c64] bg-[#031b34]/70 px-3 py-3">
              <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" aria-hidden="true" />
                <span className="text-slate-200">Robinhood · 2.87 shares</span>
                <span className="font-semibold text-slate-100">$858.27</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
