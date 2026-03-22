"use client";

import { CalendarRange, Search, SlidersHorizontal } from "lucide-react";
import { RANGE_OPTIONS } from "@/lib/constants";
import type { TransactionsFilterState } from "./filters";

const TRANSACTION_RANGE_OPTIONS = [...RANGE_OPTIONS, { value: "custom", label: "Custom Range" }];

interface TransactionsCommandBarProps {
  filters: TransactionsFilterState;
  activeFilterCount: number;
  onChange: (updates: Partial<TransactionsFilterState>) => void;
  onApply: () => void;
  onClear: () => void;
  onOpenAdvancedFilters: () => void;
}

export function TransactionsCommandBar({
  filters,
  activeFilterCount,
  onChange,
  onApply,
  onClear,
  onOpenAdvancedFilters
}: TransactionsCommandBarProps) {
  return (
    <section
      className="rounded-[28px] border border-neutral-900 bg-[linear-gradient(180deg,rgba(15,18,20,0.96),rgba(10,12,14,0.92))] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.24)]"
      data-testid="txn-command-bar"
    >
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <label className="relative block flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
          <input
            id="txn-query-input"
            value={filters.query}
            onChange={(event) => onChange({ query: event.target.value })}
            data-testid="txn-query"
            aria-label="Search transactions"
            placeholder="Search merchants, descriptions, or notes"
            className="h-11 w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-10 text-sm text-neutral-100 placeholder:text-neutral-400 outline-none transition focus:border-emerald-500"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2 xl:flex xl:items-center">
          <label className="relative block">
            <CalendarRange className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
            <select
              value={filters.range}
              onChange={(event) => onChange({ range: event.target.value })}
              data-testid="txn-range"
              aria-label="Filter transactions by date range"
              className="h-11 min-w-[176px] rounded-2xl border border-neutral-800 bg-neutral-950 pl-10 pr-8 text-sm text-neutral-100 outline-none transition focus:border-emerald-500"
            >
              {TRANSACTION_RANGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={onApply}
            data-testid="txn-apply"
            aria-label="Apply search and filters"
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/15 px-4 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/20"
          >
            Apply
          </button>

          <button
            type="button"
            onClick={onOpenAdvancedFilters}
            data-testid="txn-open-advanced-filters"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-neutral-800 bg-neutral-950 px-4 text-sm font-medium text-neutral-200 transition hover:bg-neutral-900"
          >
            <SlidersHorizontal className="h-4 w-4" />
            + Filter
            {activeFilterCount ? (
              <span className="rounded-full border border-neutral-700 bg-neutral-900 px-2 py-0.5 text-[11px] uppercase tracking-[0.18em] text-neutral-300">
                {activeFilterCount}
              </span>
            ) : null}
          </button>

          <button
            type="button"
            onClick={onClear}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-950 px-4 text-sm font-medium text-neutral-300 transition hover:bg-neutral-900"
          >
            Clear
          </button>
        </div>
      </div>
    </section>
  );
}
