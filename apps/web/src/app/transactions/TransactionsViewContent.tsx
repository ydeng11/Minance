"use client";

import { useEffect, useState } from "react";
import { SharedViewFilters } from "@/components/filters/SharedViewFilters";
import type { MultiSelectOption } from "@/components/filters/MultiSelectField";
import { useViewController } from "@/components/view/ViewController";
import type { TransactionsFilterState } from "./filters";
import { createDefaultTransactionsFilterState } from "./filters";

interface TransactionsViewContentProps {
  filters: TransactionsFilterState;
  categoryOptions: MultiSelectOption[];
  accountOptions: MultiSelectOption[];
  availableTags: string[];
  amountBounds?: {
    min: number;
    max: number;
  } | null;
  onApply: (nextFilters: TransactionsFilterState) => void;
}

export function TransactionsViewContent({
  filters,
  categoryOptions,
  accountOptions,
  availableTags,
  amountBounds,
  onApply
}: TransactionsViewContentProps) {
  const [draft, setDraft] = useState<TransactionsFilterState>(() => filters);
  const { setViewActions } = useViewController();

  useEffect(() => {
    setDraft(filters);
  }, [filters]);

  useEffect(() => {
    setViewActions({
      onReset: () => setDraft(createDefaultTransactionsFilterState()),
      onApply: () => onApply(draft)
    });

    return () => setViewActions(null);
  }, [draft, onApply, setViewActions]);

  return (
    <SharedViewFilters
      filters={draft}
      accountMode="multi"
      showCompare={false}
      showDirection={false}
      categoryOptions={categoryOptions}
      accountOptions={accountOptions}
      availableTags={availableTags}
      amountBounds={amountBounds || null}
      testIdPrefix="transactions"
      onChange={(updates) =>
        setDraft((current) => ({ ...current, ...(updates as Partial<TransactionsFilterState>) }))
      }
    />
  );
}
