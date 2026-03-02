import { PauseCircle, Repeat2, Archive } from "lucide-react";

const RECURRING_PLACEHOLDERS = [
  { id: "recur-rent", name: "Rent", cadence: "Monthly", status: "active", amount: "$1,850.00" },
  { id: "recur-streaming", name: "Streaming Bundle", cadence: "Monthly", status: "active", amount: "$27.99" },
  { id: "recur-insurance", name: "Auto Insurance", cadence: "Quarterly", status: "paused", amount: "$189.45" }
];

export default function RecurringsPage() {
  return (
    <div className="space-y-6" data-testid="recurrings-page">
      <header>
        <h2 className="text-3xl font-semibold tracking-tight">Recurrings</h2>
        <p className="text-neutral-400">Track recurring rules and their linked transaction patterns.</p>
      </header>

      <section className="rounded-2xl border border-neutral-900 bg-neutral-950/70 p-4">
        <h3 className="text-sm font-medium text-neutral-300">Recurring list</h3>
        <div className="mt-3 space-y-3">
          {RECURRING_PLACEHOLDERS.map((entry) => (
            <article key={entry.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-800 bg-neutral-900/60 px-3 py-3">
              <div>
                <p className="text-sm font-medium text-neutral-100">{entry.name}</p>
                <p className="text-xs text-neutral-400">{entry.cadence}</p>
              </div>
              <div className="flex items-center gap-3 text-sm text-neutral-300">
                <span>{entry.amount}</span>
                <span
                  className={
                    entry.status === "paused"
                      ? "inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-1 text-xs text-amber-300"
                      : "inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300"
                  }
                >
                  {entry.status === "paused" ? <PauseCircle className="h-3.5 w-3.5" /> : <Repeat2 className="h-3.5 w-3.5" />}
                  {entry.status}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-900 bg-neutral-950/70 p-4 text-sm text-neutral-300">
        <div className="flex items-center gap-2 text-neutral-200">
          <Archive className="h-4 w-4 text-neutral-400" />
          Lifecycle actions (pause/archive/delete) are wired in the recurrings UI/API parity beads.
        </div>
      </section>
    </div>
  );
}
