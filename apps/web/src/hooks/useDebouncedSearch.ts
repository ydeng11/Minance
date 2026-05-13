"use client";

import { useState } from "react";
import { useDebouncedCallback } from "use-debounce";

/**
 * Options for the useDebouncedSearch hook.
 */
export interface UseDebouncedSearchOptions {
  /** Debounce delay in milliseconds (default: 300 per D-14) */
  delay?: number;
  /** Callback invoked after debounce delay */
  onChange: (value: string) => void;
}

/**
 * Return type for the useDebouncedSearch hook.
 */
export interface UseDebouncedSearchReturn {
  /** Current local value for immediate UI feedback */
  localValue: string;
  /** Setter for local value */
  setLocalValue: (value: string) => void;
  /** Debounced callback that triggers onChange after delay */
  debouncedOnChange: (value: string) => void;
  /** Cancel pending debounced callback */
  cancel: () => void;
  /** Immediately invoke pending debounced callback */
  flush: () => void;
}

/**
 * Hook for debounced search input handling.
 *
 * Provides immediate local state for UI feedback while delaying
 * the parent callback (onChange) by a configurable debounce period.
 *
 * Per D-14: Default delay is 300ms.
 * Per D-15: Debounce at onChange handler level, not component level.
 * Per D-17: Applies to unified search input only; other filters immediate.
 *
 * Usage pattern:
 * ```typescript
 * const { localValue, setLocalValue, debouncedOnChange } = useDebouncedSearch(
 *   filters.query,
 *   { onChange: (value) => syncFilters({ query: value }) }
 * );
 *
 * <input
 *   value={localValue}
 *   onChange={(e) => {
 *     setLocalValue(e.target.value);         // Immediate UI feedback
 *     debouncedOnChange(e.target.value);     // Debounced URL sync
 *   }}
 * />
 * ```
 */
export function useDebouncedSearch(
  initialValue: string,
  options: UseDebouncedSearchOptions
): UseDebouncedSearchReturn {
  const { delay = 300, onChange } = options;

  // Local state for immediate UI feedback
  const [localValue, setLocalValue] = useState(initialValue);

  // Debounced callback wrapping parent onChange
  const debouncedOnChange = useDebouncedCallback(
    (value: string) => {
      onChange(value);
    },
    delay
  );

  // Expose cancel and flush from useDebouncedCallback
  const { cancel, flush } = debouncedOnChange;

  return {
    localValue,
    setLocalValue,
    debouncedOnChange,
    cancel,
    flush
  };
}