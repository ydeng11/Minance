import type { ExplorerTrendItem } from "@/lib/api/types";
import { money } from "@/lib/utils";
import { getSharedFlowMaximum } from "../insightPresentation";

type Props = {
  items: ExplorerTrendItem[];
  selectedMonth: string | null;
  onSelectMonth: (month: string) => void;
};

function monthLabel(month: string) {
  const date = new Date(`${month}-01T12:00:00Z`);
  return Number.isNaN(date.getTime())
    ? month
    : new Intl.DateTimeFormat("en-US", { month: "short", year: "2-digit", timeZone: "UTC" }).format(date);
}

export function MoneyFlowTimeline({ items, selectedMonth, onSelectMonth }: Props) {
  const maximum = getSharedFlowMaximum(items);

  if (!items.length) {
    return <p className="py-12 text-center text-sm text-text-secondary">No operating activity in this range.</p>;
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-5 text-xs text-text-secondary">
        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-accent" />Income</span>
        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-text-muted/35" />Expenses</span>
        <span>One scale · transfers excluded</span>
      </div>
      <div className="grid min-h-56 grid-flow-col auto-cols-[minmax(76px,1fr)] items-end gap-2 overflow-x-auto pb-2" role="group" aria-label="Monthly income and expenses">
        {items.map((item) => {
          const incomeHeight = maximum ? Math.max(3, (item.income / maximum) * 160) : 3;
          const spendHeight = maximum ? Math.max(3, (item.spend / maximum) * 160) : 3;
          const selected = item.month === selectedMonth;
          return (
            <button
              key={item.month}
              type="button"
              aria-pressed={selected}
              aria-label={`${monthLabel(item.month)}: income ${money(item.income)}, expenses ${money(item.spend)}, net ${money(item.net)}`}
              onClick={() => onSelectMonth(item.month)}
              className={`group flex min-h-52 min-w-[76px] flex-col justify-end rounded-2xl px-2 pt-3 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-focus-ring ${selected ? "bg-accent-soft" : "hover:bg-surface-elevated"}`}
            >
              <span className="flex h-40 items-end justify-center gap-1.5" aria-hidden="true">
                <span className="w-4 rounded-t-md bg-accent transition-all" style={{ height: incomeHeight }} />
                <span className="w-4 rounded-t-md bg-text-muted/35 transition-all" style={{ height: spendHeight }} />
              </span>
              <span className="mt-3 block text-center text-xs font-medium text-text-secondary">{monthLabel(item.month)}</span>
            </button>
          );
        })}
      </div>
      <div className="sr-only">
        <table>
          <caption>Monthly operating money flow</caption>
          <thead><tr><th>Month</th><th>Income</th><th>Expenses</th><th>Net</th></tr></thead>
          <tbody>{items.map((item) => <tr key={item.month}><th>{item.month}</th><td>{item.income}</td><td>{item.spend}</td><td>{item.net}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
