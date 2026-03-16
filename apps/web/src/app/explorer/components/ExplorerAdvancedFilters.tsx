"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import type { Category } from "@/lib/api/types";
import { AmountRangeControl } from "@/components/filters/AmountRangeControl";
import { MultiSelectField, type MultiSelectOption } from "@/components/filters/MultiSelectField";
import {
  createDefaultExplorerFilterState,
  type ExplorerFilterState,
  type ExplorerTransactionType
} from "../filters";

interface ExplorerAdvancedFiltersProps {
  filters: ExplorerFilterState;
  categories: Category[];
  availableTags: string[];
  amountBounds?: {
    min: number;
    max: number;
  } | null;
  onApply: (updates: Partial<ExplorerFilterState>) => void;
  onClose: () => void;
}

type AdvancedFilterDraft = Pick<
  ExplorerFilterState,
  "merchant" | "categories" | "transactionTypes" | "direction" | "tag" | "minAmount" | "maxAmount" | "categoryView"
>;
type OpenMultiSelectField = "category" | "transactionType";

const TRANSACTION_TYPE_OPTIONS: Array<{ value: ExplorerTransactionType; label: string }> = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "transfer", label: "Transfer" }
];

function createDraft(filters: ExplorerFilterState): AdvancedFilterDraft {
  return {
    merchant: filters.merchant,
    categories: [...filters.categories],
    transactionTypes: [...filters.transactionTypes],
    direction: filters.direction,
    tag: filters.tag,
    minAmount: filters.minAmount,
    maxAmount: filters.maxAmount,
    categoryView: filters.categoryView
  };
}

function createDefaultDraft() {
  return createDraft(createDefaultExplorerFilterState());
}

export function ExplorerAdvancedFilters({
  filters,
  categories,
  availableTags,
  amountBounds,
  onApply,
  onClose
}: ExplorerAdvancedFiltersProps) {
  const [draft, setDraft] = useState<AdvancedFilterDraft>(() => createDraft(filters));
  const [openMultiSelect, setOpenMultiSelect] = useState<OpenMultiSelectField | null>(null);

  useEffect(() => {
    setDraft(createDraft(filters));
    setOpenMultiSelect(null);
  }, [filters]);

  const categoryOptions = useMemo(
    () => categories.map(({ name }) => ({ value: name, label: name })),
    [categories]
  );
  const filteredTagSuggestions = useMemo(() => {
    const normalizedTag = draft.tag.trim().toLowerCase();
    return availableTags
      .filter((tag) => tag.includes(normalizedTag))
      .slice(0, 8);
  }, [availableTags, draft.tag]);
  const amountBoundMin = Math.floor(amountBounds?.min ?? 0);
  const amountBoundMax = Math.max(amountBoundMin, Math.ceil(amountBounds?.max ?? 0));

  function updateDraft(updates: Partial<AdvancedFilterDraft>) {
    setDraft((current) => ({ ...current, ...updates }));
  }

  function handleMultiSelectOpen(field: OpenMultiSelectField) {
    return (nextOpen: boolean) => setOpenMultiSelect(nextOpen ? field : null);
  }

  function resetDraft() {
    setOpenMultiSelect(null);
    setDraft(createDefaultDraft());
  }

  return (
    <div className="fixed inset-0 z-40 bg-black/55 px-4 py-8 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="mx-auto flex max-w-6xl justify-end">
        <section
          className="w-full max-w-xl rounded-[28px] border border-neutral-800 bg-[linear-gradient(180deg,rgba(15,18,20,0.98),rgba(8,10,12,0.94))] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.45)]"
          data-testid="explorer-advanced-filters"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-emerald-300/80">
                Advanced filters
              </p>
              <h3 className="mt-2 text-xl font-semibold tracking-tight text-neutral-50">Refine this workspace</h3>
              <p className="mt-2 text-sm text-neutral-400">
                Stack category and type filters, narrow by amount, and reuse known tags faster.
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
              <span>Category</span>
              <MultiSelectField
                selectedValues={draft.categories}
                options={categoryOptions}
                onChange={(categories) => updateDraft({ categories })}
                emptyLabel="All categories"
                testId="explorer-category-multiselect"
                isOpen={openMultiSelect === "category"}
                onOpenChange={handleMultiSelectOpen("category")}
                ariaLabel="Filter explorer by category"
                searchable
                searchPlaceholder="Search category"
              />
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
              <span>Transaction type</span>
              <MultiSelectField
                selectedValues={draft.transactionTypes}
                options={TRANSACTION_TYPE_OPTIONS}
                onChange={(transactionTypes) =>
                  updateDraft({ transactionTypes: transactionTypes as ExplorerTransactionType[] })
                }
                emptyLabel="All types"
                testId="explorer-type-multiselect"
                isOpen={openMultiSelect === "transactionType"}
                onOpenChange={handleMultiSelectOpen("transactionType")}
                ariaLabel="Filter explorer by transaction type"
              />
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

            <div className="sm:col-span-2">
              <AmountRangeControl
                minBound={amountBoundMin}
                maxBound={amountBoundMax}
                minValue={draft.minAmount}
                maxValue={draft.maxAmount}
                onChange={({ minAmount, maxAmount }) => updateDraft({ minAmount, maxAmount })}
                testIdPrefix="explorer"
                inputClassName="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-400 outline-none transition focus:border-emerald-500"
              />
            </div>

            <label className="grid gap-1 text-sm text-neutral-300 sm:col-span-2">
              Tag
              <input
                value={draft.tag}
                onChange={(event) => updateDraft({ tag: event.target.value })}
                placeholder="Filter by tag"
                data-testid="explorer-tag-filter"
                className="h-11 rounded-2xl border border-neutral-800 bg-neutral-950 px-4 text-neutral-100 outline-none transition focus:border-emerald-500"
              />
              {draft.tag.trim() && filteredTagSuggestions.length ? (
                <div
                  data-testid="explorer-tag-suggestions"
                  className="rounded-2xl border border-neutral-800 bg-neutral-950/90 p-2"
                >
                  <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.22em] text-neutral-500">
                    Suggestions
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {filteredTagSuggestions.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => updateDraft({ tag })}
                        className="rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-sm text-neutral-200 transition hover:border-neutral-700 hover:bg-neutral-800"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
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
