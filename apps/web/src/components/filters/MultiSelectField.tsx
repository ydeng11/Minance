"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectFieldProps {
  selectedValues: string[];
  options: MultiSelectOption[];
  onChange: (nextValues: string[]) => void;
  emptyLabel: string;
  testId: string;
  isOpen: boolean;
  onOpenChange: (nextOpen: boolean) => void;
  ariaLabel?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
}

function buildSelectionSummary(selectedValues: string[], options: MultiSelectOption[], emptyLabel: string) {
  if (!selectedValues.length) {
    return emptyLabel;
  }

  const optionLookup = new Map(options.map((option) => [option.value, option.label]));
  const labels = selectedValues.map((value) => optionLookup.get(value) || value);
  if (labels.length <= 2) {
    return labels.join(", ");
  }

  return `${labels.slice(0, 2).join(", ")} +${labels.length - 2}`;
}

function toggleSelection(values: string[], nextValue: string) {
  return values.includes(nextValue)
    ? values.filter((value) => value !== nextValue)
    : [...values, nextValue];
}

export function MultiSelectField({
  selectedValues,
  options,
  onChange,
  emptyLabel,
  testId,
  isOpen,
  onOpenChange,
  ariaLabel,
  searchable = false,
  searchPlaceholder = "Search"
}: MultiSelectFieldProps) {
  const [query, setQuery] = useState("");
  const selectedSet = useMemo(() => new Set(selectedValues), [selectedValues]);
  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return options;
    }

    return options.filter((option) => option.label.toLowerCase().includes(normalizedQuery));
  }, [options, query]);

  useEffect(() => {
    if (!isOpen) {
      queueMicrotask(() => setQuery(""));
    }
  }, [isOpen]);

  return (
    <div>
      <button
        type="button"
        onClick={() => onOpenChange(!isOpen)}
        data-testid={`${testId}-trigger`}
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-2 text-left text-neutral-100 outline-none transition hover:bg-neutral-900"
      >
        <span className="min-w-0 text-sm">{buildSelectionSummary(selectedValues, options, emptyLabel)}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-neutral-500 transition ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen ? (
        <div className="mt-2 rounded-2xl border border-neutral-800 bg-neutral-950/95 p-3 shadow-[0_20px_45px_rgba(0,0,0,0.45)]">
          {searchable ? (
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              data-testid={`${testId}-search`}
              placeholder={searchPlaceholder}
              className="mb-3 h-10 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 text-sm text-neutral-100 outline-none transition focus:border-emerald-500"
            />
          ) : null}

          <div
            role="listbox"
            aria-multiselectable="true"
            className="max-h-56 space-y-2 overflow-y-auto pr-1"
          >
            {filteredOptions.map((option) => {
              const selected = selectedSet.has(option.value);

              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => onChange(toggleSelection(selectedValues, option.value))}
                  className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-sm transition ${
                    selected
                      ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-100"
                      : "border-neutral-800 bg-neutral-900 text-neutral-200 hover:border-neutral-700 hover:bg-neutral-800"
                  }`}
                >
                  <span>{option.label}</span>
                  {selected ? <Check className="h-4 w-4" /> : null}
                </button>
              );
            })}

            {filteredOptions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-neutral-800 px-3 py-4 text-sm text-neutral-500">
                No matches found.
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
