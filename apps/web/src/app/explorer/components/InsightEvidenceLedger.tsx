import type { InsightDriver } from "@/lib/api/types";
import { money } from "@/lib/utils";

type Props = {
  driver: InsightDriver | null;
  onOpenTransaction: (entry: InsightDriver["evidence"][number]) => void;
  onOpenAll: () => void;
};

export function InsightEvidenceLedger({ driver, onOpenTransaction, onOpenAll }: Props) {
  if (!driver || driver.key === "__other__") {
    return <p className="py-10 text-sm text-text-secondary">Choose a named driver to inspect the transactions behind it.</p>;
  }

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <p className="text-sm text-text-secondary">Largest current-period transactions for {driver.label}</p>
        <button type="button" onClick={onOpenAll} className="min-h-11 text-sm font-semibold text-accent outline-none hover:underline focus-visible:ring-2 focus-visible:ring-focus-ring">Open all transactions</button>
      </div>
      <div className="divide-y divide-border-subtle">
        {driver.evidence.map((entry) => (
          <button
            key={entry.transactionId}
            type="button"
            onClick={() => onOpenTransaction(entry)}
            className="grid min-h-16 w-full grid-cols-[1fr_auto] items-center gap-4 rounded-xl px-2 text-left outline-none transition hover:bg-surface-elevated focus-visible:ring-2 focus-visible:ring-focus-ring"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-text-primary">{entry.merchant}</span>
              <span className="mt-1 block truncate text-xs text-text-secondary">{entry.transactionDate} · {entry.category} · {entry.accountName}</span>
            </span>
            <span className="text-sm font-semibold tabular-nums text-text-primary">{money(entry.amount)}</span>
          </button>
        ))}
        {!driver.evidence.length ? <p className="py-8 text-sm text-text-secondary">No current-period transactions for this driver.</p> : null}
      </div>
    </div>
  );
}
