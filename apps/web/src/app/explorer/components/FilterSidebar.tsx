"use client";

import { useMemo } from "react";
import { Search, X, Calendar, Tag, DollarSign, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { RANGE_OPTIONS } from "@/lib/constants";
import type { Category, Account } from "@/lib/api/types";
import type { ExplorerFilterState } from "../filters";

interface FilterSidebarProps {
  filters: ExplorerFilterState;
  onChange: (updates: Partial<ExplorerFilterState>) => void;
  categories: Category[];
  accounts: Account[];
  availableTags?: string[];
  className?: string;
}

export function FilterSidebar({
  filters,
  onChange,
  categories,
  accounts,
  availableTags = [],
  className
}: FilterSidebarProps) {
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.query) count++;
    if (filters.merchant) count++;
    if (filters.category) count++;
    if (filters.account) count++;
    if (filters.tag) count++;
    if (filters.transactionType !== "all") count++;
    if (filters.direction !== "all") count++;
    if (filters.minAmount) count++;
    if (filters.maxAmount) count++;
    if (filters.range !== "90d") count++;
    return count;
  }, [filters]);

  const handleClearAll = () => {
    onChange({
      query: "",
      merchant: "",
      category: "",
      account: "",
      tag: "",
      transactionType: "all",
      direction: "all",
      minAmount: "",
      maxAmount: "",
      range: "90d",
      start: "",
      end: ""
    });
  };

  return (
    <aside className={cn("w-60 flex-shrink-0 space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-neutral-400" />
          <h3 className="text-sm font-medium text-neutral-300">Filters</h3>
          {activeFilterCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-medium text-emerald-400">
              {activeFilterCount}
            </span>
          )}
        </div>
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            className="flex items-center gap-1 text-xs text-neutral-400 transition hover:text-neutral-200"
          >
            <X className="h-3 w-3" />
            Clear all
          </button>
        )}
      </div>

      {/* Search */}
      <section className="space-y-2">
        <h4 className="text-xs font-medium uppercase tracking-wide text-neutral-500">Search</h4>
        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-4 w-4 text-neutral-500" />
          <input
            type="text"
            value={filters.query}
            onChange={(e) => onChange({ query: e.target.value })}
            placeholder="Search transactions..."
            className="w-full rounded-lg border border-neutral-800 bg-neutral-900 py-2 pl-9 pr-3 text-sm text-neutral-200 outline-none transition focus:border-emerald-500"
          />
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-4 w-4 text-neutral-500" />
          <input
            type="text"
            value={filters.merchant}
            onChange={(e) => onChange({ merchant: e.target.value })}
            placeholder="Filter by merchant..."
            className="w-full rounded-lg border border-neutral-800 bg-neutral-900 py-2 pl-9 pr-3 text-sm text-neutral-200 outline-none transition focus:border-emerald-500"
          />
        </div>
      </section>

      {/* Date Range */}
      <section className="space-y-2">
        <h4 className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-neutral-500">
          <Calendar className="h-3 w-3" />
          Date Range
        </h4>
        <select
          value={filters.range}
          onChange={(e) => onChange({ range: e.target.value })}
          className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 outline-none transition focus:border-emerald-500"
        >
          {[...RANGE_OPTIONS, { value: "custom", label: "Custom Range" }].map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {filters.range === "custom" && (
          <div className="space-y-2">
            <input
              type="date"
              value={filters.start}
              onChange={(e) => onChange({ start: e.target.value })}
              className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 outline-none transition focus:border-emerald-500"
            />
            <input
              type="date"
              value={filters.end}
              onChange={(e) => onChange({ end: e.target.value })}
              className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 outline-none transition focus:border-emerald-500"
            />
          </div>
        )}
      </section>

      {/* Category View */}
      <section className="space-y-2">
        <h4 className="text-xs font-medium uppercase tracking-wide text-neutral-500">
          Category View
        </h4>
        <div className="flex rounded-lg border border-neutral-800 bg-neutral-900 p-1">
          {(["granular", "coarse"] as const).map((view) => (
            <button
              key={view}
              type="button"
              onClick={() => onChange({ categoryView: view })}
              className={cn(
                "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition",
                filters.categoryView === view
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "text-neutral-400 hover:text-neutral-200"
              )}
            >
              {view.charAt(0).toUpperCase() + view.slice(1)}
            </button>
          ))}
        </div>
      </section>

      {/* Category */}
      <section className="space-y-2">
        <h4 className="text-xs font-medium uppercase tracking-wide text-neutral-500">Category</h4>
        <select
          value={filters.category}
          onChange={(e) => onChange({ category: e.target.value })}
          className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 outline-none transition focus:border-emerald-500"
        >
          <option value="">All categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.name}>
              {cat.emoji ? `${cat.emoji} ` : ""}
              {cat.name}
            </option>
          ))}
        </select>
      </section>

      {/* Account */}
      <section className="space-y-2">
        <h4 className="text-xs font-medium uppercase tracking-wide text-neutral-500">Account</h4>
        <select
          value={filters.account}
          onChange={(e) => onChange({ account: e.target.value })}
          className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 outline-none transition focus:border-emerald-500"
        >
          <option value="">All accounts</option>
          {accounts.map((acc) => (
            <option key={acc.id} value={acc.displayName}>
              {acc.displayName}
            </option>
          ))}
        </select>
      </section>

      {/* Amount Range */}
      <section className="space-y-2">
        <h4 className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-neutral-500">
          <DollarSign className="h-3 w-3" />
          Amount Range
        </h4>
        <div className="flex gap-2">
          <input
            type="number"
            value={filters.minAmount}
            onChange={(e) => onChange({ minAmount: e.target.value })}
            placeholder="Min"
            className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 outline-none transition focus:border-emerald-500"
          />
          <input
            type="number"
            value={filters.maxAmount}
            onChange={(e) => onChange({ maxAmount: e.target.value })}
            placeholder="Max"
            className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 outline-none transition focus:border-emerald-500"
          />
        </div>
      </section>

      {/* Transaction Type */}
      <section className="space-y-2">
        <h4 className="text-xs font-medium uppercase tracking-wide text-neutral-500">Type</h4>
        <select
          value={filters.transactionType}
          onChange={(e) => onChange({ transactionType: e.target.value as ExplorerFilterState["transactionType"] })}
          className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 outline-none transition focus:border-emerald-500"
        >
          <option value="all">All types</option>
          <option value="expense">Expense</option>
          <option value="income">Income</option>
          <option value="transfer">Transfer</option>
        </select>
      </section>

      {/* Direction */}
      <section className="space-y-2">
        <h4 className="text-xs font-medium uppercase tracking-wide text-neutral-500">Direction</h4>
        <select
          value={filters.direction}
          onChange={(e) => onChange({ direction: e.target.value as ExplorerFilterState["direction"] })}
          className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 outline-none transition focus:border-emerald-500"
        >
          <option value="all">All directions</option>
          <option value="outflow">Outflow</option>
          <option value="inflow">Inflow</option>
        </select>
      </section>

      {/* Tags */}
      <section className="space-y-2">
        <h4 className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-neutral-500">
          <Tag className="h-3 w-3" />
          Tags
        </h4>
        {availableTags.length > 0 ? (
          <select
            value={filters.tag}
            onChange={(e) => onChange({ tag: e.target.value })}
            className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 outline-none transition focus:border-emerald-500"
          >
            <option value="">All tags</option>
            {availableTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={filters.tag}
            onChange={(e) => onChange({ tag: e.target.value })}
            placeholder="Filter by tag..."
            className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 outline-none transition focus:border-emerald-500"
          />
        )}
      </section>

    </aside>
  );
}
