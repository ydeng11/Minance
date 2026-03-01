import Link from "next/link";
import { CircleDashed, CircleDot, ListFilter } from "lucide-react";

const CATEGORY_PREVIEW = [
  { id: "cat-essential", label: "Essential", icon: CircleDot, color: "text-emerald-300" },
  { id: "cat-extra", label: "Extra", icon: CircleDot, color: "text-sky-300" },
  { id: "cat-neutral", label: "Neutral", icon: CircleDashed, color: "text-neutral-300" }
];

export default function CategoriesPage() {
  return (
    <div className="space-y-6" data-testid="categories-page">
      <header>
        <h2 className="text-3xl font-semibold tracking-tight">Categories</h2>
        <p className="text-neutral-400">Audit category groups and monitor strategy coverage at a glance.</p>
      </header>

      <section className="rounded-2xl border border-neutral-900 bg-neutral-950/70 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-neutral-300">Strategy buckets</h3>
          <span className="inline-flex items-center gap-1 rounded-md border border-neutral-800 bg-neutral-900/70 px-2 py-1 text-xs text-neutral-400">
            <ListFilter className="h-3.5 w-3.5" />
            Preview
          </span>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {CATEGORY_PREVIEW.map((entry) => (
            <article key={entry.id} className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
              <div className="flex items-center gap-2">
                <entry.icon className={`h-4 w-4 ${entry.color}`} />
                <span className="text-sm font-medium text-neutral-100">{entry.label}</span>
              </div>
              <p className="mt-2 text-xs text-neutral-500">Category CRUD and grouping flows ship in the dedicated categories parity bead.</p>
            </article>
          ))}
        </div>
      </section>

      <p className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-300">
        Use{" "}
        <Link href="/settings" className="text-emerald-300 underline decoration-emerald-700 underline-offset-2">
          Settings
        </Link>{" "}
        to manage current strategy/rules until full categories parity lands.
      </p>
    </div>
  );
}
