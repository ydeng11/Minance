"use client";

import { CalendarRange, Download, Search, SlidersHorizontal } from "lucide-react";
import type { Account } from "@/lib/api/types";
import { RANGE_OPTIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { ExplorerFilterState } from "../filters";

interface ExplorerCommandBarProps {
  filters: ExplorerFilterState;
  accounts: Account[];
  onChange: (updates: Partial<ExplorerFilterState>) => void;
  onOpenAdvancedFilters: () => void;
}

export function ExplorerCommandBar({
  filters,
  accounts,
  onChange,
  onOpenAdvancedFilters
}: ExplorerCommandBarProps) {
  return (
    <section
      className="rounded-[28px] border border-neutral-900 bg-[linear-gradient(180deg,rgba(15,18,20,0.96),rgba(10,12,14,0.92))] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.24)]"
      data-testid="explorer-command-bar"
    >
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <label className="relative block flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
          <input
            value={filters.query}
            onChange={(event) => onChange({ query: event.target.value })}
            placeholder="Search merchants, notes, and descriptions"
            className="h-11 w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-10 text-sm text-neutral-100 outline-none transition focus:border-emerald-500"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2 xl:flex xl:items-center">
          <label className="relative block">
            <CalendarRange className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
            <select
              value={filters.range}
              onChange={(event) => onChange({ range: event.target.value })}
              className="h-11 min-w-[168px] rounded-2xl border border-neutral-800 bg-neutral-950 pl-10 pr-8 text-sm text-neutral-100 outline-none transition focus:border-emerald-500"
            >
              {[...RANGE_OPTIONS, { value: "custom", label: "Custom Range" }].map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <select
            value={filters.account}
            onChange={(event) => onChange({ account: event.target.value })}
            className="h-11 min-w-[180px] rounded-2xl border border-neutral-800 bg-neutral-950 px-4 text-sm text-neutral-100 outline-none transition focus:border-emerald-500"
          >
            <option value="">All accounts</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.displayName}>
                {account.displayName}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => onChange({ compare: filters.compare === "previous" ? "none" : "previous" })}
            className={cn(
              "h-11 rounded-2xl border px-4 text-sm font-medium transition",
              filters.compare === "previous"
                ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
                : "border-neutral-800 bg-neutral-950 text-neutral-200 hover:bg-neutral-900"
            )}
          >
            Compare
          </button>

          <button
            type="button"
            onClick={onOpenAdvancedFilters}
            data-testid="explorer-open-advanced-filters"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-neutral-800 bg-neutral-950 px-4 text-sm font-medium text-neutral-200 transition hover:bg-neutral-900"
          >
            <SlidersHorizontal className="h-4 w-4" />
            + Filter
          </button>

          <button
            type="button"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-neutral-800 bg-neutral-950 px-4 text-sm font-medium text-neutral-200 transition hover:bg-neutral-900"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>
    </section>
  );
}
