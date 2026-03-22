"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { AmountRangeControl } from "@/components/filters/AmountRangeControl";
import { MultiSelectField, type MultiSelectOption } from "@/components/filters/MultiSelectField";
import type { TransactionsFilterState, TransactionTypeFilter } from "./filters";

const TRANSACTION_TYPE_OPTIONS: Array<{ value: TransactionTypeFilter; label: string }> = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "transfer", label: "Transfer" }
];

type OpenMultiSelectField = "category" | "account" | "type";

interface TransactionsAdvancedFiltersProps {
  filters: TransactionsFilterState;
  categoryOptions: MultiSelectOption[];
  accountOptions: MultiSelectOption[];
  amountBoundMin: number;
  amountBoundMax: number;
  onChange: (updates: Partial<TransactionsFilterState>) => void;
  onApply: () => void;
  onClose: () => void;
  onReset: () => void;
}

export function TransactionsAdvancedFilters({
  filters,
  categoryOptions,
  accountOptions,
  amountBoundMin,
  amountBoundMax,
  onChange,
  onApply,
  onClose,
  onReset
}: TransactionsAdvancedFiltersProps) {
  const [openMultiSelect, setOpenMultiSelect] = useState<OpenMultiSelectField | null>(null);

  function handleMultiSelectOpen(field: OpenMultiSelectField) {
    return (nextOpen: boolean) => setOpenMultiSelect(nextOpen ? field : null);
  }

  return (
    <div className="fixed inset-0 z-40 bg-black/55 px-4 py-8 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="mx-auto flex max-w-6xl justify-end">
        <section
          className="max-h-[calc(100vh-4rem)] w-full max-w-3xl overflow-y-auto rounded-[28px] border border-neutral-800 bg-[linear-gradient(180deg,rgba(15,18,20,0.98),rgba(8,10,12,0.94))] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.45)]"
          data-testid="txn-advanced-filters"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-emerald-300/80">
                Advanced filters
              </p>
              <h3 className="mt-2 text-xl font-semibold tracking-tight text-neutral-50">Refine the ledger view</h3>
              <p className="mt-2 text-sm text-neutral-400">
                Keep the Explorer-style shell while preserving Transactions-specific filters and apply behavior.
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
              <span>Category</span>
              <MultiSelectField
                selectedValues={filters.categories}
                options={categoryOptions}
                onChange={(categories) => onChange({ categories })}
                emptyLabel="All categories"
                testId="txn-category-filter"
                isOpen={openMultiSelect === "category"}
                onOpenChange={handleMultiSelectOpen("category")}
                ariaLabel="Filter transactions by category"
                searchable
                searchPlaceholder="Search category"
              />
            </label>

            <label className="grid gap-1 text-sm text-neutral-300 sm:col-span-2">
              <span>Account</span>
              <MultiSelectField
                selectedValues={filters.accounts}
                options={accountOptions}
                onChange={(accounts) => onChange({ accounts })}
                emptyLabel="All accounts"
                testId="txn-account-filter"
                isOpen={openMultiSelect === "account"}
                onOpenChange={handleMultiSelectOpen("account")}
                ariaLabel="Filter transactions by account"
                searchable
                searchPlaceholder="Search account"
              />
            </label>

            <label className="grid gap-1 text-sm text-neutral-300">
              Category view
              <select
                value={filters.categoryView}
                onChange={(event) => onChange({
                  categoryView: event.target.value === "coarse" ? "coarse" : "granular",
                  categories: []
                })}
                data-testid="txn-category-view"
                aria-label="Choose transaction category view"
                className="h-11 rounded-2xl border border-neutral-800 bg-neutral-950 px-4 text-neutral-100 outline-none transition focus:border-emerald-500"
              >
                <option value="granular">Granular</option>
                <option value="coarse">Coarse</option>
              </select>
            </label>

            <label className="grid gap-1 text-sm text-neutral-300">
              <span>Transaction type</span>
              <MultiSelectField
                selectedValues={filters.transactionTypes}
                options={TRANSACTION_TYPE_OPTIONS}
                onChange={(transactionTypes) =>
                  onChange({ transactionTypes: transactionTypes as TransactionTypeFilter[] })
                }
                emptyLabel="All types"
                testId="txn-type-filter"
                isOpen={openMultiSelect === "type"}
                onOpenChange={handleMultiSelectOpen("type")}
                ariaLabel="Filter transactions by type"
              />
            </label>

            <label className="grid gap-1 text-sm text-neutral-300 sm:col-span-2">
              Tag
              <input
                value={filters.tag}
                onChange={(event) => onChange({ tag: event.target.value })}
                data-testid="txn-tag-filter"
                aria-label="Filter transactions by tag"
                placeholder="monthly"
                className="h-11 rounded-2xl border border-neutral-800 bg-neutral-950 px-4 text-neutral-100 outline-none transition focus:border-emerald-500"
              />
            </label>

            <div className="sm:col-span-2" data-testid="txn-amount-filter">
              <AmountRangeControl
                minBound={amountBoundMin}
                maxBound={amountBoundMax}
                minValue={filters.minAmount}
                maxValue={filters.maxAmount}
                onChange={({ minAmount, maxAmount }) => onChange({ minAmount, maxAmount })}
                testIdPrefix="txn"
                inputClassName="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-400 outline-none transition focus:border-emerald-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={filters.recurring}
                  onChange={(event) => onChange({ recurring: event.target.checked })}
                  data-testid="txn-recurring-filter"
                  aria-label="Show only recurring transactions"
                  className="h-4 w-4 rounded border-neutral-700 bg-neutral-900 text-emerald-400 focus:ring-emerald-400"
                />
                <span className="text-sm text-neutral-300">Recurring only</span>
              </label>
            </div>
          </div>

          {filters.range === "custom" ? (
            <div
              data-testid="txn-custom-date-row"
              className="mt-4 grid gap-3 border-t border-neutral-900/80 pt-4 md:grid-cols-2"
            >
              <label className="grid gap-1 text-sm text-neutral-300">
                Start
                <input
                  type="date"
                  value={filters.start}
                  onChange={(event) => onChange({ start: event.target.value })}
                  data-testid="txn-start-date"
                  aria-label="Custom start date"
                  className="h-11 rounded-2xl border border-neutral-800 bg-neutral-950 px-4 text-neutral-100 outline-none transition focus:border-emerald-500"
                />
              </label>
              <label className="grid gap-1 text-sm text-neutral-300">
                End
                <input
                  type="date"
                  value={filters.end}
                  onChange={(event) => onChange({ end: event.target.value })}
                  data-testid="txn-end-date"
                  aria-label="Custom end date"
                  className="h-11 rounded-2xl border border-neutral-800 bg-neutral-950 px-4 text-neutral-100 outline-none transition focus:border-emerald-500"
                />
              </label>
            </div>
          ) : null}

          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onReset}
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-950 px-4 text-sm font-medium text-neutral-300 transition hover:bg-neutral-900"
            >
              Reset draft
            </button>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-950 px-4 text-sm font-medium text-neutral-300 transition hover:bg-neutral-900"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpenMultiSelect(null);
                  onApply();
                }}
                data-testid="txn-advanced-apply"
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/15 px-4 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/20"
              >
                Apply filters
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
