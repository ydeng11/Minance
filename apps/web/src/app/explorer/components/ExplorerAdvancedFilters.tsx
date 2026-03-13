"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { Category } from "@/lib/api/types";
import {
  createDefaultExplorerFilterState,
  type ExplorerFilterState
} from "../filters";

interface ExplorerAdvancedFiltersProps {
  filters: ExplorerFilterState;
  categories: Category[];
  onApply: (updates: Partial<ExplorerFilterState>) => void;
  onClose: () => void;
}

type AdvancedFilterDraft = Pick<
  ExplorerFilterState,
  "merchant" | "category" | "transactionType" | "direction" | "tag" | "minAmount" | "maxAmount" | "review" | "categoryView"
>;

function createDraft(filters: ExplorerFilterState): AdvancedFilterDraft {
  return {
    merchant: filters.merchant,
    category: filters.category,
    transactionType: filters.transactionType,
    direction: filters.direction,
    tag: filters.tag,
    minAmount: filters.minAmount,
    maxAmount: filters.maxAmount,
    review: filters.review,
    categoryView: filters.categoryView
  };
}

export function ExplorerAdvancedFilters({
  filters,
  categories,
  onApply,
  onClose
}: ExplorerAdvancedFiltersProps) {
  const [draft, setDraft] = useState<AdvancedFilterDraft>(() => createDraft(filters));

  useEffect(() => {
    setDraft(createDraft(filters));
  }, [filters]);

  function updateDraft(updates: Partial<AdvancedFilterDraft>) {
    setDraft((current) => ({ ...current, ...updates }));
  }

  function resetDraft() {
    const defaults = createDefaultExplorerFilterState();
    setDraft({
      merchant: defaults.merchant,
      category: defaults.category,
      transactionType: defaults.transactionType,
      direction: defaults.direction,
      tag: defaults.tag,
      minAmount: defaults.minAmount,
      maxAmount: defaults.maxAmount,
      review: defaults.review,
      categoryView: defaults.categoryView
    });
  }

  return (
    <div className="fixed inset-0 z-40 bg-black/55 px-4 py-8 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="mx-auto flex max-w-6xl justify-end">
        <section
          className="w-full max-w-md rounded-[28px] border border-neutral-800 bg-[linear-gradient(180deg,rgba(15,18,20,0.98),rgba(8,10,12,0.94))] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.45)]"
          data-testid="explorer-advanced-filters"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-emerald-300/80">
                Advanced filters
              </p>
              <h3 className="mt-2 text-xl font-semibold tracking-tight text-neutral-50">Refine this workspace</h3>
              <p className="mt-2 text-sm text-neutral-400">
                Apply deeper constraints without sacrificing dashboard width.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-950 text-neutral-300 transition hover:bg-neutral-900"
              aria-label="Close advanced filters"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-sm text-neutral-300 sm:col-span-2">
              Merchant
              <input
                value={draft.merchant}
                onChange={(event) => updateDraft({ merchant: event.target.value })}
                placeholder="Filter by merchant"
                className="h-11 rounded-2xl border border-neutral-800 bg-neutral-950 px-4 text-neutral-100 outline-none transition focus:border-emerald-500"
              />
            </label>

            <label className="grid gap-1 text-sm text-neutral-300 sm:col-span-2">
              Category
              <select
                value={draft.category}
                onChange={(event) => updateDraft({ category: event.target.value })}
                className="h-11 rounded-2xl border border-neutral-800 bg-neutral-950 px-4 text-neutral-100 outline-none transition focus:border-emerald-500"
              >
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.name}>
                    {category.emoji ? `${category.emoji} ` : ""}
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-sm text-neutral-300">
              Review status
              <select
                value={draft.review}
                onChange={(event) =>
                  updateDraft({ review: event.target.value as ExplorerFilterState["review"] })
                }
                data-testid="explorer-advanced-filter-review"
                className="h-11 rounded-2xl border border-neutral-800 bg-neutral-950 px-4 text-neutral-100 outline-none transition focus:border-emerald-500"
              >
                <option value="all">All statuses</option>
                <option value="reviewed">Reviewed</option>
                <option value="needs_review">Needs Review</option>
              </select>
            </label>

            <label className="grid gap-1 text-sm text-neutral-300">
              Category view
              <select
                value={draft.categoryView}
                onChange={(event) =>
                  updateDraft({ categoryView: event.target.value as ExplorerFilterState["categoryView"] })
                }
                className="h-11 rounded-2xl border border-neutral-800 bg-neutral-950 px-4 text-neutral-100 outline-none transition focus:border-emerald-500"
              >
                <option value="granular">Granular</option>
                <option value="coarse">Coarse</option>
              </select>
            </label>

            <label className="grid gap-1 text-sm text-neutral-300">
              Transaction type
              <select
                value={draft.transactionType}
                onChange={(event) =>
                  updateDraft({ transactionType: event.target.value as ExplorerFilterState["transactionType"] })
                }
                className="h-11 rounded-2xl border border-neutral-800 bg-neutral-950 px-4 text-neutral-100 outline-none transition focus:border-emerald-500"
              >
                <option value="all">All types</option>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
                <option value="transfer">Transfer</option>
              </select>
            </label>

            <label className="grid gap-1 text-sm text-neutral-300">
              Direction
              <select
                value={draft.direction}
                onChange={(event) =>
                  updateDraft({ direction: event.target.value as ExplorerFilterState["direction"] })
                }
                className="h-11 rounded-2xl border border-neutral-800 bg-neutral-950 px-4 text-neutral-100 outline-none transition focus:border-emerald-500"
              >
                <option value="all">All directions</option>
                <option value="outflow">Outflow</option>
                <option value="inflow">Inflow</option>
              </select>
            </label>

            <label className="grid gap-1 text-sm text-neutral-300">
              Minimum amount
              <input
                value={draft.minAmount}
                onChange={(event) => updateDraft({ minAmount: event.target.value })}
                type="number"
                placeholder="0"
                className="h-11 rounded-2xl border border-neutral-800 bg-neutral-950 px-4 text-neutral-100 outline-none transition focus:border-emerald-500"
              />
            </label>

            <label className="grid gap-1 text-sm text-neutral-300">
              Maximum amount
              <input
                value={draft.maxAmount}
                onChange={(event) => updateDraft({ maxAmount: event.target.value })}
                type="number"
                placeholder="1000"
                className="h-11 rounded-2xl border border-neutral-800 bg-neutral-950 px-4 text-neutral-100 outline-none transition focus:border-emerald-500"
              />
            </label>

            <label className="grid gap-1 text-sm text-neutral-300 sm:col-span-2">
              Tag
              <input
                value={draft.tag}
                onChange={(event) => updateDraft({ tag: event.target.value })}
                placeholder="travel, groceries, tax"
                className="h-11 rounded-2xl border border-neutral-800 bg-neutral-950 px-4 text-neutral-100 outline-none transition focus:border-emerald-500"
              />
            </label>
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={resetDraft}
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-950 px-4 text-sm font-medium text-neutral-300 transition hover:bg-neutral-900"
            >
              Reset
            </button>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-950 px-4 text-sm font-medium text-neutral-300 transition hover:bg-neutral-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => onApply(draft)}
                data-testid="explorer-advanced-filters-apply"
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/15 px-4 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/20"
              >
                Apply
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
