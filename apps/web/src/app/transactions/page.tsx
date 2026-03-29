"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, SlidersHorizontal, X } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { RANGE_OPTIONS } from "@/lib/constants";
import { money } from "@/lib/utils";
import { useApi } from "@/hooks/useApi";
import type { Account, Category, Transaction, TransactionsResponse } from "@/lib/api/types";
import {
  buildTransactionAccountOptions,
  buildTransactionFilterAccountOptions,
  buildDraftFromTransaction,
  createInitialTransactionDraft,
  parseTagListInput,
  reconcileDraftAccountName,
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
import { TransactionsAdvancedFilters } from "./TransactionsAdvancedFilters";
import { TransactionsCommandBar } from "./TransactionsCommandBar";

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
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [message, setMessage] = useState("");

  const ledgerTransactions = useMemo(() => sortTransactionsForLedger(transactions), [transactions]);
  const amountBounds = useMemo(
    () => getLedgerAmountBounds(transactionsMeta, ledgerTransactions),
    [ledgerTransactions, transactionsMeta]
  );
  const amountBoundMin = Math.floor(amountBounds.min);
  const amountBoundMax = Math.max(amountBoundMin, Math.ceil(amountBounds.max));
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
  const selectedTransactionLabel = formatTransactionCountLabel(selectedVisibleCount);

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

  async function loadTransactions(
    nextFilters: TransactionsFilterState,
    options: { preserveMessage?: boolean } = {}
  ) {
    setLoading(true);
    if (!options.preserveMessage) {
      setMessage("");
    }

    try {
      const transactionData = await api.transactions.list(toTransactionsListApiParams(nextFilters));
      setTransactions(transactionData.items);
      setTransactionsMeta(transactionData.meta);
      setTotalTransactions(transactionData.total);
      return transactionData;
    } catch (error) {
      setMessage(getRequestErrorMessage(error, "Failed to load transactions."));
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function refreshTransactionsView(
    nextFilters: TransactionsFilterState,
    options: { preserveMessage?: boolean } = { preserveMessage: true }
  ) {
    const [, , transactionData] = await Promise.all([
      loadCategories(),
      loadAccounts(),
      loadTransactions(nextFilters, options)
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
      const nextSearchParams = buildTransactionsFilterSearchParams(merged);
      router.replace(nextSearchParams.toString() ? `/transactions?${nextSearchParams.toString()}` : "/transactions");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (lastAppliedQueryRef.current !== searchParamKey) {
      setFilters(parsedFilters);
      filtersRef.current = parsedFilters;
    }
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

  function commitFilters(nextFilters: TransactionsFilterState) {
    updateFilters(nextFilters);
    syncFiltersToUrl(nextFilters);

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

  function commitValidatedFilters(
    nextFilters: TransactionsFilterState,
    options: { closeAdvancedFilters?: boolean } = {}
  ) {
    const validationMessage = getFilterValidationMessage(nextFilters);
    if (validationMessage) {
      setMessage(validationMessage);
      return false;
    }

    if (options.closeAdvancedFilters) {
      setShowAdvancedFilters(false);
    }
    commitFiltersWithSelectionReset(nextFilters);
    return true;
  }

  function applyFilters() {
    return commitValidatedFilters(toValidFilterState({
      ...filtersRef.current,
      page: 1
    }));
  }

  function applyAdvancedFilters() {
    return commitValidatedFilters(toValidFilterState({
      ...filtersRef.current,
      page: 1
    }), { closeAdvancedFilters: true });
  }

  function updateFilterDraft(updates: Partial<TransactionsFilterState>) {
    updateFilters((previous) => ({
      ...previous,
      ...updates
    }));
  }

  function resetFilterDraft() {
    updateFilters(createDefaultTransactionsFilterState());
    setMessage("");
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
      setMessage("Finish the inline edit before creating a new transaction.");
      return;
    }
    clearSelectedTransactions();
    resetManualForm();
    setMessage("");
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

      setMessage(`Exported ${allTransactions.length} transactions.`);
    } catch (error) {
      setMessage(getRequestErrorMessage(error, "Failed to export transactions."));
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
    setMessage("");
  }

  function cancelEdit() {
    resetManualForm();
    setMessage("Edit canceled.");
  }

  async function removeTransaction(transactionId: string) {
    try {
      clearSelectedTransactions();
      await api.transactions.remove(transactionId);
      setMessage("Transaction deleted.");
      await loadTransactions(filtersRef.current, { preserveMessage: true });
    } catch (error) {
      setMessage(getRequestErrorMessage(error, "Failed to delete transaction."));
    }
  }

  async function removeSelectedTransactions() {
    const selectedIds = Array.from(selectedTransactionIds);
    const deletedCount = selectedIds.length;

    if (!deletedCount) {
      return;
    }

    setBulkDeleting(true);
    setMessage("");

    try {
      await api.transactions.bulkUpdate({
        transaction_ids: selectedIds,
        operation: "delete"
      });
      clearSelectedTransactions();
      await refreshTransactionsView(filtersRef.current, { preserveMessage: true });
      setMessage(`${formatTransactionCountLabel(deletedCount)} deleted.`);
    } catch (error) {
      setMessage(getRequestErrorMessage(error, "Failed to delete selected transactions."));
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
      setMessage(`${formatTransactionCountLabel(selectedVisibleCount)} updated.`);
      setBulkCategoryOpen(false);
      setBulkCategoryValue("");
      setSelectedTransactionIds(new Set());
      await refreshTransactionsView(filtersRef.current, { preserveMessage: true });
    } catch (error) {
      setMessage(getRequestErrorMessage(error, "Failed to update categories."));
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
      setMessage(`${formatTransactionCountLabel(selectedVisibleCount)} tagged.`);
      setBulkTagsOpen(false);
      setBulkTagsValue("");
      setSelectedTransactionIds(new Set());
      await refreshTransactionsView(filtersRef.current, { preserveMessage: true });
    } catch (error) {
      setMessage(getRequestErrorMessage(error, "Failed to update tags."));
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
      setMessage(`${formatTransactionCountLabel(selectedVisibleCount)} marked as ${status === "reviewed" ? "reviewed" : "needing review"}.`);
      setBulkReviewOpen(false);
      setSelectedTransactionIds(new Set());
      await refreshTransactionsView(filtersRef.current, { preserveMessage: true });
    } catch (error) {
      setMessage(getRequestErrorMessage(error, "Failed to update review status."));
    } finally {
      setBulkApplying(false);
    }
  }

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const validation = validateTransactionDraft(form, categories);
    if (!validation.payload) {
      setFormErrors(validation.errors);
      setMessage("Fix form errors before saving.");
      return;
    }

    setSaving(true);
    setFormErrors({});

    try {
      if (form.id) {
        clearSelectedTransactions();
        await api.transactions.update(form.id, validation.payload);
        setMessage("Transaction updated.");
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

        setMessage(buildCreateResultMessage(created.transaction.id, transactionData?.items || []));
      }
    } catch (error) {
      setMessage(getRequestErrorMessage(error, "Failed to save transaction."));
    } finally {
      setSaving(false);
    }
  }

  const activeFilterChips = useMemo(() => {
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
  }, [accountFilterOptions, parsedFilters]);

  return (
    <div className="space-y-6" data-testid="transactions-page">
      <header
        data-testid="txn-workspace-header"
        className="rounded-[28px] border border-neutral-900 bg-[linear-gradient(135deg,rgba(12,16,18,0.95),rgba(7,11,13,0.82))] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.35)]"
      >
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-emerald-300">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Ledger filters
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-3xl font-semibold tracking-tight text-neutral-50">Transactions</h2>
                <span className="inline-flex items-center rounded-full border border-neutral-800 bg-neutral-950/70 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-400">
                  {activeFilterCount} active
                </span>
              </div>
              <p className="max-w-3xl text-sm leading-6 text-neutral-400">
                Review the ledger, filter it like a sheet, and create new manual transactions from the top of the page.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <div className="rounded-[24px] border border-neutral-800 bg-neutral-950/80 px-4 py-3 text-sm text-neutral-300">
              {totalTransactions === 0
                ? "No rows in the current view"
                : `Showing ${pageStart}-${pageEnd} of ${totalTransactions} rows`}
            </div>
            <button
              type="button"
              onClick={openCreateDialog}
              data-testid="txn-create-open"
              className="rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={saving}
            >
              New transaction
            </button>
            <button
              type="button"
              onClick={() => void exportTransactionsToCsv()}
              disabled={isExporting || totalTransactions === 0}
              data-testid="txn-export-csv"
              className="inline-flex items-center gap-2 rounded-2xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              {isExporting ? "Exporting..." : "Export CSV"}
            </button>
          </div>
        </div>
      </header>

      {showAdvancedFilters ? (
        <TransactionsAdvancedFilters
          filters={filters}
          categoryOptions={categoryMultiSelectOptions}
          accountOptions={accountFilterOptions}
          amountBoundMin={amountBoundMin}
          amountBoundMax={amountBoundMax}
          onChange={updateFilterDraft}
          onApply={applyAdvancedFilters}
          onClose={() => setShowAdvancedFilters(false)}
          onReset={resetFilterDraft}
        />
      ) : null}

      <TransactionsCommandBar
        filters={filters}
        activeFilterCount={activeFilterCount}
        onChange={updateFilterDraft}
        onApply={applyFilters}
        onOpenAdvancedFilters={() => setShowAdvancedFilters(true)}
      />

      <div className="flex flex-wrap items-center gap-2" data-testid="txn-active-filters">
        {activeFilterChips.length ? (
          activeFilterChips.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={filter.clear}
              className="inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-200 transition hover:bg-neutral-900"
            >
              {filter.label}
              <X className="h-3.5 w-3.5 text-neutral-500" />
            </button>
          ))
        ) : (
          <div className="rounded-full border border-neutral-900 bg-neutral-950/80 px-3 py-1.5 text-sm text-neutral-500">
            All transactions in view
          </div>
        )}
      </div>

      {message ? (
        <p className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-300" data-testid="global-message">
          {message}
        </p>
      ) : null}

      <section
        data-testid="txn-ledger-shell"
        className="overflow-hidden rounded-[30px] border border-neutral-900 bg-neutral-950/80 shadow-[0_20px_80px_rgba(0,0,0,0.25)]"
      >
        {hasVisibleSelection ? (
          <div
            data-testid="txn-bulk-bar"
            className="relative flex flex-wrap items-center justify-between gap-3 border-b border-neutral-900 bg-neutral-900/60 px-5 py-3.5"
          >
            <div className="text-sm text-neutral-200">
              <span className="font-semibold text-neutral-50">{selectedVisibleCount}</span> selected on this page
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={clearSelectedTransactions}
                data-testid="txn-bulk-clear"
                className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 transition hover:bg-neutral-800"
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
                  className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 transition hover:bg-neutral-800 disabled:opacity-60"
                  data-testid="txn-bulk-category-btn"
                >
                  Category
                </button>
                {bulkCategoryOpen && (
                  <div data-bulk-dropdown className="absolute top-full left-0 mt-1 z-10 w-56 rounded-lg border border-neutral-800 bg-neutral-950 p-3 shadow-xl">
                    <select
                      value={bulkCategoryValue}
                      onChange={(e) => setBulkCategoryValue(e.target.value)}
                      className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200"
                      data-testid="txn-bulk-category-select"
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
                      className="mt-2 w-full rounded-md border border-emerald-600/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300 disabled:opacity-60"
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
                  className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 transition hover:bg-neutral-800 disabled:opacity-60"
                  data-testid="txn-bulk-tags-btn"
                >
                  Tags
                </button>
                {bulkTagsOpen && (
                  <div data-bulk-dropdown className="absolute top-full left-0 mt-1 z-10 w-64 rounded-lg border border-neutral-800 bg-neutral-950 p-3 shadow-xl">
                    <input
                      type="text"
                      value={bulkTagsValue}
                      onChange={(e) => setBulkTagsValue(e.target.value)}
                      placeholder="Enter tags (comma-separated)"
                      className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200"
                      data-testid="txn-bulk-tags-input"
                    />
                    <p className="mt-1 text-xs text-neutral-500">e.g. &quot;monthly, recurring&quot;</p>
                    {bulkTagsError ? (
                      <p className="mt-1 text-xs text-rose-300" data-testid="txn-bulk-tags-error">{bulkTagsError}</p>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void applyBulkTags()}
                      disabled={!bulkTagsValue.trim() || bulkApplying}
                      className="mt-2 w-full rounded-md border border-emerald-600/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300 disabled:opacity-60"
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
                  className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 transition hover:bg-neutral-800 disabled:opacity-60"
                  data-testid="txn-bulk-review-btn"
                >
                  Review
                </button>
                {bulkReviewOpen && (
                  <div data-bulk-dropdown className="absolute top-full left-0 mt-1 z-10 w-48 rounded-lg border border-neutral-800 bg-neutral-950 p-2 shadow-xl">
                    <button
                      type="button"
                      onClick={() => void applyBulkReview("reviewed")}
                      disabled={bulkApplying}
                      className="block w-full rounded-md px-3 py-2 text-left text-sm text-neutral-200 hover:bg-neutral-800"
                      data-testid="txn-bulk-review-mark-reviewed"
                    >
                      Mark as reviewed
                    </button>
                    <button
                      type="button"
                      onClick={() => void applyBulkReview("needs_review")}
                      disabled={bulkApplying}
                      className="block w-full rounded-md px-3 py-2 text-left text-sm text-neutral-200 hover:bg-neutral-800"
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
                className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-100 transition hover:bg-rose-500/20"
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
          className="overflow-x-auto focus:outline-none focus:ring-2 focus:ring-emerald-400/70 focus:ring-offset-2 focus:ring-offset-neutral-950"
        >
          <table className="min-w-[1160px] w-full text-left text-sm text-neutral-200" data-testid="txn-table">
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
            <thead className="bg-neutral-900/60 text-neutral-300">
              <tr>
                <th scope="col" className="px-5 py-3.5 font-medium">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={(event) => toggleVisibleSelection(event.target.checked)}
                    data-testid="txn-select-all-visible"
                    aria-label="Select all visible transactions"
                    disabled={selectionInputDisabled || !hasVisibleTransactions}
                    className="h-4 w-4 rounded border-neutral-700 bg-neutral-900 text-emerald-400 focus:ring-emerald-400"
                  />
                </th>
                <th scope="col" className="px-5 py-3.5 font-medium">Dates</th>
                <th scope="col" className="px-5 py-3.5 font-medium">Details</th>
                <th scope="col" className="px-5 py-3.5 font-medium">Category</th>
                <th scope="col" className="px-5 py-3.5 font-medium">Account</th>
                <th scope="col" className="px-5 py-3.5 font-medium">Type</th>
                <th scope="col" className="px-5 py-3.5 font-medium text-right">Amount</th>
                <th scope="col" className="px-5 py-3.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900/80">
              {ledgerTransactions.map((txn) => {
                const isEditing = form.id === txn.id;
                const isSelected = selectedTransactionIds.has(txn.id);
                return (
                  <Fragment key={txn.id}>
                    <tr className="align-top transition hover:bg-neutral-900/30">
                      <td className="px-5 py-5 align-top">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRowSelection(txn.id)}
                          data-testid={`txn-select-row-${txn.id}`}
                          aria-label={`Select transaction ${txn.merchant_raw}`}
                          disabled={selectionInputDisabled || isEditing}
                          className="mt-1 h-4 w-4 rounded border-neutral-700 bg-neutral-900 text-emerald-400 focus:ring-emerald-400"
                        />
                      </td>
                      <td className="px-5 py-5 text-neutral-300">
                        <div className="font-medium text-neutral-100">{txn.transaction_date}</div>
                      </td>

                      <td className="px-5 py-5">
                        <div className="min-w-0">
                          <div className="font-medium text-neutral-100">{txn.merchant_raw}</div>
                          <div className="mt-1 text-sm text-neutral-400">{txn.description}</div>
                          <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-neutral-500">
                            {txn.memo ? (
                              <span className="rounded-full border border-neutral-800 px-2 py-1">
                                Note: {txn.memo}
                              </span>
                            ) : null}
                            {Array.isArray(txn.tags) && txn.tags.length ? (
                              <span className="rounded-full border border-neutral-800 px-2 py-1">
                                #{txn.tags.join(" #")}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-5">
                        <div className="inline-flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900/90 px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] text-neutral-200">
                          <span>
                            {(filters.categoryView === "coarse"
                              ? `${txn.category_coarse_emoji || ""} ${txn.category_coarse || txn.category_final}`
                              : `${txn.category_emoji || ""} ${txn.category_final}`).trim()}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-5 text-neutral-300">
                        <div className="font-medium text-neutral-100">{txn.account_key || "Manual Account"}</div>
                        <div className="mt-1 text-xs text-neutral-500">{txn.account_id || "No linked account id"}</div>
                      </td>

                      <td className="px-5 py-5 text-neutral-300">
                        <div className="font-medium text-neutral-100">{formatTransactionTypeLabel(txn.transaction_type)}</div>
                        <div className="mt-1 text-xs text-neutral-500">{txn.direction}</div>
                      </td>

                      <td className="px-5 py-5 text-right font-medium">
                        <span className={txn.direction === "inflow" ? "text-emerald-400" : "text-neutral-100"}>
                          {txn.direction === "inflow" ? "+" : "-"}
                          {money(Math.abs(txn.amount))}
                        </span>
                        {txn.recurring_rule_id && (
                          <span
                            className="ml-2 inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-300"
                            title="Linked to recurring rule"
                            data-testid={`tx-recurring-badge-${txn.id}`}
                          >
                            ↻
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-5 text-right">
                        <div className="inline-flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(txn)}
                            data-testid={`txn-edit-${txn.id}`}
                            aria-label={`Edit transaction ${txn.merchant_raw}`}
                            className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs font-medium text-neutral-200 transition hover:bg-neutral-800 disabled:opacity-60"
                          >
                            Edit
                          </button>
                          {deleteConfirmId === txn.id ? (
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => void removeTransaction(txn.id)}
                              disabled={saving}
                              className="rounded-lg border border-rose-600 bg-rose-950/60 px-2 py-1 text-xs text-rose-200 transition hover:bg-rose-900/40 disabled:opacity-60"
                              data-testid={`txn-delete-confirm-${txn.id}`}
                            >
                              Confirm?
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(null)}
                              disabled={saving}
                              className="rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-neutral-300 transition hover:bg-neutral-800 disabled:opacity-60"
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
                            className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs font-medium text-neutral-200 transition hover:bg-neutral-800 disabled:opacity-60"
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
                        <td colSpan={8} className="bg-neutral-950/70 px-5 py-5">
                          <form onSubmit={submitForm} className="grid gap-4" data-testid={`txn-inline-form-${txn.id}`}>
                            <input type="hidden" value={form.id} readOnly />
                            <TransactionEditorFields
                              accountOptions={transactionAccountOptions}
                              categories={categories}
                              errors={formErrors}
                              form={form}
                              idPrefix={`txn-inline-${txn.id}`}
                              onFieldChange={setFormField}
                            />

                            <div className="flex flex-wrap justify-end gap-2">
                              <button
                                type="submit"
                                disabled={saving}
                                className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
                              >
                                {saving ? "Updating..." : "Update"}
                              </button>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                data-testid={`txn-inline-cancel-${txn.id}`}
                                className="rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm text-neutral-200 transition hover:bg-neutral-800"
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
              })}

              {!loading && ledgerTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-sm text-neutral-400">
                    No transactions found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-900 bg-neutral-900/40 px-5 py-3.5">
          <p className="text-xs text-neutral-400" data-testid="txn-pagination-summary">
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
              className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-neutral-200 transition hover:bg-neutral-800 disabled:opacity-60"
            >
              Previous
            </button>
            <span className="text-xs text-neutral-300" data-testid="txn-page-indicator">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => navigateToPage(currentPage + 1)}
              disabled={currentPage >= totalPages || loading || saving}
              data-testid="txn-page-next"
              className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-neutral-200 transition hover:bg-neutral-800 disabled:opacity-60"
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {isCreateDialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-neutral-950/80 px-4 py-10 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="txn-create-dialog-title"
            data-testid="txn-create-dialog"
            className="w-full max-w-4xl rounded-[28px] border border-neutral-800 bg-neutral-950 p-5 shadow-[0_30px_120px_rgba(0,0,0,0.45)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-medium uppercase tracking-[0.24em] text-emerald-300">New transaction</div>
                <h3 id="txn-create-dialog-title" className="mt-2 text-2xl font-semibold text-neutral-50">
                  Add a manual transaction
                </h3>
                <p className="mt-2 text-sm text-neutral-400">
                  Create a new row from the top of the ledger, with an optional person emoji for faster scanning.
                </p>
              </div>

              <button
                type="button"
                onClick={closeCreateDialog}
                aria-label="Close new transaction dialog"
                className="rounded-full border border-neutral-800 bg-neutral-900 p-2 text-neutral-300 transition hover:bg-neutral-800"
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
                onFieldChange={setFormField}
              />

              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={closeCreateDialog}
                  className="rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm text-neutral-200 transition hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {saving ? "Saving..." : "Save transaction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isBulkDeleteDialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-neutral-950/80 px-4 py-10 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="txn-bulk-delete-dialog-title"
            data-testid="txn-bulk-delete-dialog"
            className="w-full max-w-lg rounded-[28px] border border-neutral-800 bg-neutral-950 p-5 shadow-[0_30px_120px_rgba(0,0,0,0.45)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-medium uppercase tracking-[0.24em] text-rose-300">Bulk delete</div>
                <h3 id="txn-bulk-delete-dialog-title" className="mt-2 text-2xl font-semibold text-neutral-50">
                  Delete {selectedTransactionLabel}
                </h3>
                <p className="mt-2 text-sm text-neutral-400">
                  This removes only the transactions currently selected on this visible page. Selection clears after delete.
                </p>
              </div>

              <button
                type="button"
                onClick={closeBulkDeleteDialog}
                aria-label="Close bulk delete dialog"
                className="rounded-full border border-neutral-800 bg-neutral-900 p-2 text-neutral-300 transition hover:bg-neutral-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={closeBulkDeleteDialog}
                data-testid="txn-bulk-delete-cancel"
                className="rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm text-neutral-200 transition hover:bg-neutral-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void removeSelectedTransactions()}
                data-testid="txn-bulk-delete-confirm"
                disabled={bulkDeleting}
                className="rounded-xl border border-rose-500/40 bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {bulkDeleting ? "Deleting..." : "Delete selected"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
