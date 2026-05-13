"use client";

import { useMemo, useState } from "react";
import type { Category } from "@/lib/api/types";
import { AmountRangeControl } from "@/components/filters/AmountRangeControl";
import { MultiSelectField } from "@/components/filters/MultiSelectField";
import type {
  ExplorerFilterState,
  ExplorerTransactionType
} from "../filters";

interface ExplorerAdvancedFiltersProps {
  filters: ExplorerFilterState;
  categories: Category[];
  availableTags: string[];
  amountBounds?: {
    min: number;
    max: number;
  } | null;
  onChange: (updates: Partial<ExplorerFilterState>) => void;
}

type OpenMultiSelectField = "category" | "transactionType";

const TRANSACTION_TYPE_OPTIONS: Array<{ value: ExplorerTransactionType; label: string }> = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "transfer", label: "Transfer" }
];

const FOCUS_RING_CLASS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg";
const EYEBROW_CLASS = "text-[11px] font-medium uppercase tracking-[0.28em] text-accent";
const TITLE_CLASS = "mt-2 text-xl font-semibold tracking-tight text-text-primary";
const DESCRIPTION_CLASS = "mt-2 text-sm text-text-secondary";
const FIELD_GROUP_CLASS = "grid gap-1 text-sm text-text-secondary";
const FIELD_GROUP_WIDE_CLASS = `${FIELD_GROUP_CLASS} sm:col-span-2`;
const FIELD_CLASS =
  `h-11 rounded-2xl border border-border-subtle bg-surface-field px-4 text-text-primary outline-none transition placeholder:text-text-muted focus:border-accent ${FOCUS_RING_CLASS}`;
const AMOUNT_INPUT_CLASS =
  `w-full rounded-xl border border-border-subtle bg-surface-field px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-accent ${FOCUS_RING_CLASS}`;
const CHECKBOX_CLASS =
  `h-4 w-4 rounded border-border-subtle bg-surface-field accent-accent ${FOCUS_RING_CLASS}`;
const SUGGESTIONS_PANEL_CLASS = "rounded-2xl border border-border-subtle bg-surface-panel/95 p-2 shadow-panel";
const SUGGESTIONS_TITLE_CLASS = "mb-2 text-[11px] font-medium uppercase tracking-[0.22em] text-text-muted";
const SUGGESTION_BUTTON_CLASS =
  `rounded-full border border-border-subtle bg-surface-field px-3 py-1 text-sm text-text-primary transition hover:border-border-strong hover:bg-surface-elevated ${FOCUS_RING_CLASS}`;
const CHECKBOX_LABEL_CLASS = "inline-flex cursor-pointer items-center gap-2";

export function ExplorerAdvancedFilters({
  filters,
  categories,
  availableTags,
  amountBounds,
  onChange
}: ExplorerAdvancedFiltersProps) {
  const [openMultiSelect, setOpenMultiSelect] = useState<OpenMultiSelectField | null>(null);

  const categoryOptions = useMemo(
    () => categories.map(({ name }) => ({ value: name, label: name })),
    [categories]
  );
  const filteredTagSuggestions = useMemo(() => {
    const normalizedTag = filters.tag.trim().toLowerCase();
    return availableTags.filter((tag) => tag.toLowerCase().includes(normalizedTag)).slice(0, 8);
  }, [availableTags, filters.tag]);
  const amountBoundMin = Math.floor(amountBounds?.min ?? 0);
  const amountBoundMax = Math.max(amountBoundMin, Math.ceil(amountBounds?.max ?? 0));

  function handleMultiSelectOpen(field: OpenMultiSelectField) {
    return (nextOpen: boolean) => setOpenMultiSelect(nextOpen ? field : null);
  }

  return (
    <section className="space-y-4" data-testid="explorer-advanced-filters">
      <div>
        <p className={EYEBROW_CLASS}>Advanced filters</p>
        <h3 className={TITLE_CLASS}>Refine the analysis view</h3>
        <p className={DESCRIPTION_CLASS}>
          Narrow the dataset with Explorer-specific category, type, and trend controls.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={FIELD_GROUP_WIDE_CLASS}>
          <span>Category</span>
          <MultiSelectField
            selectedValues={filters.categories}
            options={categoryOptions}
            onChange={(categoriesSelected) => onChange({ categories: categoriesSelected })}
            emptyLabel="All categories"
            testId="explorer-category-multiselect"
            isOpen={openMultiSelect === "category"}
            onOpenChange={handleMultiSelectOpen("category")}
            ariaLabel="Filter explorer by category"
            searchable
            searchPlaceholder="Search category"
            searchAriaLabel="Search category"
          />
        </label>

        <label className={FIELD_GROUP_CLASS}>
          Category view
          <select
            value={filters.categoryView}
            onChange={(event) => onChange({ categoryView: event.target.value as ExplorerFilterState["categoryView"] })}
            className={FIELD_CLASS}
          >
            <option value="granular">Granular</option>
            <option value="coarse">Coarse</option>
          </select>
        </label>

        <label className={FIELD_GROUP_CLASS}>
          <span>Transaction type</span>
          <MultiSelectField
            selectedValues={filters.transactionTypes}
            options={TRANSACTION_TYPE_OPTIONS}
            onChange={(transactionTypes) =>
              onChange({ transactionTypes: transactionTypes as ExplorerTransactionType[] })
            }
            emptyLabel="All types"
            testId="explorer-type-multiselect"
            isOpen={openMultiSelect === "transactionType"}
            onOpenChange={handleMultiSelectOpen("transactionType")}
            ariaLabel="Filter explorer by transaction type"
          />
        </label>

        <label className={FIELD_GROUP_CLASS}>
          Direction
          <select
            value={filters.direction}
            onChange={(event) => onChange({ direction: event.target.value as ExplorerFilterState["direction"] })}
            className={FIELD_CLASS}
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
            minValue={filters.minAmount}
            maxValue={filters.maxAmount}
            onChange={({ minAmount, maxAmount }) => onChange({ minAmount, maxAmount })}
            testIdPrefix="explorer"
            inputClassName={AMOUNT_INPUT_CLASS}
          />
        </div>

        <div className="sm:col-span-2">
          <label className={CHECKBOX_LABEL_CLASS}>
            <input
              type="checkbox"
              checked={filters.recurring}
              onChange={(event) => onChange({ recurring: event.target.checked })}
              data-testid="explorer-recurring-filter"
              aria-label="Show only recurring transactions"
              className={CHECKBOX_CLASS}
            />
            <span className="text-sm text-text-secondary">Recurring only</span>
          </label>
        </div>

        <label className={FIELD_GROUP_WIDE_CLASS}>
          Tag
          <input
            value={filters.tag}
            onChange={(event) => onChange({ tag: event.target.value })}
            placeholder="Filter by tag"
            data-testid="explorer-tag-filter"
            className={FIELD_CLASS}
          />
          {filters.tag.trim() && filteredTagSuggestions.length ? (
            <div
              data-testid="explorer-tag-suggestions"
              className={SUGGESTIONS_PANEL_CLASS}
            >
              <div className={SUGGESTIONS_TITLE_CLASS}>
                Suggestions
              </div>
              <div className="flex flex-wrap gap-2">
                {filteredTagSuggestions.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => onChange({ tag })}
                    className={SUGGESTION_BUTTON_CLASS}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </label>
      </div>
    </section>
  );
}
