"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, SlidersHorizontal, X } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import { RANGE_OPTIONS } from "@/lib/constants";
import { trapDialogTabKey } from "@/lib/dialogFocus";
import { money } from "@/lib/utils";
import { useApi } from "@/hooks/useApi";
import { useViewController } from "@/components/view/ViewController";
import type { Account, Category, Transaction, TransactionsResponse } from "@/lib/api/types";
import {
  buildTransactionAccountOptions,
  buildTransactionFilterAccountOptions,
  buildDraftFromTransaction,
  createInitialTransactionDraft,
  parseTagListInput,
  reconcileDraftAccountName,
  TRANSACTION_FORM_FIELD_ERROR_KEYS,
  validateTransactionDraft,
  type TransactionFormDraft,
  type TransactionFormErrors
} from "./form";
import {
  buildTransactionsFilterSearchParams,
  createDefaultTransactionsFilterState,
  parseTransactionsFilterState,
  TRANSACTIONS_PAGE_SIZE,
  toTransactionsListApiParams,
  toValidFilterState,
  type TransactionsFilterState,
  type TransactionTypeFilter
} from "./filters";
import { getSharedFilters, setSharedFilters } from "@/lib/sharedFilters";
import {
  buildCreateResultMessage,
  getLedgerAmountBounds,
  sortTransactionsForLedger
} from "./ledger";
import {
  pruneSelectionToVisible,
  toggleSelectAllVisible,
  toggleTransactionSelection
} from "./selection";
import { TransactionEditorFields } from "./TransactionEditorFields";
import { TransactionsViewContent } from "./TransactionsViewContent";

function formatTransactionTypeLabel(type: Transaction["transaction_type"]) {
  switch (type) {
    case "income":
      return "Income";
    case "transfer":
      return "Transfer";
    default:
      return "Expense";
  }
}

function formatTransactionCountLabel(count: number) {
  return `${count} transaction${count === 1 ? "" : "s"}`;
}

function formatPresetRangeLabel(range: string) {
  if (range === "custom") {
    return "Custom range";
  }

  return RANGE_OPTIONS.find((option) => option.value === range)?.label || range;
}

function formatCategoryBadgeLabel(txn: Transaction, categoryView: TransactionsFilterState["categoryView"]) {
  return (categoryView === "coarse"
    ? `${txn.category_coarse_emoji || ""} ${txn.category_coarse || txn.category_final}`
    : `${txn.category_emoji || ""} ${txn.category_final}`).trim();
}

function calculateActiveFilterCount(filters: TransactionsFilterState) {
  const defaults = createDefaultTransactionsFilterState();
  return [
    filters.query !== defaults.query,
    filters.categories.length > 0,
    filters.accounts.length > 0,
    filters.minAmount !== defaults.minAmount,
    filters.maxAmount !== defaults.maxAmount,
    filters.range !== defaults.range,
    filters.start !== defaults.start,
    filters.end !== defaults.end,
    filters.categoryView !== defaults.categoryView,
    filters.transactionTypes.length > 0,
    filters.tag !== defaults.tag,
    filters.recurring !== defaults.recurring
  ].filter(Boolean).length;
}

function pruneFilterValues(selectedValues: string[], allowedValues: string[]) {
  const allowed = new Set(allowedValues);
  return selectedValues.filter((value) => allowed.has(value));
}

