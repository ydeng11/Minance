"use client";

import { useState } from "react";
import { ArrowDownUp, CalendarDays, Layers, Repeat, Search, SlidersHorizontal, Tag } from "lucide-react";

import { RANGE_OPTIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";

import { AmountRangeControl } from "./AmountRangeControl";
import { MultiSelectField, type MultiSelectOption } from "./MultiSelectField";

const CATEGORY_VIEW_OPTIONS = [
  { value: "granular", label: "Granular categories" },
  { value: "coarse", label: "Coarse groups" },
];

const TRANSACTION_TYPE_OPTIONS: MultiSelectOption[] = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "transfer", label: "Transfer" },
];

const DIRECTION_OPTIONS = [
  { value: "all", label: "All directions" },
  { value: "outflow", label: "Outflow only" },
  { value: "inflow", label: "Inflow only" },
];

const COMPARE_OPTIONS = [
  { value: "none", label: "None" },
  { value: "previous", label: "Previous period" },
];
const LABEL_CLASS = "flex items-center gap-2 text-xs font-medium uppercase tracking-[0.24em] text-text-tertiary";
const FIELD_GROUP_CLASS = "space-y-2";
const FIELD_CLASS =
  "min-h-11 w-full rounded-2xl border border-border-subtle bg-surface-field px-4 text-sm text-text-primary outline-none transition focus:border-accent/60";
const AMOUNT_INPUT_CLASS =
  "min-h-11 rounded-2xl border border-border-subtle bg-surface-field px-4 text-sm text-text-primary outline-none transition placeholder:text-text-tertiary focus:border-accent/60";

export type SharedViewFilterState = {
  range: string;
  start: string;
  end: string;
  categories: string[];
  categoryView: "granular" | "coarse";
  transactionTypes: Array<"expense" | "income" | "transfer">;
  tag: string;
  recurring: boolean;
  minAmount: string;
  maxAmount: string;
  account?: string;
  accounts?: string[];
  compare?: "none" | "previous";
  direction?: "all" | "outflow" | "inflow";
};

export type SharedViewFiltersProps = {
  filters: SharedViewFilterState;
  accountMode: "single" | "multi" | "hidden";
  showCompare: boolean;
  showDirection?: boolean;
  categoryOptions: MultiSelectOption[];
  accountOptions: MultiSelectOption[];
  availableTags: string[];
  amountBounds: { min: number; max: number } | null;
  testIdPrefix: string;
  onChange: (updates: Partial<SharedViewFilterState>) => void;
};

