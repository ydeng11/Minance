"use client";

import { Check, ChevronDown, RotateCcw, X, CheckSquare } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";

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
  searchAriaLabel?: string;
}

const FOCUS_RING_CLASS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg";

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

function getNextOptionIndex(currentIndex: number, optionCount: number, direction: 1 | -1) {
  if (optionCount <= 0) {
    return 0;
  }

  return (currentIndex + direction + optionCount) % optionCount;
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
  searchPlaceholder = "Search",
  searchAriaLabel
}: MultiSelectFieldProps) {
  const listboxId = useId();
  const [query, setQuery] = useState("");
  const [activeOptionIndex, setActiveOptionIndex] = useState(0);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedSet = useMemo(() => new Set(selectedValues), [selectedValues]);
  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return options;
    }

    return options.filter((option) => option.label.toLowerCase().includes(normalizedQuery));
  }, [options, query]);

  const defaultActiveOptionIndex = Math.max(filteredOptions.findIndex((option) => selectedValues.includes(option.value)), 0);
  const boundedActiveOptionIndex = Math.min(activeOptionIndex, Math.max(filteredOptions.length - 1, 0));

  useEffect(() => {
    if (!isOpen) {
      queueMicrotask(() => setQuery(""));
    }
  }, [isOpen]);

  function focusOption(index: number) {
    requestAnimationFrame(() => {
      optionRefs.current[index]?.focus();
    });
  }

  function openAndFocusOption(index: number) {
    setActiveOptionIndex(index);
    onOpenChange(true);
    focusOption(index);
  }

  function handleTriggerClick() {
    if (!isOpen) {
      setActiveOptionIndex(defaultActiveOptionIndex);
    }
    onOpenChange(!isOpen);
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const nextIndex = event.key === "ArrowUp" ? filteredOptions.length - 1 : 0;
      openAndFocusOption(Math.max(nextIndex, 0));
      return;
    }

    if (event.key === "Escape" && isOpen) {
      event.preventDefault();
      onOpenChange(false);
    }
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && filteredOptions.length) {
      event.preventDefault();
      focusOption(boundedActiveOptionIndex);
    }
  }

  function handleOptionKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === "Escape") {
      event.preventDefault();
      onOpenChange(false);
      requestAnimationFrame(() => triggerRef.current?.focus());
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const nextIndex = getNextOptionIndex(index, filteredOptions.length, event.key === "ArrowDown" ? 1 : -1);
      setActiveOptionIndex(nextIndex);
      focusOption(nextIndex);
      return;
    }

    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      const nextIndex = event.key === "Home" ? 0 : filteredOptions.length - 1;
      setActiveOptionIndex(nextIndex);
      focusOption(nextIndex);
    }
  }

  return (
    <div>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleTriggerClick}
        onKeyDown={handleTriggerKeyDown}
        data-testid={`${testId}-trigger`}
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-2xl border border-border-subtle bg-surface-field px-4 py-2 text-left text-text-primary outline-none transition hover:bg-surface-elevated ${FOCUS_RING_CLASS}`}
      >
        <span className="min-w-0 text-sm">{buildSelectionSummary(selectedValues, options, emptyLabel)}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-text-muted transition ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {isOpen ? (
        <div className="mt-2 rounded-2xl border border-border-subtle bg-surface-panel/95 p-3 shadow-dialog">
          <div className="mb-3 space-y-2">
            {searchable ? (
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={handleSearchKeyDown}
                data-testid={`${testId}-search`}
                aria-label={searchAriaLabel || searchPlaceholder}
                placeholder={searchPlaceholder}
                className={`h-10 w-full rounded-xl border border-border-subtle bg-surface-field px-3 text-sm text-text-primary outline-none transition focus:border-accent ${FOCUS_RING_CLASS}`}
              />
            ) : null}

            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-text-muted">
                {selectedValues.length > 0
                  ? `${selectedValues.length} selected`
                  : `${options.length} options`}
              </span>
              <div className="flex items-center gap-1">
                {selectedValues.length > 0 && selectedValues.length < options.length ? (
                  <button
                    type="button"
                    onClick={() => onChange(options.map((o) => o.value))}
                    data-testid={`${testId}-select-all`}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-accent transition hover:bg-accent-soft/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                    title="Select all"
                  >
                    <CheckSquare className="h-3 w-3" />
                    All
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onChange([])}
                    data-testid={`${testId}-clear-all`}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-text-muted transition hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                    title="Clear all"
                  >
                    <X className="h-3 w-3" />
                    Clear
                  </button>
                )}
                {selectedValues.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      const allValues = new Set(options.map((o) => o.value));
                      const inverted = options
                        .map((o) => o.value)
                        .filter((v) => !selectedValues.includes(v));
                      onChange(inverted);
                    }}
                    data-testid={`${testId}-invert`}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-text-muted transition hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                    title="Invert selection"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Invert
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div
            id={listboxId}
            role="listbox"
            aria-multiselectable="true"
            className="max-h-56 space-y-2 overflow-y-auto pr-1"
          >
            {filteredOptions.map((option, index) => {
              const selected = selectedSet.has(option.value);

              return (
                <button
                  ref={(element) => {
                    optionRefs.current[index] = element;
                  }}
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  tabIndex={index === boundedActiveOptionIndex ? 0 : -1}
                  onClick={() => onChange(toggleSelection(selectedValues, option.value))}
                  onFocus={() => setActiveOptionIndex(index)}
                  onKeyDown={(event) => handleOptionKeyDown(event, index)}
                  className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-sm outline-none transition ${FOCUS_RING_CLASS} ${
                    selected
                      ? "border-accent/40 bg-accent-soft text-accent"
                      : "border-border-subtle bg-surface-field text-text-primary hover:border-border-strong hover:bg-surface-elevated"
                  }`}
                >
                  <span>{option.label}</span>
                  {selected ? <Check className="h-4 w-4" aria-hidden="true" /> : null}
                </button>
              );
            })}

            {filteredOptions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border-subtle px-3 py-4 text-sm text-text-muted">
                No matches found.
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