function areListsEqual(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function getRequestErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

const BULK_DANGER_BUTTON_CLASS =
  "min-h-11 rounded-xl border border-danger/35 bg-danger-soft px-3 py-2 text-sm font-medium text-danger transition hover:bg-danger-soft/80";
const ROW_DANGER_CONFIRM_BUTTON_CLASS =
  "min-h-11 rounded-lg border border-danger/40 bg-danger-soft px-2 py-1 text-[11px] text-danger transition hover:bg-danger-soft/80 disabled:opacity-60 md:text-xs";
const BULK_DANGER_CONFIRM_BUTTON_CLASS =
  "min-h-11 rounded-xl border border-danger/35 bg-danger px-4 py-2 text-sm font-semibold text-app-bg transition hover:bg-danger/90 disabled:cursor-not-allowed disabled:opacity-70";
const TRANSACTION_DIALOG_BACKDROP_CLASS =
  "fixed inset-0 z-50 flex items-start justify-center bg-app-bg/80 px-4 py-10 backdrop-blur-sm";
const TRANSACTION_DIALOG_PANEL_CLASS =
  "w-full rounded-[28px] border border-border-subtle bg-surface-panel p-5 shadow-dialog";
const TRANSACTION_DIALOG_CLOSE_BUTTON_CLASS =
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-surface-field text-text-secondary transition hover:bg-surface-elevated hover:text-text-primary";
const TRANSACTION_SECONDARY_ACTION_BUTTON_CLASS =
  "min-h-11 rounded-xl border border-border-strong bg-surface-field px-4 py-2 text-sm text-text-secondary transition hover:bg-surface-elevated hover:text-text-primary";
const TRANSACTION_PRIMARY_ACTION_BUTTON_CLASS =
  "min-h-11 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-app-bg transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-70";
const TRANSACTION_INLINE_EDITOR_CELL_CLASS =
  "border-t border-border-subtle bg-surface-panel/70 px-5 py-5";
const TRANSACTION_HERO_SECTION_CLASS =
  "rounded-[28px] border border-border-subtle bg-surface-panel p-6 shadow-panel";
const TRANSACTION_HERO_EYEBROW_CLASS =
  "inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent-soft px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-accent";
const TRANSACTION_HERO_COUNT_BADGE_CLASS =
  "inline-flex items-center rounded-full border border-border-subtle bg-surface-field px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-text-muted";
const TRANSACTION_HERO_NOTE_CLASS =
  "rounded-[24px] border border-border-subtle bg-surface-field px-4 py-3 text-sm text-text-secondary";
const TRANSACTION_HERO_PRIMARY_BUTTON_CLASS =
  "rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-app-bg transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60";
const TRANSACTION_HERO_SECONDARY_BUTTON_CLASS =
  "inline-flex items-center gap-2 rounded-2xl border border-border-strong bg-surface-field px-4 py-3 text-sm font-medium text-text-secondary transition hover:bg-surface-elevated hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-60";
const TRANSACTION_ACTIVE_FILTER_CHIP_CLASS =
  "inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface-field px-3 py-1.5 text-sm text-text-secondary transition hover:bg-surface-elevated hover:text-text-primary";
const TRANSACTION_ACTIVE_FILTER_ICON_CLASS = "h-3.5 w-3.5 text-text-muted";
const TRANSACTION_ACTIVE_FILTER_EMPTY_CLASS =
  "rounded-full border border-border-subtle bg-surface-field px-3 py-1.5 text-sm text-text-muted";
const TRANSACTION_LEDGER_SHELL_CLASS =
  "overflow-hidden rounded-[30px] border border-border-subtle bg-surface-panel shadow-panel";
const TRANSACTION_BULK_BAR_CLASS =
  "relative z-20 flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle bg-surface-elevated/70 px-5 py-3.5";
const TRANSACTION_BULK_BAR_TEXT_CLASS = "text-sm text-text-secondary";
const TRANSACTION_BULK_BAR_COUNT_CLASS = "font-semibold text-text-primary";
const TRANSACTION_BULK_ACTION_BUTTON_CLASS =
  "min-h-11 rounded-xl border border-border-strong bg-surface-field px-3 py-2 text-sm text-text-secondary transition hover:bg-surface-elevated hover:text-text-primary disabled:opacity-60";
const TRANSACTION_BULK_DROPDOWN_PANEL_CLASS =
  "absolute left-0 top-full z-30 mt-1 rounded-lg border border-border-subtle bg-surface-panel p-3 shadow-dialog";
const TRANSACTION_BULK_FIELD_CLASS =
  "w-full rounded-md border border-border-subtle bg-surface-field px-3 py-2 text-sm text-text-primary";
const TRANSACTION_BULK_APPLY_BUTTON_CLASS =
  "mt-2 min-h-11 w-full rounded-md border border-accent/40 bg-accent-soft px-3 py-2 text-sm text-accent disabled:opacity-60";
const TRANSACTION_BULK_REVIEW_OPTION_CLASS =
  "block min-h-11 w-full rounded-md px-3 py-2 text-left text-sm text-text-secondary hover:bg-surface-elevated hover:text-text-primary";
const TRANSACTION_BULK_HELP_TEXT_CLASS = "mt-1 text-xs text-text-muted";
const TRANSACTION_TABLE_SCROLL_CLASS =
  "overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg";
const TRANSACTION_TABLE_CLASS =
  "w-full min-w-full text-left text-sm text-text-secondary lg:min-w-[1160px]";
const TRANSACTION_TABLE_HEAD_CLASS =
  "sticky top-0 z-10 bg-surface-elevated/90 text-text-secondary shadow-panel backdrop-blur";
const TRANSACTION_TABLE_BODY_CLASS = "divide-y divide-border-subtle";
const TRANSACTION_SELECTION_CHECKBOX_CLASS =
  "h-4 w-4 rounded border border-border-strong bg-surface-field text-accent focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg";
const TRANSACTION_TABLE_SKELETON_ROW_CLASS = "animate-pulse";
const TRANSACTION_TABLE_SKELETON_LINE_CLASS = "rounded bg-surface-field";
const TRANSACTION_TABLE_SKELETON_PILL_CLASS = "rounded-xl bg-surface-field";
const TRANSACTION_ROW_ACTION_BUTTON_CLASS =
  "min-h-11 rounded-xl border border-border-strong bg-surface-field px-2.5 py-1.5 text-[11px] font-medium text-text-secondary transition hover:bg-surface-elevated hover:text-text-primary disabled:opacity-60 md:px-3 md:py-2 md:text-xs";
const TRANSACTION_ROW_CANCEL_BUTTON_CLASS =
  "min-h-11 rounded-lg border border-border-strong bg-surface-field px-2 py-1 text-[11px] text-text-secondary transition hover:bg-surface-elevated hover:text-text-primary disabled:opacity-60 md:text-xs";
const TRANSACTION_PAGINATION_BAR_CLASS =
  "flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle bg-surface-elevated/70 px-5 py-3.5";
const TRANSACTION_PAGINATION_SUMMARY_CLASS = "text-xs text-text-muted";
const TRANSACTION_PAGINATION_BUTTON_CLASS =
  "min-h-11 rounded-md border border-border-strong bg-surface-field px-2 py-1 text-xs text-text-secondary transition hover:bg-surface-elevated hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-60";
const TRANSACTION_PAGINATION_INDICATOR_CLASS = "text-xs text-text-secondary";
const TRANSACTION_ROW_CLASS = "align-top transition hover:bg-surface-field/50";
const TRANSACTION_ROW_SECONDARY_CELL_CLASS = "hidden px-5 py-5 text-text-secondary lg:table-cell";
const TRANSACTION_ROW_PRIMARY_TEXT_CLASS = "font-medium text-text-primary";
const TRANSACTION_ROW_MUTED_TEXT_CLASS = "text-xs text-text-muted";
const TRANSACTION_ROW_DESCRIPTION_CLASS = "mt-1 text-sm text-text-secondary";
const TRANSACTION_ROW_METADATA_CHIP_CLASS =
  "rounded-full border border-border-subtle bg-surface-field/70 px-2 py-1";
const TRANSACTION_ROW_CATEGORY_BADGE_CLASS =
  "inline-flex items-center gap-2 rounded-xl border border-border-subtle bg-surface-field px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] text-text-secondary";
const TRANSACTION_AMOUNT_INFLOW_CLASS = "text-accent";
const TRANSACTION_RECURRING_BADGE_CLASS =
  "ml-2 inline-flex items-center rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent";
const TRANSACTION_EMPTY_TITLE_CLASS = "font-medium text-text-primary";
const TRANSACTION_EMPTY_COPY_CLASS = "mt-2 text-sm text-text-muted";
const TRANSACTION_EMPTY_ACTION_CLASS =
  "mt-3 rounded-md text-sm text-accent transition hover:text-accent/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg";

function getFilterValidationMessage(filters: TransactionsFilterState) {
  if (filters.range === "custom" && filters.start && filters.end && filters.start > filters.end) {
    return "Custom date range is invalid: start date must be before end date.";
  }

  if (filters.minAmount && filters.maxAmount && Number(filters.minAmount) > Number(filters.maxAmount)) {
    return "Amount range is invalid: minimum must be less than or equal to maximum.";
  }

  return null;
}

export default function TransactionsPage() {
  const api = useApi();
  const { registerView } = useViewController();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamKey = searchParams.toString();

  const parsedFilters = useMemo(
    () => toValidFilterState(parseTransactionsFilterState(searchParams)),
    [searchParams]
  );

  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsMeta, setTransactionsMeta] = useState<TransactionsResponse["meta"] | null>(null);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [filters, setFilters] = useState<TransactionsFilterState>(createDefaultTransactionsFilterState);
  const filtersRef = useRef<TransactionsFilterState>(createDefaultTransactionsFilterState());
  const lastAppliedQueryRef = useRef<string | null>(null);
  const isApplyingSharedFiltersRef = useRef(false);
  const [form, setForm] = useState<TransactionFormDraft>(() => createInitialTransactionDraft());
  const [formErrors, setFormErrors] = useState<TransactionFormErrors>({});
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<Set<string>>(() => new Set());
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [bulkCategoryOpen, setBulkCategoryOpen] = useState(false);
  const [bulkCategoryValue, setBulkCategoryValue] = useState("");
  const [bulkTagsOpen, setBulkTagsOpen] = useState(false);
  const [bulkTagsValue, setBulkTagsValue] = useState("");
  const [bulkTagsError, setBulkTagsError] = useState<string | null>(null);
  const [bulkReviewOpen, setBulkReviewOpen] = useState(false);
  const [bulkApplying, setBulkApplying] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const createDialogRef = useRef<HTMLElement | null>(null);
  const bulkDeleteDialogRef = useRef<HTMLElement | null>(null);
  const previousFocusedElementRef = useRef<HTMLElement | null>(null);

  // Server returns data sorted by sort_direction.
  // Client-side sort ensures correctness even before server restart or for optimistic updates.
  const ledgerTransactions = useMemo(() => sortTransactionsForLedger(transactions, filters.sortDirection), [transactions, filters.sortDirection]);
  const amountBounds = useMemo(
    () => getLedgerAmountBounds(transactionsMeta, ledgerTransactions),
    [ledgerTransactions, transactionsMeta]
  );
  const activeFilterCount = useMemo(() => calculateActiveFilterCount(parsedFilters), [parsedFilters]);

  const categoryFilterOptions = useMemo(() => {
    if (filters.categoryView === "granular") {
      return categories.map((entry) => entry.name);
    }

    return Array.from(
      new Set(ledgerTransactions.map((entry) => entry.category_coarse || "").filter(Boolean))
    );
  }, [categories, filters.categoryView, ledgerTransactions]);

  const accountFilterOptions = useMemo(() => {
    return buildTransactionFilterAccountOptions(
      accounts,
      ledgerTransactions.map((transaction) => transaction.account_key)
    );
  }, [accounts, ledgerTransactions]);
  const categoryMultiSelectOptions = useMemo(
    () => categoryFilterOptions.map((value) => ({ value, label: value })),
    [categoryFilterOptions]
  );
  const transactionAccountOptions = useMemo(
    () => buildTransactionAccountOptions(accounts, form.account_name),
    [accounts, form.account_name]
  );

  const totalPages = Math.max(1, Math.ceil(totalTransactions / TRANSACTIONS_PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, filters.page), totalPages);
  const pageStart = totalTransactions === 0 ? 0 : ((currentPage - 1) * TRANSACTIONS_PAGE_SIZE) + 1;
  const pageEnd = totalTransactions === 0
    ? 0
    : Math.min(currentPage * TRANSACTIONS_PAGE_SIZE, totalTransactions);
  const visibleTransactionIds = useMemo(() => ledgerTransactions.map((entry) => entry.id), [ledgerTransactions]);
  const selectedVisibleCount = selectedTransactionIds.size;
  const hasVisibleSelection = selectedVisibleCount > 0;
  const hasVisibleTransactions = visibleTransactionIds.length > 0;
  const allVisibleSelected = visibleTransactionIds.length > 0 && selectedVisibleCount === visibleTransactionIds.length;
  const selectionInputDisabled = loading || saving || bulkDeleting;
  const createDialogDefaultCategory = categories[0]?.name || "";

  const applyTransactionViewFilters = useCallback(
    (nextFilters: TransactionsFilterState) => {
      return commitValidatedFilters(toValidFilterState({
        ...nextFilters,
        page: 1
      }));
    },
    // commitValidatedFilters only relies on stable state setters, refs, and router helpers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const transactionViewContent = useMemo(
    () => (
      <TransactionsViewContent
        filters={filters}
        categoryOptions={categoryMultiSelectOptions}
        accountOptions={accountFilterOptions}
        availableTags={transactionsMeta?.availableTags || []}
        amountBounds={transactionsMeta?.amountBounds || amountBounds}
        onApply={applyTransactionViewFilters}
      />
    ),
    [
      accountFilterOptions,
      applyTransactionViewFilters,
      amountBounds,
      categoryMultiSelectOptions,
      filters,
      transactionsMeta?.amountBounds,
      transactionsMeta?.availableTags
    ]
  );

  useEffect(() => {
    registerView({
      title: "Transaction filters",
      description: "Adjust the ledger view from the shell without leaving the page.",
      content: transactionViewContent
    });

    return () => registerView(null);
  }, [registerView, transactionViewContent]);

  async function loadCategories() {
    try {
      const categoryData = await api.categories.list();
      setCategories(categoryData.categories);
      setForm((previous) => {
        if (previous.category_final || !categoryData.categories[0]) {
          return previous;
        }
        return {
          ...previous,
          category_final: categoryData.categories[0].name
        };
      });
    } catch {
      // Category loading errors are surfaced by transaction list load.
    }
  }

  async function loadAccounts() {
    try {
      const accountData = await api.accounts.list();
      setAccounts(accountData.accounts);
      setForm((previous) => {
        if (previous.id) {
          return reconcileDraftAccountName(previous, accountData.accounts);
        }

        if (previous.account_name !== "Manual Account" || accountData.accounts.length === 0) {
          return previous;
        }

        return {
          ...previous,
          account_name: accountData.accounts[0].displayName
        };
      });
    } catch {
      // Account filters remain optional; keep page usable when this call fails.
    }
  }

  async function loadTransactions(nextFilters: TransactionsFilterState) {
    setLoading(true);

    try {
      const transactionData = await api.transactions.list(toTransactionsListApiParams(nextFilters));
      setTransactions(transactionData.items);
      setTransactionsMeta(transactionData.meta);
      setTotalTransactions(transactionData.total);
      return transactionData;
    } catch (error) {
      toast.error(getRequestErrorMessage(error, "Failed to load transactions."));
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function refreshTransactionsView(nextFilters: TransactionsFilterState) {
    const [, , transactionData] = await Promise.all([
      loadCategories(),
      loadAccounts(),
      loadTransactions(nextFilters)
    ]);

    return transactionData;
  }

  useEffect(() => {
    void Promise.all([loadCategories(), loadAccounts()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // On mount, apply shared filters if no URL params present
  useEffect(() => {
    const hasUrlParams = searchParams.toString().length > 0;
    if (!hasUrlParams) {
      isApplyingSharedFiltersRef.current = true;

      const shared = getSharedFilters();
      const merged = toValidFilterState({
        ...createDefaultTransactionsFilterState(),
        range: shared.range,
        start: shared.start,
        end: shared.end,
        categories: shared.categories,
        accounts: shared.accounts,
        query: shared.query,
        tag: shared.tag,
        transactionTypes: shared.transactionTypes as TransactionTypeFilter[],
        categoryView: shared.categoryView,
        recurring: shared.recurring
      });
      setFilters(merged);
      filtersRef.current = merged;

      void loadTransactions(merged);

      const nextSearchParams = buildTransactionsFilterSearchParams(merged);
      lastAppliedQueryRef.current = nextSearchParams.toString();
      router.replace(nextSearchParams.toString() ? `/transactions?${nextSearchParams.toString()}` : "/transactions");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // On first render, skip if shared filters are being applied in the mount effect
    // This prevents the race condition where searchParamKey is empty but shared filters exist
    if (isApplyingSharedFiltersRef.current) {
      isApplyingSharedFiltersRef.current = false;
      return;
    }

    // Skip data load if URL change is from our own shared filter application
    // (Data was already loaded in the mount effect with correct filters)
    if (lastAppliedQueryRef.current === searchParamKey) {
      setFilters(parsedFilters);
      filtersRef.current = parsedFilters;
      return;
    }

    setFilters(parsedFilters);
    filtersRef.current = parsedFilters;
    void loadTransactions(parsedFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParamKey]);

  useEffect(() => {
    const nextCategories = pruneFilterValues(filters.categories, categoryFilterOptions);
    if (!areListsEqual(nextCategories, filters.categories)) {
      updateFilters((previous) => ({
        ...previous,
        categories: nextCategories
      }));
    }
  }, [categoryFilterOptions, filters.categories]);

  useEffect(() => {
    const nextAccounts = pruneFilterValues(
      filters.accounts,
      accountFilterOptions.map((option) => option.value)
    );
    if (!areListsEqual(nextAccounts, filters.accounts)) {
      updateFilters((previous) => ({
        ...previous,
        accounts: nextAccounts
      }));
    }
  }, [accountFilterOptions, filters.accounts]);

  useEffect(() => {
    setSelectedTransactionIds((previous) => pruneSelectionToVisible(previous, visibleTransactionIds));
  }, [visibleTransactionIds]);

  useEffect(() => {
    if (selectedTransactionIds.size === 0) {
      setIsBulkDeleteDialogOpen(false);
    }
  }, [selectedTransactionIds]);

  // Close bulk dropdowns on click outside
  useEffect(() => {
    if (!bulkCategoryOpen && !bulkTagsOpen && !bulkReviewOpen) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-bulk-dropdown]")) {
        setBulkCategoryOpen(false);
        setBulkTagsOpen(false);
        setBulkReviewOpen(false);
      }
    }

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [bulkCategoryOpen, bulkTagsOpen, bulkReviewOpen]);

  // Close bulk dropdowns on Escape key
  useEffect(() => {
    if (!bulkCategoryOpen && !bulkTagsOpen && !bulkReviewOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setBulkCategoryOpen(false);
        setBulkTagsOpen(false);
        setBulkReviewOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [bulkCategoryOpen, bulkTagsOpen, bulkReviewOpen]);

  useEffect(() => {
    if (!isCreateDialogOpen) {
      return;
    }

    previousFocusedElementRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    requestAnimationFrame(() => {
      createDialogRef.current?.focus();
    });

    function closeDialog() {
      setIsCreateDialogOpen(false);
      setForm(createInitialTransactionDraft({ category: createDialogDefaultCategory }));
      setFormErrors({});
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDialog();
        return;
      }

      trapDialogTabKey(event, createDialogRef.current);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      requestAnimationFrame(() => {
        previousFocusedElementRef.current?.focus();
      });
    };
  }, [createDialogDefaultCategory, isCreateDialogOpen]);

  useEffect(() => {
    if (!isBulkDeleteDialogOpen) {
      return;
    }

    previousFocusedElementRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    requestAnimationFrame(() => {
      bulkDeleteDialogRef.current?.focus();
    });

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsBulkDeleteDialogOpen(false);
        return;
      }

      trapDialogTabKey(event, bulkDeleteDialogRef.current);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      requestAnimationFrame(() => {
        previousFocusedElementRef.current?.focus();
      });
    };
  }, [isBulkDeleteDialogOpen]);

  function clearSelectedTransactions() {
    setSelectedTransactionIds(new Set());
    setIsBulkDeleteDialogOpen(false);
  }

  function toggleRowSelection(transactionId: string) {
    setSelectedTransactionIds((previous) => toggleTransactionSelection(previous, transactionId));
  }

  function toggleVisibleSelection(checked: boolean) {
    setSelectedTransactionIds((previous) => toggleSelectAllVisible(previous, visibleTransactionIds, checked));
  }

  function openBulkDeleteDialog() {
    if (!hasVisibleSelection) {
      return;
    }
    setIsBulkDeleteDialogOpen(true);
  }

  function closeBulkDeleteDialog() {
    setIsBulkDeleteDialogOpen(false);
  }

  function syncFiltersToUrl(nextFilters: TransactionsFilterState) {
    const nextSearchParams = buildTransactionsFilterSearchParams(nextFilters);
    const queryText = nextSearchParams.toString();
    lastAppliedQueryRef.current = queryText;
    router.replace(queryText ? `/transactions?${queryText}` : "/transactions", { scroll: false });
  }

  function updateFilters(updater: TransactionsFilterState | ((previous: TransactionsFilterState) => TransactionsFilterState)) {
    const next = typeof updater === "function" ? updater(filtersRef.current) : updater;
    filtersRef.current = next;
    setFilters(next);
  }

  function setFormField<K extends keyof TransactionFormDraft>(field: K, value: TransactionFormDraft[K]) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  function handleTransactionFieldBlur(field: keyof TransactionFormDraft) {
    const errorKey = TRANSACTION_FORM_FIELD_ERROR_KEYS[field];
    if (!errorKey) {
      return;
    }

    const { errors } = validateTransactionDraft(form, categories);
    const message = errors[errorKey];
    setFormErrors((previous) => {
      const next = { ...previous };
      if (message) {
        next[errorKey] = message;
      } else {
        delete next[errorKey];
      }
      return next;
    });
  }

  function commitFilters(nextFilters: TransactionsFilterState) {
    updateFilters(nextFilters);
    syncFiltersToUrl(nextFilters);
    void loadTransactions(nextFilters);

    // Update shared filters for cross-page sync
    setSharedFilters({
      range: nextFilters.range,
      start: nextFilters.start,
      end: nextFilters.end,
      categories: nextFilters.categories,
      accounts: nextFilters.accounts,
      query: nextFilters.query,
      tag: nextFilters.tag,
      transactionTypes: nextFilters.transactionTypes,
      categoryView: nextFilters.categoryView,
      recurring: nextFilters.recurring
    });
  }

  function commitFiltersWithSelectionReset(nextFilters: TransactionsFilterState) {
    clearSelectedTransactions();
    commitFilters(nextFilters);
  }

  function commitValidatedFilters(nextFilters: TransactionsFilterState) {
    const validationMessage = getFilterValidationMessage(nextFilters);
    if (validationMessage) {
      toast.error(validationMessage);
      return false;
    }

    commitFiltersWithSelectionReset(nextFilters);
    return true;
  }

  function clearAllFiltersAndApply() {
    return commitValidatedFilters(toValidFilterState(createDefaultTransactionsFilterState()));
  }

  function clearAppliedFilter(updates: Partial<TransactionsFilterState>) {
    const nextFilters = toValidFilterState({
      ...parsedFilters,
      ...updates,
      page: 1
    });
    commitFiltersWithSelectionReset(nextFilters);
  }

  function navigateToPage(nextPage: number) {
    const boundedPage = Math.min(Math.max(1, nextPage), totalPages);
    const nextFilters = toValidFilterState({
      ...filtersRef.current,
      page: boundedPage
    });
    if (nextFilters.page === filtersRef.current.page) {
      return;
    }

    commitFiltersWithSelectionReset(nextFilters);
  }

  function resetManualForm() {
    setForm(createInitialTransactionDraft({ category: categories[0]?.name || "" }));
    setFormErrors({});
  }

  function openCreateDialog() {
    if (form.id) {
      toast.warning("Finish the inline edit before creating a new transaction.");
      return;
    }
    clearSelectedTransactions();
    resetManualForm();
    setIsCreateDialogOpen(true);
  }

  function closeCreateDialog() {
    setIsCreateDialogOpen(false);
    resetManualForm();
  }

  async function exportTransactionsToCsv() {
    setIsExporting(true);
    try {
      // Fetch all transactions matching current filters
      const allTransactions: Transaction[] = [];
      const pageSize = 250;
      let offset = 0;

      for (let page = 0; page < 100; page += 1) {
        const response = await api.transactions.list({
          ...toTransactionsListApiParams(filters),
          limit: pageSize,
          offset
        });
        allTransactions.push(...response.items);

        offset += response.items.length;
        if (!response.items.length || offset >= response.total || response.items.length < pageSize) {
          break;
        }
      }

      // Convert to CSV
      const escapeCsvField = (value: string): string => `"${value.replace(/"/g, '""')}"`;

      const headers = ["date", "merchant", "category", "amount", "account", "type", "tags"];
      const rows = allTransactions.map((t) => [
        t.transaction_date,
        escapeCsvField(t.merchant_normalized || ""),
        escapeCsvField(t.category_final || ""),
        t.amount.toString(),
        escapeCsvField(t.account_key || ""),
        t.transaction_type,
        escapeCsvField((t.tags || []).join("; "))
      ].join(","));

      const csv = [headers.join(","), ...rows].join("\n");

      // Download
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`Exported ${allTransactions.length} transactions.`);
    } catch (error) {
      toast.error(getRequestErrorMessage(error, "Failed to export transactions."));
    } finally {
      setIsExporting(false);
    }
  }

  function startEdit(transaction: Transaction) {
    setDeleteConfirmId(null);
    clearSelectedTransactions();
    setIsCreateDialogOpen(false);
    setForm(buildDraftFromTransaction(transaction, accounts));
    setFormErrors({});
  }

  function cancelEdit() {
    resetManualForm();
    toast.message("Edit canceled.");
  }

  async function undoSingleTransactionDelete(transactionId: string) {
    try {
      await api.transactions.restore(transactionId);
      await loadTransactions(filtersRef.current);
      toast.success("Transaction restored.");
    } catch (error) {
      toast.error(getRequestErrorMessage(error, "Failed to restore transaction."));
    }
  }

  async function undoBulkTransactionDelete(transactionIds: string[]) {
    try {
      await Promise.all(transactionIds.map((id) => api.transactions.restore(id)));
      await loadTransactions(filtersRef.current);
      toast.success("Transactions restored.");
    } catch (error) {
      toast.error(getRequestErrorMessage(error, "Failed to restore transactions."));
    }
  }

  async function removeTransaction(transactionId: string) {
    const snapshot = transactions.find((entry) => entry.id === transactionId);
    if (!snapshot) {
      return;
    }

    const wasEditing = form.id === transactionId;
    const previousTransactions = transactions;
    const previousTotal = totalTransactions;

    clearSelectedTransactions();
    setDeleteConfirmId(null);
    if (wasEditing) {
      resetManualForm();
    }

    setTransactions((previous) => sortTransactionsForLedger(previous.filter((entry) => entry.id !== transactionId), filtersRef.current.sortDirection));
    setTotalTransactions((previous) => Math.max(0, previous - 1));

    try {
      await api.transactions.remove(transactionId);
      toast.success("Transaction deleted.", {
        duration: 5000,
        action: {
          label: "Undo",
          onClick: () => void undoSingleTransactionDelete(transactionId)
        }
      });
    } catch (error) {
      setTransactions(previousTransactions);
      setTotalTransactions(previousTotal);
      if (wasEditing) {
        setForm(buildDraftFromTransaction(snapshot, accounts));
        setFormErrors({});
      }
      toast.error(getRequestErrorMessage(error, "Failed to delete transaction."));
    }
  }

  async function removeSelectedTransactions() {
    const selectedIds = Array.from(selectedTransactionIds);
    const deletedCount = selectedIds.length;

    if (!deletedCount) {
      return;
    }

    const editingSnapshot =
      form.id && selectedIds.includes(form.id)
        ? transactions.find((entry) => entry.id === form.id) ?? null
        : null;

    const previousTransactions = transactions;
    const previousTotal = totalTransactions;
    const previousSelection = new Set(selectedTransactionIds);

    closeBulkDeleteDialog();
    if (editingSnapshot) {
      resetManualForm();
    }

    setTransactions((previous) =>
      sortTransactionsForLedger(previous.filter((entry) => !selectedIds.includes(entry.id)), filtersRef.current.sortDirection)
    );
    setTotalTransactions((previous) => Math.max(0, previous - deletedCount));
    clearSelectedTransactions();

    setBulkDeleting(true);

    try {
      await api.transactions.bulkUpdate({
        transaction_ids: selectedIds,
        operation: "delete"
      });
      toast.success(`${formatTransactionCountLabel(deletedCount)} deleted.`, {
        duration: 5000,
        action: {
          label: "Undo",
          onClick: () => void undoBulkTransactionDelete(selectedIds)
        }
      });
    } catch (error) {
      setTransactions(previousTransactions);
      setTotalTransactions(previousTotal);
      setSelectedTransactionIds(previousSelection);
      if (editingSnapshot) {
        setForm(buildDraftFromTransaction(editingSnapshot, accounts));
        setFormErrors({});
      }
      toast.error(getRequestErrorMessage(error, "Failed to delete selected transactions."));
    } finally {
      setBulkDeleting(false);
    }
  }

  async function applyBulkCategory() {
    if (!bulkCategoryValue) return;
    const selectedIds = Array.from(selectedTransactionIds);
    setBulkApplying(true);
    try {
      await api.transactions.bulkUpdate({
        transaction_ids: selectedIds,
        operation: "update",
        category_final: bulkCategoryValue
      });
      toast.success(`${formatTransactionCountLabel(selectedVisibleCount)} updated.`);
      setBulkCategoryOpen(false);
      setBulkCategoryValue("");
      setSelectedTransactionIds(new Set());
      await refreshTransactionsView(filtersRef.current);
    } catch (error) {
      toast.error(getRequestErrorMessage(error, "Failed to update categories."));
    } finally {
      setBulkApplying(false);
    }
  }

  async function applyBulkTags() {
    const parsed = parseTagListInput(bulkTagsValue);
    if (parsed.error) {
      setBulkTagsError(parsed.error);
      return;
    }
    if (!parsed.tags.length) return;

    const selectedIds = Array.from(selectedTransactionIds);
    setBulkApplying(true);
    setBulkTagsError(null);
    try {
      await api.transactions.bulkUpdate({
        transaction_ids: selectedIds,
        operation: "update",
        tags: parsed.tags
      });
      toast.success(`${formatTransactionCountLabel(selectedVisibleCount)} tagged.`);
      setBulkTagsOpen(false);
      setBulkTagsValue("");
      setSelectedTransactionIds(new Set());
      await refreshTransactionsView(filtersRef.current);
    } catch (error) {
      toast.error(getRequestErrorMessage(error, "Failed to update tags."));
    } finally {
      setBulkApplying(false);
    }
  }

  async function applyBulkReview(status: "reviewed" | "needs_review") {
    const selectedIds = Array.from(selectedTransactionIds);
    setBulkApplying(true);
    try {
      await api.transactions.bulkUpdate({
        transaction_ids: selectedIds,
        operation: "update",
        review_status: status
      });
      toast.success(
        `${formatTransactionCountLabel(selectedVisibleCount)} marked as ${status === "reviewed" ? "reviewed" : "needing review"}.`
      );
      setBulkReviewOpen(false);
      setSelectedTransactionIds(new Set());
      await refreshTransactionsView(filtersRef.current);
    } catch (error) {
      toast.error(getRequestErrorMessage(error, "Failed to update review status."));
    } finally {
      setBulkApplying(false);
    }
  }

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validation = validateTransactionDraft(form, categories);
    if (!validation.payload) {
      setFormErrors(validation.errors);
      toast.error("Fix form errors before saving.");
      return;
    }

    setSaving(true);
    setFormErrors({});

    try {
      if (form.id) {
        clearSelectedTransactions();
        await api.transactions.update(form.id, validation.payload);
        toast.success("Transaction updated.");
        resetManualForm();
        await refreshTransactionsView(filtersRef.current);
      } else {
        clearSelectedTransactions();
        const created = await api.transactions.create(validation.payload);
        const nextFilters = toValidFilterState({
          ...filtersRef.current,
          page: 1
        });

        closeCreateDialog();
        commitFilters(nextFilters);

        const transactionData = await refreshTransactionsView(nextFilters);

        toast.success(buildCreateResultMessage(created.transaction.id, transactionData?.items || []));
      }
    } catch (error) {
      toast.error(getRequestErrorMessage(error, "Failed to save transaction."));
    } finally {
      setSaving(false);
    }
  }

  const activeFilterChips = (() => {
    const accountLabels = new Map(accountFilterOptions.map((option) => [option.value, option.label]));
    const items: Array<{
      key: string;
      label: string;
      clear: () => void;
    }> = [];

    if (parsedFilters.query) {
      items.push({
        key: "query",
        label: `Search: ${parsedFilters.query}`,
        clear: () => clearAppliedFilter({ query: "" })
      });
    }

    if (parsedFilters.categories.length) {
      items.push({
        key: "categories",
        label: `Categories: ${parsedFilters.categories.join(", ")}`,
        clear: () => clearAppliedFilter({ categories: [] })
      });
    }

    if (parsedFilters.accounts.length) {
      const labels = parsedFilters.accounts.map((value) => accountLabels.get(value) || value);
      items.push({
        key: "accounts",
        label: `Accounts: ${labels.join(", ")}`,
        clear: () => clearAppliedFilter({ accounts: [] })
      });
    }

    if (parsedFilters.transactionTypes.length) {
      items.push({
        key: "types",
        label: `Types: ${parsedFilters.transactionTypes
          .map((value) => value.charAt(0).toUpperCase() + value.slice(1))
          .join(", ")}`,
        clear: () => clearAppliedFilter({ transactionTypes: [] })
      });
    }

    if (parsedFilters.tag) {
      items.push({
        key: "tag",
        label: `Tag: ${parsedFilters.tag}`,
        clear: () => clearAppliedFilter({ tag: "" })
      });
    }

    if (parsedFilters.minAmount || parsedFilters.maxAmount) {
      const minLabel = parsedFilters.minAmount ? `$${parsedFilters.minAmount}` : "$0";
      const maxLabel = parsedFilters.maxAmount ? `$${parsedFilters.maxAmount}` : "max";
      items.push({
        key: "amount",
        label: `Amount: ${minLabel} to ${maxLabel}`,
        clear: () => clearAppliedFilter({ minAmount: "", maxAmount: "" })
      });
    }

    if (parsedFilters.range !== createDefaultTransactionsFilterState().range) {
      const rangeLabel = parsedFilters.range === "custom"
        ? `Range: ${parsedFilters.start || "start"} to ${parsedFilters.end || "end"}`
        : `Range: ${formatPresetRangeLabel(parsedFilters.range)}`;
      items.push({
        key: "range",
        label: rangeLabel,
        clear: () => clearAppliedFilter({ range: createDefaultTransactionsFilterState().range, start: "", end: "" })
      });
    }

    if (parsedFilters.categoryView !== createDefaultTransactionsFilterState().categoryView) {
      items.push({
        key: "category-view",
        label: `View: ${parsedFilters.categoryView === "coarse" ? "Coarse" : "Granular"}`,
        clear: () => clearAppliedFilter({ categoryView: createDefaultTransactionsFilterState().categoryView, categories: [] })
      });
    }

    if (parsedFilters.recurring) {
      items.push({
        key: "recurring",
        label: "Recurring only",
        clear: () => clearAppliedFilter({ recurring: false })
      });
    }

    return items;
  })();

  return (
    <div className="space-y-6" data-testid="transactions-page">
      <header
        data-testid="txn-workspace-header"
        className={TRANSACTION_HERO_SECTION_CLASS}
      >
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <div className={TRANSACTION_HERO_EYEBROW_CLASS}>
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Ledger
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-3xl font-semibold tracking-tight text-text-primary">Transactions</h2>
                <span className={TRANSACTION_HERO_COUNT_BADGE_CLASS}>
                  {activeFilterCount} active
                </span>
              </div>
              <p className="max-w-3xl text-sm leading-6 text-text-secondary">
                Review the ledger, filter it like a sheet, and create new manual transactions from the top of the page.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <div className={TRANSACTION_HERO_NOTE_CLASS}>
              {totalTransactions === 0
                ? "No rows in the current view"
                : `Showing ${pageStart}-${pageEnd} of ${totalTransactions} rows`}
            </div>
            <button
              type="button"
              onClick={openCreateDialog}
              data-testid="txn-create-open"
              className={TRANSACTION_HERO_PRIMARY_BUTTON_CLASS}
              disabled={saving}
            >
              New transaction
            </button>
            <button
              type="button"
              onClick={() => void exportTransactionsToCsv()}
              disabled={isExporting || totalTransactions === 0}
              data-testid="txn-export-csv"
              className={TRANSACTION_HERO_SECONDARY_BUTTON_CLASS}
            >
              <Download className="h-4 w-4" />
              {isExporting ? "Exporting..." : "Export CSV"}
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2" data-testid="txn-active-filters">
        {activeFilterChips.length ? (
          activeFilterChips.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={filter.clear}
              className={TRANSACTION_ACTIVE_FILTER_CHIP_CLASS}
            >
              {filter.label}
              <X className={TRANSACTION_ACTIVE_FILTER_ICON_CLASS} />
            </button>
          ))
        ) : (
          <div className={TRANSACTION_ACTIVE_FILTER_EMPTY_CLASS}>
            All transactions in view
          </div>
        )}
      </div>

      <section
        data-testid="txn-ledger-shell"
        className={TRANSACTION_LEDGER_SHELL_CLASS}
      >
        {hasVisibleSelection ? (
          <div
            data-testid="txn-bulk-bar"
            className={TRANSACTION_BULK_BAR_CLASS}
          >
            <div className={TRANSACTION_BULK_BAR_TEXT_CLASS}>
              <span className={TRANSACTION_BULK_BAR_COUNT_CLASS}>{selectedVisibleCount}</span> selected on this page
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={clearSelectedTransactions}
                data-testid="txn-bulk-clear"
                className={TRANSACTION_BULK_ACTION_BUTTON_CLASS}
              >
                Clear selection
              </button>

              {/* Category action */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setBulkCategoryOpen(!bulkCategoryOpen);
                    setBulkTagsOpen(false);
                    setBulkReviewOpen(false);
                  }}
                  disabled={bulkApplying}
                  className={TRANSACTION_BULK_ACTION_BUTTON_CLASS}
                  data-testid="txn-bulk-category-btn"
                >
                  Category
                </button>
                {bulkCategoryOpen && (
                  <div data-bulk-dropdown className={`${TRANSACTION_BULK_DROPDOWN_PANEL_CLASS} w-56`}>
                    <select
                      value={bulkCategoryValue}
                      onChange={(e) => setBulkCategoryValue(e.target.value)}
                      className={TRANSACTION_BULK_FIELD_CLASS}
                      data-testid="txn-bulk-category-select"
                      aria-label="Bulk category"
                    >
                      <option value="">Select category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.emoji ? `${c.emoji} ` : ""}{c.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => void applyBulkCategory()}
                      disabled={!bulkCategoryValue || bulkApplying}
                      className={TRANSACTION_BULK_APPLY_BUTTON_CLASS}
                      data-testid="txn-bulk-category-apply"
                    >
                      {bulkApplying ? "Applying..." : `Apply to ${selectedVisibleCount}`}
                    </button>
                  </div>
                )}
              </div>

              {/* Tags action */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setBulkTagsOpen(!bulkTagsOpen);
                    setBulkCategoryOpen(false);
                    setBulkReviewOpen(false);
                  }}
                  disabled={bulkApplying}
                  className={TRANSACTION_BULK_ACTION_BUTTON_CLASS}
                  data-testid="txn-bulk-tags-btn"
                >
                  Tags
                </button>
                {bulkTagsOpen && (
                  <div data-bulk-dropdown className={`${TRANSACTION_BULK_DROPDOWN_PANEL_CLASS} w-64`}>
                    <input
                      type="text"
                      value={bulkTagsValue}
                      onChange={(e) => setBulkTagsValue(e.target.value)}
                      placeholder="Enter tags (comma-separated)"
                      className={TRANSACTION_BULK_FIELD_CLASS}
                      data-testid="txn-bulk-tags-input"
                      aria-label="Bulk tags"
                    />
                    <p className={TRANSACTION_BULK_HELP_TEXT_CLASS}>e.g. &quot;monthly, recurring&quot;</p>
                    {bulkTagsError ? (
                      <p className="mt-1 text-xs text-danger" data-testid="txn-bulk-tags-error">{bulkTagsError}</p>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void applyBulkTags()}
                      disabled={!bulkTagsValue.trim() || bulkApplying}
                      className={TRANSACTION_BULK_APPLY_BUTTON_CLASS}
                      data-testid="txn-bulk-tags-apply"
                    >
                      {bulkApplying ? "Applying..." : `Apply to ${selectedVisibleCount}`}
                    </button>
                  </div>
                )}
              </div>

              {/* Review action */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setBulkReviewOpen(!bulkReviewOpen);
                    setBulkCategoryOpen(false);
                    setBulkTagsOpen(false);
                  }}
                  disabled={bulkApplying}
                  className={TRANSACTION_BULK_ACTION_BUTTON_CLASS}
                  data-testid="txn-bulk-review-btn"
                >
                  Review
                </button>
                {bulkReviewOpen && (
                  <div data-bulk-dropdown className={`${TRANSACTION_BULK_DROPDOWN_PANEL_CLASS} w-48 p-2`}>
                    <button
                      type="button"
                      onClick={() => void applyBulkReview("reviewed")}
                      disabled={bulkApplying}
                      className={TRANSACTION_BULK_REVIEW_OPTION_CLASS}
                      data-testid="txn-bulk-review-mark-reviewed"
                    >
                      Mark as reviewed
                    </button>
                    <button
                      type="button"
                      onClick={() => void applyBulkReview("needs_review")}
                      disabled={bulkApplying}
                      className={TRANSACTION_BULK_REVIEW_OPTION_CLASS}
                      data-testid="txn-bulk-review-mark-needs-review"
                    >
                      Mark as needs review
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={openBulkDeleteDialog}
                data-testid="txn-bulk-delete-open"
                className={BULK_DANGER_BUTTON_CLASS}
              >
                Delete selected
              </button>
            </div>
          </div>
        ) : null}

        <div
          data-testid="txn-table-scroll"
          role="region"
          aria-label="Transactions ledger"
          tabIndex={0}
          className={TRANSACTION_TABLE_SCROLL_CLASS}
        >
          <table className={TRANSACTION_TABLE_CLASS} data-testid="txn-table">
            <caption className="sr-only">Detailed transaction ledger with inline edit and row actions</caption>
            <colgroup>
              <col className="w-[56px]" />
              <col className="w-[132px]" />
              <col />
              <col className="w-[190px]" />
              <col className="w-[220px]" />
              <col className="w-[120px]" />
              <col className="w-[130px]" />
              <col className="w-[144px]" />
            </colgroup>
            <thead className={TRANSACTION_TABLE_HEAD_CLASS}>
              <tr>
                <th scope="col" className="px-5 py-3.5 font-medium">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={(event) => toggleVisibleSelection(event.target.checked)}
                    data-testid="txn-select-all-visible"
                    aria-label="Select all visible transactions"
                    disabled={selectionInputDisabled || !hasVisibleTransactions}
                    className={TRANSACTION_SELECTION_CHECKBOX_CLASS}
                  />
                </th>
                <th scope="col" className="hidden px-5 py-3.5 font-medium lg:table-cell">
                  <button
                    type="button"
                    onClick={() => {
                      const nextDirection = filtersRef.current.sortDirection === "desc" ? "asc" : "desc";
                      commitFiltersWithSelectionReset({
                        ...filtersRef.current,
                        sortDirection: nextDirection
                      });
                    }}
                    className="inline-flex items-center gap-1.5 transition hover:text-text-primary"
                    data-testid="txn-sort-date"
                  >
                    Dates
                    <span className="text-[10px] leading-none">
                      {filters.sortDirection === "desc" ? "\u25BC" : "\u25B2"}
                    </span>
                  </button>
                </th>
                <th scope="col" className="px-3 py-3.5 font-medium lg:px-5">Details</th>
                <th scope="col" className="hidden px-5 py-3.5 font-medium lg:table-cell">Category</th>
                <th scope="col" className="hidden px-5 py-3.5 font-medium lg:table-cell">Account</th>
                <th scope="col" className="hidden px-5 py-3.5 font-medium lg:table-cell">Type</th>
                <th scope="col" className="px-3 py-3.5 font-medium text-right lg:px-5">Amount</th>
                <th scope="col" className="px-3 py-3.5 font-medium text-right lg:px-5">Actions</th>
              </tr>
            </thead>
            <tbody className={TRANSACTION_TABLE_BODY_CLASS}>
              {loading ? (
                <>
                  {[...Array(5)].map((_, i) => (
                    <tr key={`skeleton-${i}`} className={TRANSACTION_TABLE_SKELETON_ROW_CLASS}>
                      <td className="px-5 py-5">
                        <div className={`h-4 w-4 ${TRANSACTION_TABLE_SKELETON_LINE_CLASS}`} />
                      </td>
                      <td className="px-5 py-5">
                        <div className={`h-4 w-20 ${TRANSACTION_TABLE_SKELETON_LINE_CLASS}`} />
                      </td>
                      <td className="px-5 py-5">
                        <div className="space-y-2">
                          <div className={`h-4 w-32 ${TRANSACTION_TABLE_SKELETON_LINE_CLASS}`} />
                          <div className={`h-3 w-48 ${TRANSACTION_TABLE_SKELETON_LINE_CLASS}`} />
                        </div>
                      </td>
                      <td className="px-5 py-5">
                        <div className={`h-6 w-20 ${TRANSACTION_TABLE_SKELETON_PILL_CLASS}`} />
                      </td>
                      <td className="px-5 py-5">
                        <div className="space-y-1">
                          <div className={`h-4 w-24 ${TRANSACTION_TABLE_SKELETON_LINE_CLASS}`} />
                          <div className={`h-3 w-16 ${TRANSACTION_TABLE_SKELETON_LINE_CLASS}`} />
                        </div>
                      </td>
                      <td className="px-5 py-5">
                        <div className="space-y-1">
                          <div className={`h-4 w-16 ${TRANSACTION_TABLE_SKELETON_LINE_CLASS}`} />
                          <div className={`h-3 w-12 ${TRANSACTION_TABLE_SKELETON_LINE_CLASS}`} />
                        </div>
                      </td>
                      <td className="px-5 py-5 text-right">
                        <div className={`h-4 w-20 ${TRANSACTION_TABLE_SKELETON_LINE_CLASS}`} />
                      </td>
                      <td className="px-5 py-5 text-right">
                        <div className="flex justify-end gap-2">
                          <div className={`h-8 w-14 ${TRANSACTION_TABLE_SKELETON_PILL_CLASS}`} />
                          <div className={`h-8 w-16 ${TRANSACTION_TABLE_SKELETON_PILL_CLASS}`} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </>
              ) : null}
              {!loading
                ? ledgerTransactions.map((txn) => {
                const isEditing = form.id === txn.id;
                const isSelected = selectedTransactionIds.has(txn.id);
                return (
                  <Fragment key={txn.id}>
                    <tr className={TRANSACTION_ROW_CLASS}>
                      <td className="px-3 py-4 align-top md:px-5 md:py-5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRowSelection(txn.id)}
                          data-testid={`txn-select-row-${txn.id}`}
                          aria-label={`Select transaction ${txn.merchant_raw}`}
                          disabled={selectionInputDisabled || isEditing}
                          className={`mt-1 ${TRANSACTION_SELECTION_CHECKBOX_CLASS}`}
                        />
                      </td>
                      <td className={TRANSACTION_ROW_SECONDARY_CELL_CLASS}>
                        <div className={TRANSACTION_ROW_PRIMARY_TEXT_CLASS}>{txn.transaction_date}</div>
                      </td>

                      <td className="px-3 py-4 md:px-5 md:py-5">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-start justify-between gap-2 lg:block">
                            <div className={TRANSACTION_ROW_PRIMARY_TEXT_CLASS}>{txn.merchant_raw}</div>
                            <div className={`${TRANSACTION_ROW_MUTED_TEXT_CLASS} lg:hidden`}>{txn.transaction_date}</div>
                          </div>
                          <div className={TRANSACTION_ROW_DESCRIPTION_CLASS}>{txn.description}</div>
                          <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-text-muted lg:hidden">
                            <span className={TRANSACTION_ROW_METADATA_CHIP_CLASS}>
                              {formatCategoryBadgeLabel(txn, filters.categoryView)}
                            </span>
                            <span className={TRANSACTION_ROW_METADATA_CHIP_CLASS}>
                              {txn.account_key || "Manual Account"}
                            </span>
                            <span className={TRANSACTION_ROW_METADATA_CHIP_CLASS}>
                              {formatTransactionTypeLabel(txn.transaction_type)} · {txn.direction}
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-text-muted">
                            {txn.memo ? (
                              <span className={TRANSACTION_ROW_METADATA_CHIP_CLASS}>
                                Note: {txn.memo}
                              </span>
                            ) : null}
                            {Array.isArray(txn.tags) && txn.tags.length ? (
                              <span className={TRANSACTION_ROW_METADATA_CHIP_CLASS}>
                                #{txn.tags.join(" #")}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </td>

                      <td className="hidden px-5 py-5 lg:table-cell">
                        <div className={TRANSACTION_ROW_CATEGORY_BADGE_CLASS}>
                          <span>
                            {formatCategoryBadgeLabel(txn, filters.categoryView)}
                          </span>
                        </div>
                      </td>

                      <td className={TRANSACTION_ROW_SECONDARY_CELL_CLASS}>
                        <div className={TRANSACTION_ROW_PRIMARY_TEXT_CLASS}>{txn.account_key || "Manual Account"}</div>
                        <div className={`mt-1 ${TRANSACTION_ROW_MUTED_TEXT_CLASS}`}>{txn.account_id || "No linked account id"}</div>
                      </td>

                      <td className={TRANSACTION_ROW_SECONDARY_CELL_CLASS}>
                        <div className={TRANSACTION_ROW_PRIMARY_TEXT_CLASS}>{formatTransactionTypeLabel(txn.transaction_type)}</div>
                        <div className={`mt-1 ${TRANSACTION_ROW_MUTED_TEXT_CLASS}`}>{txn.direction}</div>
                      </td>

                      <td className="px-3 py-4 text-right font-medium md:px-5 md:py-5">
                        <span className={txn.direction === "inflow" ? TRANSACTION_AMOUNT_INFLOW_CLASS : "text-danger"}>
                          {txn.direction === "inflow" ? "+" : "-"}
                          {money(Math.abs(txn.amount))}
                        </span>
                        {txn.recurring_rule_id && (
                          <span
                            className={TRANSACTION_RECURRING_BADGE_CLASS}
                            title="Linked to recurring rule"
                            data-testid={`tx-recurring-badge-${txn.id}`}
                          >
                            ↻
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-4 text-right md:px-5 md:py-5">
                        <div className="flex flex-col items-stretch gap-2 sm:inline-flex sm:flex-row sm:flex-wrap sm:justify-end">
                          <button
                            type="button"
                            onClick={() => startEdit(txn)}
                            data-testid={`txn-edit-${txn.id}`}
                            aria-label={`Edit transaction ${txn.merchant_raw}`}
                            className={TRANSACTION_ROW_ACTION_BUTTON_CLASS}
                          >
                            Edit
                          </button>
                          {deleteConfirmId === txn.id ? (
                          <div className="flex flex-col gap-1 sm:flex-row">
                            <button
                              type="button"
                              onClick={() => void removeTransaction(txn.id)}
                              disabled={saving}
                              className={ROW_DANGER_CONFIRM_BUTTON_CLASS}
                              data-testid={`txn-delete-confirm-${txn.id}`}
                            >
                              Confirm?
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(null)}
                              disabled={saving}
                              className={TRANSACTION_ROW_CANCEL_BUTTON_CLASS}
                              data-testid={`txn-delete-cancel-${txn.id}`}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(txn.id)}
                            disabled={saving || isEditing}
                            className={TRANSACTION_ROW_ACTION_BUTTON_CLASS}
                            data-testid={`txn-delete-${txn.id}`}
                            aria-label={`Delete transaction ${txn.merchant_raw}`}
                          >
                            Delete
                          </button>
                        )}
                        </div>
                      </td>
                    </tr>

                    {isEditing ? (
                      <tr data-testid={`txn-inline-edit-row-${txn.id}`}>
                        <td colSpan={8} className={TRANSACTION_INLINE_EDITOR_CELL_CLASS}>
                          <form onSubmit={submitForm} className="grid gap-4" data-testid={`txn-inline-form-${txn.id}`}>
                            <input type="hidden" value={form.id} readOnly />
                            <TransactionEditorFields
                              accountOptions={transactionAccountOptions}
                              categories={categories}
                              errors={formErrors}
                              form={form}
                              idPrefix={`txn-inline-${txn.id}`}
                              onFieldBlur={handleTransactionFieldBlur}
                              onFieldChange={setFormField}
                            />

                            <div className="flex flex-wrap justify-end gap-2">
                              <button
                                type="submit"
                                disabled={saving}
                                className={TRANSACTION_PRIMARY_ACTION_BUTTON_CLASS}
                              >
                                {saving ? "Updating..." : "Update"}
                              </button>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                data-testid={`txn-inline-cancel-${txn.id}`}
                                className={TRANSACTION_SECONDARY_ACTION_BUTTON_CLASS}
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })
                : null}

              {!loading && ledgerTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center">
                    <div className={TRANSACTION_EMPTY_TITLE_CLASS}>No transactions found</div>
                    <div className={TRANSACTION_EMPTY_COPY_CLASS}>
                      Try adjusting your filters or add a new transaction
                    </div>
                    {activeFilterCount > 0 ? (
                      <button
                        type="button"
                        onClick={() => {
                          void clearAllFiltersAndApply();
                        }}
                        className={TRANSACTION_EMPTY_ACTION_CLASS}
                      >
                        Clear filters
                      </button>
                    ) : null}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className={TRANSACTION_PAGINATION_BAR_CLASS}>
          <p className={TRANSACTION_PAGINATION_SUMMARY_CLASS} data-testid="txn-pagination-summary">
            {totalTransactions === 0
              ? "Showing 0 of 0 transactions"
              : `Showing ${pageStart}-${pageEnd} of ${totalTransactions} transactions`}
          </p>
          <div className="inline-flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigateToPage(currentPage - 1)}
              disabled={currentPage <= 1 || loading || saving}
              data-testid="txn-page-prev"
              className={TRANSACTION_PAGINATION_BUTTON_CLASS}
            >
              Previous
            </button>
            <span className={TRANSACTION_PAGINATION_INDICATOR_CLASS} data-testid="txn-page-indicator">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => navigateToPage(currentPage + 1)}
              disabled={currentPage >= totalPages || loading || saving}
              data-testid="txn-page-next"
              className={TRANSACTION_PAGINATION_BUTTON_CLASS}
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {isCreateDialogOpen ? (
        <div className={TRANSACTION_DIALOG_BACKDROP_CLASS}>
          <section
            ref={createDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="txn-create-dialog-title"
            data-testid="txn-create-dialog"
            tabIndex={-1}
            className={`${TRANSACTION_DIALOG_PANEL_CLASS} max-w-4xl`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-medium uppercase tracking-[0.24em] text-accent">New transaction</div>
                <h3 id="txn-create-dialog-title" className="mt-2 text-2xl font-semibold text-text-primary">
                  Add a manual transaction
                </h3>
                <p className="mt-2 text-sm text-text-secondary">
                  Create a new row from the top of the ledger, with an optional person emoji for faster scanning.
                </p>
              </div>

              <button
                type="button"
                onClick={closeCreateDialog}
                aria-label="Close new transaction dialog"
                className={TRANSACTION_DIALOG_CLOSE_BUTTON_CLASS}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={submitForm} className="mt-6 grid gap-4" data-testid="txn-form">
              <TransactionEditorFields
                accountOptions={transactionAccountOptions}
                categories={categories}
                errors={formErrors}
                form={form}
                idPrefix="txn-create"
                onFieldBlur={handleTransactionFieldBlur}
                onFieldChange={setFormField}
              />

              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={closeCreateDialog}
                  className={TRANSACTION_SECONDARY_ACTION_BUTTON_CLASS}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className={TRANSACTION_PRIMARY_ACTION_BUTTON_CLASS}
                >
                  {saving ? "Saving..." : "Save transaction"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {isBulkDeleteDialogOpen ? (
        <div className={TRANSACTION_DIALOG_BACKDROP_CLASS}>
          <section
            ref={bulkDeleteDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="txn-bulk-delete-dialog-title"
            data-testid="txn-bulk-delete-dialog"
            tabIndex={-1}
            className={`${TRANSACTION_DIALOG_PANEL_CLASS} max-w-lg`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-medium uppercase tracking-[0.24em] text-danger">Bulk delete</div>
                <h3 id="txn-bulk-delete-dialog-title" className="mt-2 text-2xl font-semibold text-text-primary">
                  Delete {formatTransactionCountLabel(selectedVisibleCount)}
                </h3>
                <p className="mt-2 text-sm text-text-secondary">
                  This removes only the transactions currently selected on this visible page. Selection clears after delete.
                </p>
              </div>

              <button
                type="button"
                onClick={closeBulkDeleteDialog}
                aria-label="Close bulk delete dialog"
                className={TRANSACTION_DIALOG_CLOSE_BUTTON_CLASS}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={closeBulkDeleteDialog}
                data-testid="txn-bulk-delete-cancel"
                className={TRANSACTION_SECONDARY_ACTION_BUTTON_CLASS}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void removeSelectedTransactions()}
                data-testid="txn-bulk-delete-confirm"
                disabled={bulkDeleting}
                className={BULK_DANGER_CONFIRM_BUTTON_CLASS}
              >
                {bulkDeleting ? "Deleting..." : "Delete selected"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
