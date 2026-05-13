"use client";

import { useEffect, useMemo, useState } from "react";
import type { Account, Category } from "@/lib/api/types";
import { SharedViewFilters } from "@/components/filters/SharedViewFilters";
import { useViewController } from "@/components/view/ViewController";
import type { ExplorerFilterState } from "../filters";
import { createDefaultExplorerFilterState } from "../filters";

interface ExplorerViewContentProps {
  filters: ExplorerFilterState;
  accounts: Account[];
  categories: Category[];
  availableTags: string[];
  amountBounds?: {
    min: number;
    max: number;
  } | null;
  onApply: (nextFilters: ExplorerFilterState) => void;
}

export function ExplorerViewContent({
  filters,
  accounts,
  categories,
  availableTags,
  amountBounds,
  onApply
}: ExplorerViewContentProps) {
  const [draft, setDraft] = useState<ExplorerFilterState>(() => filters);
  const { setViewActions } = useViewController();

  const accountOptions = useMemo(
    () => [
      { value: "", label: "All accounts" },
      ...accounts.map((account) => ({
        value: account.id,
        label: account.displayName
      }))
    ],
    [accounts]
  );
  const categoryOptions = useMemo(
    () => categories.map((category) => ({ value: category.name, label: category.name })),
    [categories]
  );
  const accountSelectValue = useMemo(() => {
    const activeAccount = accounts.find(
      (account) =>
        draft.account === account.id ||
        draft.account === account.normalizedKey ||
        draft.account === account.displayName
    );

    return activeAccount?.id || draft.account;
  }, [accounts, draft.account]);
  const sharedDraft = useMemo(
    () => ({ ...draft, account: accountSelectValue }),
    [accountSelectValue, draft]
  );

  useEffect(() => {
    setDraft(filters);
  }, [filters]);

  useEffect(() => {
    setViewActions({
      onReset: () => setDraft(createDefaultExplorerFilterState()),
      onApply: () => onApply(draft)
    });

    return () => setViewActions(null);
  }, [draft, onApply, setViewActions]);

  return (
    <SharedViewFilters
      filters={sharedDraft}
      accountMode="single"
      showCompare={true}
      showDirection={true}
      categoryOptions={categoryOptions}
      accountOptions={accountOptions}
      availableTags={availableTags}
      amountBounds={amountBounds || null}
      testIdPrefix="explorer"
      onChange={(updates) =>
        setDraft((current) => ({ ...current, ...(updates as Partial<ExplorerFilterState>) }))
      }
    />
  );
}
