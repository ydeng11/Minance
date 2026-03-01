import Link from "next/link";
import { Building2, CreditCard, Plus } from "lucide-react";

const ACCOUNT_PLACEHOLDERS = [
  {
    id: "acct-checking",
    name: "Checking",
    provider: "Sample Bank",
    type: "depository",
    status: "connected"
  },
  {
    id: "acct-card",
    name: "Travel Card",
    provider: "Sample Card",
    type: "credit",
    status: "connected"
  }
];

export default function AccountsPage() {
  return (
    <div className="space-y-6" data-testid="accounts-page">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">Accounts</h2>
          <p className="text-neutral-400">Manage linked and manual accounts across your workspace.</p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm font-medium text-neutral-200 transition hover:border-emerald-500/40 hover:text-emerald-300"
        >
          <Plus className="h-4 w-4" />
          Add account
        </button>
      </header>

      <section className="rounded-2xl border border-neutral-900 bg-neutral-950/70 p-4">
        <h3 className="text-sm font-medium text-neutral-300">Connected accounts</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {ACCOUNT_PLACEHOLDERS.map((entry) => (
            <article key={entry.id} className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-medium text-neutral-100">{entry.name}</p>
                  <p className="text-xs uppercase tracking-wide text-neutral-500">{entry.provider}</p>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300">{entry.status}</span>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm text-neutral-300">
                {entry.type === "credit" ? <CreditCard className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                <span className="capitalize">{entry.type}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <p className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-300">
        Full account lifecycle flows are being implemented in the accounts parity bead. For now, use{" "}
        <Link href="/transactions" className="text-emerald-300 underline decoration-emerald-700 underline-offset-2">
          transactions
        </Link>{" "}
        to validate imported account activity.
      </p>
    </div>
  );
}