export function SharedViewFilters({
  filters,
  accountMode,
  showCompare,
  showDirection = true,
  categoryOptions,
  accountOptions,
  availableTags,
  amountBounds,
  testIdPrefix,
  onChange,
}: SharedViewFiltersProps) {
  const [openMultiSelect, setOpenMultiSelect] = useState<"accounts" | "categories" | "types" | null>(null);
  const normalizedTag = filters.tag.trim().toLowerCase();
  const suggestedTags =
    normalizedTag.length > 0
      ? availableTags.filter((tag) => tag.toLowerCase().includes(normalizedTag)).slice(0, 6)
      : [];
  const showAccountControl = accountMode !== "hidden";
  const accountGridClass =
    showAccountControl && showCompare
      ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]"
      : showAccountControl || showCompare
        ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
        : "lg:grid-cols-1";
  const amountMinBound = Math.floor(amountBounds?.min || 0);
  const amountMaxBound = Math.max(amountMinBound, Math.ceil(amountBounds?.max || 0));
  const advancedControlGridClass = showDirection ? "lg:grid-cols-2" : "lg:grid-cols-3";

  function updateRange(range: string) {
    onChange({
      range,
      start: range === "custom" ? filters.start : "",
      end: range === "custom" ? filters.end : ""
    });
  }

  return (
    <div className="space-y-5" data-testid={`${testIdPrefix}-view-content`}>
      <section className={cn("grid gap-4", accountGridClass)}>
        <label className="space-y-2">
          <span className={LABEL_CLASS}>
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            Range
          </span>
          <select
            value={filters.range}
            onChange={(event) => updateRange(event.target.value)}
            className={FIELD_CLASS}
            data-testid={`${testIdPrefix}-range`}
          >
            {RANGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {accountMode === "single" ? (
          <label className="space-y-2">
            <span className={LABEL_CLASS}>
              <Layers className="h-4 w-4" aria-hidden="true" />
              Account
            </span>
            <select
              value={filters.account || ""}
              onChange={(event) => onChange({ account: event.target.value })}
              className={FIELD_CLASS}
              data-testid={`${testIdPrefix}-single-account`}
            >
              {accountOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {accountMode === "multi" ? (
          <div className="space-y-2">
            <span className={LABEL_CLASS}>
              <Layers className="h-4 w-4" aria-hidden="true" />
              Accounts
            </span>
            <MultiSelectField
              options={accountOptions}
              selectedValues={filters.accounts || []}
              onChange={(accounts) => onChange({ accounts })}
              emptyLabel="All accounts"
              testId={`${testIdPrefix}-account-multiselect`}
              isOpen={openMultiSelect === "accounts"}
              onOpenChange={(isOpen) => setOpenMultiSelect(isOpen ? "accounts" : null)}
              ariaLabel="Accounts"
              searchable={true}
              searchPlaceholder="Search accounts"
            />
          </div>
        ) : null}

        {showCompare ? (
          <label className="space-y-2">
            <span className={LABEL_CLASS}>
              <ArrowDownUp className="h-4 w-4" aria-hidden="true" />
              Compare
            </span>
            <select
              value={filters.compare || "none"}
              onChange={(event) => onChange({ compare: event.target.value as SharedViewFilterState["compare"] })}
              className={FIELD_CLASS}
              data-testid={`${testIdPrefix}-compare`}
            >
              {COMPARE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {filters.range === "custom" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-full">
            <label className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-[0.24em] text-text-tertiary">Start date</span>
              <input
                type="date"
                value={filters.start}
                onChange={(event) => onChange({ start: event.target.value })}
                className={FIELD_CLASS}
                data-testid={`${testIdPrefix}-start-date`}
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-[0.24em] text-text-tertiary">End date</span>
              <input
                type="date"
                value={filters.end}
                onChange={(event) => onChange({ end: event.target.value })}
                className={FIELD_CLASS}
                data-testid={`${testIdPrefix}-end-date`}
              />
            </label>
          </div>
        ) : null}
      </section>

      <section
        className="space-y-4 rounded-3xl border border-border-subtle bg-surface-panel/70 p-4"
        data-testid={`${testIdPrefix}-advanced-filters`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-accent">
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              Advanced filters
            </p>
            <p className="mt-1 text-sm text-text-secondary">Refine the current view by category, type, amount, tags, and repeats.</p>
          </div>
        </div>

        <div className={cn("grid gap-4", advancedControlGridClass)} data-testid={`${testIdPrefix}-advanced-control-grid`}>
          <div className={FIELD_GROUP_CLASS}>
            <span className={LABEL_CLASS}>
              <Layers className="h-4 w-4" aria-hidden="true" />
              Categories
            </span>
            <MultiSelectField
              options={categoryOptions}
              selectedValues={filters.categories}
              onChange={(categories) => onChange({ categories })}
              emptyLabel="All categories"
              testId={`${testIdPrefix}-category-multiselect`}
              isOpen={openMultiSelect === "categories"}
              onOpenChange={(isOpen) => setOpenMultiSelect(isOpen ? "categories" : null)}
              ariaLabel="Categories"
              searchable={true}
              searchPlaceholder="Search categories"
            />
          </div>

          <label className={FIELD_GROUP_CLASS}>
            <span className={LABEL_CLASS}>
              <Layers className="h-4 w-4" aria-hidden="true" />
              Category view
            </span>
            <select
              value={filters.categoryView}
              onChange={(event) => onChange({ categoryView: event.target.value as SharedViewFilterState["categoryView"] })}
              className={FIELD_CLASS}
              data-testid={`${testIdPrefix}-category-view`}
            >
              {CATEGORY_VIEW_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className={FIELD_GROUP_CLASS}>
            <span className={LABEL_CLASS}>
              <ArrowDownUp className="h-4 w-4" aria-hidden="true" />
              Type
            </span>
            <MultiSelectField
              options={TRANSACTION_TYPE_OPTIONS}
              selectedValues={filters.transactionTypes}
              onChange={(transactionTypes) =>
                onChange({ transactionTypes: transactionTypes as SharedViewFilterState["transactionTypes"] })
              }
              emptyLabel="All transaction types"
              testId={`${testIdPrefix}-type-multiselect`}
              isOpen={openMultiSelect === "types"}
              onOpenChange={(isOpen) => setOpenMultiSelect(isOpen ? "types" : null)}
              ariaLabel="Transaction type"
            />
          </div>

          {showDirection ? (
            <label className={FIELD_GROUP_CLASS}>
              <span className={LABEL_CLASS}>
                <ArrowDownUp className="h-4 w-4" aria-hidden="true" />
                Direction
              </span>
              <select
                value={filters.direction || "all"}
                onChange={(event) => onChange({ direction: event.target.value as SharedViewFilterState["direction"] })}
                className={FIELD_CLASS}
                data-testid={`${testIdPrefix}-direction`}
              >
                {DIRECTION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        <div className="rounded-2xl border border-border-subtle bg-surface-field/60 p-4">
          <AmountRangeControl
            minBound={amountMinBound}
            maxBound={amountMaxBound}
            minValue={filters.minAmount}
            maxValue={filters.maxAmount}
            onChange={(updates) => onChange(updates)}
            testIdPrefix={`${testIdPrefix}-amount-range`}
            inputClassName={AMOUNT_INPUT_CLASS}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <label className="flex items-center justify-between gap-4 rounded-2xl border border-border-subtle bg-surface-field px-4 py-3">
            <span className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-border-subtle text-text-tertiary">
                <Repeat className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-text-primary">Recurring only</span>
                <span className="block text-xs text-text-tertiary">Show transactions linked to a recurring rule.</span>
              </span>
            </span>
            <input
              type="checkbox"
              checked={filters.recurring}
              onChange={(event) => onChange({ recurring: event.target.checked })}
              className="h-5 w-5 rounded border-border-strong bg-surface text-accent focus:ring-accent"
              data-testid={`${testIdPrefix}-recurring-filter`}
            />
          </label>

          <label className={FIELD_GROUP_CLASS}>
            <span className={LABEL_CLASS}>
              <Tag className="h-4 w-4" aria-hidden="true" />
              Tag
            </span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" aria-hidden="true" />
              <input
                type="text"
                value={filters.tag}
                onChange={(event) => onChange({ tag: event.target.value })}
                placeholder="Search tag"
                className="min-h-11 w-full rounded-2xl border border-border-subtle bg-surface-field py-2 pl-11 pr-4 text-sm text-text-primary outline-none transition placeholder:text-text-tertiary focus:border-accent/60"
                data-testid={`${testIdPrefix}-tag-filter`}
              />
            </div>
            {suggestedTags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {suggestedTags.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => onChange({ tag: suggestion })}
                    className="rounded-full border border-border-subtle px-3 py-1 text-xs text-text-secondary transition hover:border-accent/50 hover:text-accent"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            ) : null}
          </label>
        </div>
      </section>

      <div className="rounded-2xl border border-border-subtle bg-surface-panel px-4 py-3 text-xs uppercase tracking-[0.24em] text-text-tertiary">
        Current range: {RANGE_OPTIONS.find((option) => option.value === filters.range)?.label || filters.range}
      </div>
    </div>
  );
}
