import type { InsightDriver } from "@/lib/api/types";
import { money } from "@/lib/utils";
import { buildDriverDisplayRows } from "../insightPresentation";

type Props = {
  drivers: InsightDriver[];
  selectedKey: string | null;
  onSelect: (driver: InsightDriver) => void;
};

export function ChangeDriversChart({ drivers, selectedKey, onSelect }: Props) {
  const rows = buildDriverDisplayRows(drivers);
  const maximum = Math.max(1, ...rows.map((row) => Math.abs(row.delta)));

  if (!rows.length) {
    return <p className="py-10 text-sm text-text-secondary">No prior-period driver comparison is available.</p>;
  }

  return (
    <div className="space-y-2" role="group" aria-label="Expense change drivers">
      {rows.map((row) => {
        const width = Math.max(2, (Math.abs(row.delta) / maximum) * 50);
        const selected = row.key === selectedKey;
        return (
          <button
            key={row.key}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(row)}
            className={`grid min-h-14 w-full grid-cols-[minmax(110px,0.7fr)_minmax(160px,1.3fr)_auto] items-center gap-3 rounded-2xl px-3 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-focus-ring ${selected ? "bg-accent-soft" : "hover:bg-surface-elevated"}`}
          >
            <span className="truncate text-sm font-medium text-text-primary">{row.label}</span>
            <span className="relative h-5" aria-hidden="true">
              <span className="absolute inset-y-0 left-1/2 w-px bg-border-strong" />
              <span
                className={`absolute top-1/2 h-2.5 -translate-y-1/2 rounded-full ${row.delta >= 0 ? "left-1/2 bg-warning" : "right-1/2 bg-accent"}`}
                style={{ width: `${width}%` }}
              />
            </span>
            <span className={`text-right text-sm font-semibold tabular-nums ${row.delta > 0 ? "text-warning" : "text-accent"}`}>
              {row.delta > 0 ? "+" : ""}{money(row.delta)}
            </span>
          </button>
        );
      })}
      <div className="sr-only">
        <table><caption>Expense change drivers</caption><thead><tr><th>Driver</th><th>Current</th><th>Previous</th><th>Change</th></tr></thead><tbody>{rows.map((row) => <tr key={row.key}><th>{row.label}</th><td>{row.current}</td><td>{row.previous}</td><td>{row.delta}</td></tr>)}</tbody></table>
      </div>
    </div>
  );
}
