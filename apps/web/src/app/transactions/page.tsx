"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { RANGE_OPTIONS } from "@/lib/constants";
import { money } from "@/lib/utils";
import { useApi } from "@/hooks/useApi";
import type { Account, Category, Transaction, TransactionsResponse } from "@/lib/api/types";
import {
  buildDraftFromTransaction,
  createInitialTransactionDraft,
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
  type TransactionsFilterState
} from "./filters";
import {
  buildCreateResultMessage,
  getLedgerAmountBounds,
  sortTransactionsForLedger
} from "./ledger";
import { TransactionEditorFields } from "./TransactionEditorFields";

const TRANSACTION_RANGE_OPTIONS = [...RANGE_OPTIONS, { value: "custom", label: "Custom" }];
const FILTER_CONTROL_CLASS =
  "rounded-2xl border border-neutral-800 bg-neutral-950/80 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";
const FILTER_SELECT_CLASS =
  "mt-2 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none transition focus:border-emerald-500";
const FILTER_INPUT_CLASS =
  "w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-400 outline-none transition focus:border-emerald-500";

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

function calculateActiveFilterCount(filters: TransactionsFilterState) {
  const defaults = createDefaultTransactionsFilterState();
  return [
    filters.query !== defaults.query,
    filters.category !== defaults.category,
    filters.account !== defaults.account,
    filters.minAmount !== defaults.minAmount,
    filters.maxAmount !== defaults.maxAmount,
    filters.range !== defaults.range,
    filters.start !== defaults.start,
    filters.end !== defaults.end,
    filters.categoryView !== defaults.categoryView,
    filters.transactionType !== defaults.transactionType,
    filters.tag !== defaults.tag
  ].filter(Boolean).length;
}

function formatAmountControlValue(value: string, fallback: number) {
  if (!value) {
    return fallback;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function buildFilterTrackStyle(minBound: number, maxBound: number, lower: number, upper: number) {
  if (maxBound <= minBound) {
    return {
      left: "0%",
      width: "100%"
    };
  }

  const leftPercent = ((lower - minBound) / (maxBound - minBound)) * 100;
  const widthPercent = ((upper - lower) / (maxBound - minBound)) * 100;
  return {
    left: `${Math.max(0, Math.min(100, leftPercent))}%`,
    width: `${Math.max(0, Math.min(100, widthPercent))}%`
  };
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
    [searchParamKey, searchParams]
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
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const ledgerTransactions = useMemo(() => sortTransactionsForLedger(transactions), [transactions]);
  const amountBounds = useMemo(
    () => getLedgerAmountBounds(transactionsMeta, ledgerTransactions),
    [ledgerTransactions, transactionsMeta]
  );
  const amountBoundMin = Math.floor(amountBounds.min);
  const amountBoundMax = Math.max(amountBoundMin, Math.ceil(amountBounds.max));
  const selectedMinAmount = formatAmountControlValue(filters.minAmount, amountBoundMin);
  const selectedMaxAmount = formatAmountControlValue(filters.maxAmount, amountBoundMax);
  const activeFilterCount = useMemo(() => calculateActiveFilterCount(filters), [filters]);

  const categoryFilterOptions = useMemo(() => {
    if (filters.categoryView === "granular") {
      return categories.map((entry) => entry.name);
    }

    return Array.from(
      new Set(ledgerTransactions.map((entry) => entry.category_coarse || "").filter(Boolean))
    );
  }, [categories, filters.categoryView, ledgerTransactions]);

  const accountFilterOptions = useMemo(() => {
    const options = new Map<string, string>();

    for (const account of accounts) {
      if (!account.normalizedKey) {
        continue;
      }
      options.set(account.normalizedKey, account.displayName || account.normalizedKey);
    }

    for (const transaction of ledgerTransactions) {
      const key = String(transaction.account_key || "").trim();
      if (!key || options.has(key)) {
        continue;
      }
      options.set(key, key);
    }

    return Array.from(options.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [accounts, ledgerTransactions]);

  const totalPages = Math.max(1, Math.ceil(totalTransactions / TRANSACTIONS_PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, filters.page), totalPages);
  const pageStart = totalTransactions === 0 ? 0 : ((currentPage - 1) * TRANSACTIONS_PAGE_SIZE) + 1;
  const pageEnd = totalTransactions === 0
    ? 0
    : Math.min(currentPage * TRANSACTIONS_PAGE_SIZE, totalTransactions);

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

  useEffect(() => {
    if (lastAppliedQueryRef.current !== searchParamKey) {
      setFilters(parsedFilters);
      filtersRef.current = parsedFilters;
    }
    void loadTransactions(parsedFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParamKey]);

  useEffect(() => {
    if (filters.category && !categoryFilterOptions.includes(filters.category)) {
      setFilters((previous) => {
        const next = { ...previous, category: "" };
        filtersRef.current = next;
        return next;
      });
    }
  }, [filters.category, categoryFilterOptions]);

  function syncFiltersToUrl(nextFilters: TransactionsFilterState) {
    const nextSearchParams = buildTransactionsFilterSearchParams(nextFilters);
    const queryText = nextSearchParams.toString();
    lastAppliedQueryRef.current = queryText;
    router.replace(queryText ? `/transactions?${queryText}` : "/transactions", { scroll: false });
  }

  function updateFilters(updater: TransactionsFilterState | ((previous: TransactionsFilterState) => TransactionsFilterState)) {
    setFilters((previous) => {
      const next = typeof updater === "function" ? updater(previous) : updater;
      filtersRef.current = next;
      return next;
    });
  }

  function setFormField<K extends keyof TransactionFormDraft>(field: K, value: TransactionFormDraft[K]) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  function commitFilters(nextFilters: TransactionsFilterState) {
    updateFilters(nextFilters);
    syncFiltersToUrl(nextFilters);
  }

  function applyFilters() {
    const nextFilters = toValidFilterState({
      ...filtersRef.current,
      page: 1
    });

    const validationMessage = getFilterValidationMessage(nextFilters);
    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    commitFilters(nextFilters);
  }

  function clearFilters() {
    commitFilters(createDefaultTransactionsFilterState());
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

    commitFilters(nextFilters);
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
    resetManualForm();
    setMessage("");
    setIsCreateDialogOpen(true);
  }

  function closeCreateDialog() {
    setIsCreateDialogOpen(false);
    resetManualForm();
  }

  function startEdit(transaction: Transaction) {
    setIsCreateDialogOpen(false);
    setForm(buildDraftFromTransaction(transaction));
    setFormErrors({});
    setMessage("");
  }

  function cancelEdit() {
    resetManualForm();
    setMessage("Edit canceled.");
  }

  async function removeTransaction(transactionId: string) {
    try {
      await api.transactions.remove(transactionId);
      setMessage("Transaction deleted.");
      await loadTransactions(filtersRef.current, { preserveMessage: true });
    } catch (error) {
      setMessage(getRequestErrorMessage(error, "Failed to delete transaction."));
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
        await api.transactions.update(form.id, validation.payload);
        setMessage("Transaction updated.");
        resetManualForm();
        await refreshTransactionsView(filtersRef.current);
      } else {
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

  const sliderTrackStyle = buildFilterTrackStyle(
    amountBoundMin,
    amountBoundMax,
    Math.min(selectedMinAmount, selectedMaxAmount),
    Math.max(selectedMinAmount, selectedMaxAmount)
  );

  return (
    <div className="space-y-6" data-testid="transactions-page">
      <header className="rounded-[28px] border border-neutral-900 bg-[linear-gradient(135deg,rgba(12,16,18,0.95),rgba(8,12,14,0.75))] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-emerald-300">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Ledger filters
            </div>
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-neutral-50">Transactions</h2>
              <p className="mt-2 max-w-2xl text-sm text-neutral-400">
                Review the ledger, filter it like a sheet, and create new manual transactions from the top of the page.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950/80 px-4 py-3 text-sm text-neutral-300">
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
          </div>
        </div>

        <div className="mt-5 grid gap-3 xl:grid-cols-[minmax(260px,1.35fr)_repeat(4,minmax(150px,0.8fr))]">
          <div className={`${FILTER_CONTROL_CLASS} xl:col-span-2`}>
            <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.22em] text-neutral-500">
              <span>Search</span>
              <span>{activeFilterCount} active</span>
            </div>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
              <input
                id="txn-query-input"
                value={filters.query}
                onChange={(event) => updateFilters((previous) => ({ ...previous, query: event.target.value }))}
                data-testid="txn-query"
                aria-label="Search transactions"
                placeholder="Search merchants, descriptions, or notes"
                className="w-full rounded-xl border border-neutral-800 bg-neutral-900 py-2.5 pl-9 pr-3 text-sm text-neutral-100 placeholder:text-neutral-400 outline-none transition focus:border-emerald-500"
              />
            </div>
          </div>

          <div className={FILTER_CONTROL_CLASS}>
            <div className="text-[11px] font-medium uppercase tracking-[0.22em] text-neutral-500">Category</div>
            <select
              value={filters.category}
              onChange={(event) => updateFilters((previous) => ({ ...previous, category: event.target.value }))}
              data-testid="txn-category-filter"
              aria-label="Filter transactions by category"
              className={FILTER_SELECT_CLASS}
            >
              <option value="">All</option>
              {categoryFilterOptions.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </select>
          </div>

          <div className={FILTER_CONTROL_CLASS}>
            <div className="text-[11px] font-medium uppercase tracking-[0.22em] text-neutral-500">Account</div>
            <select
              value={filters.account}
              onChange={(event) => updateFilters((previous) => ({ ...previous, account: event.target.value }))}
              data-testid="txn-account-filter"
              aria-label="Filter transactions by account"
              className={FILTER_SELECT_CLASS}
            >
              <option value="">All</option>
              {accountFilterOptions.map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {entry.label}
                </option>
              ))}
            </select>
          </div>

          <div className={FILTER_CONTROL_CLASS}>
            <div className="text-[11px] font-medium uppercase tracking-[0.22em] text-neutral-500">Type</div>
            <select
              value={filters.transactionType}
              onChange={(event) =>
                updateFilters((previous) => ({
                  ...previous,
                  transactionType: event.target.value as TransactionsFilterState["transactionType"]
                }))
              }
              data-testid="txn-type-filter"
              aria-label="Filter transactions by type"
              className={FILTER_SELECT_CLASS}
            >
              <option value="all">All</option>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
              <option value="transfer">Transfer</option>
            </select>
          </div>

          <div className={FILTER_CONTROL_CLASS}>
            <div className="text-[11px] font-medium uppercase tracking-[0.22em] text-neutral-500">View</div>
            <select
              value={filters.categoryView}
              onChange={(event) => {
                const nextView = event.target.value === "coarse" ? "coarse" : "granular";
                updateFilters((previous) => ({
                  ...previous,
                  categoryView: nextView,
                  category: previous.categoryView === nextView ? previous.category : ""
                }));
              }}
              data-testid="txn-category-view"
              aria-label="Choose transaction category view"
              className={FILTER_SELECT_CLASS}
            >
              <option value="granular">Granular</option>
              <option value="coarse">Coarse</option>
            </select>
          </div>
        </div>

        <div className="mt-3 grid gap-3 xl:grid-cols-[repeat(3,minmax(160px,0.8fr))_minmax(280px,1.5fr)_auto]">
          <div className={FILTER_CONTROL_CLASS}>
            <div className="text-[11px] font-medium uppercase tracking-[0.22em] text-neutral-500">Range</div>
            <select
              value={filters.range}
              onChange={(event) => updateFilters((previous) => ({ ...previous, range: event.target.value }))}
              data-testid="txn-range"
              aria-label="Filter transactions by date range"
              className={FILTER_SELECT_CLASS}
            >
              {TRANSACTION_RANGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className={FILTER_CONTROL_CLASS}>
            <div className="text-[11px] font-medium uppercase tracking-[0.22em] text-neutral-500">Tag</div>
            <input
              value={filters.tag}
              onChange={(event) => updateFilters((previous) => ({ ...previous, tag: event.target.value }))}
              data-testid="txn-tag-filter"
              aria-label="Filter transactions by tag"
              placeholder="monthly"
              className={`mt-2 ${FILTER_INPUT_CLASS}`}
            />
          </div>

          {filters.range === "custom" ? (
            <>
              <div className={FILTER_CONTROL_CLASS}>
                <div className="text-[11px] font-medium uppercase tracking-[0.22em] text-neutral-500">Start</div>
                <input
                  type="date"
                  value={filters.start}
                  onChange={(event) => updateFilters((previous) => ({ ...previous, start: event.target.value }))}
                  data-testid="txn-start-date"
                  aria-label="Custom start date"
                  className={`mt-2 ${FILTER_INPUT_CLASS}`}
                />
              </div>
              <div className={FILTER_CONTROL_CLASS}>
                <div className="text-[11px] font-medium uppercase tracking-[0.22em] text-neutral-500">End</div>
                <input
                  type="date"
                  value={filters.end}
                  onChange={(event) => updateFilters((previous) => ({ ...previous, end: event.target.value }))}
                  data-testid="txn-end-date"
                  aria-label="Custom end date"
                  className={`mt-2 ${FILTER_INPUT_CLASS}`}
                />
              </div>
            </>
          ) : (
            <>
              <div className={`${FILTER_CONTROL_CLASS} flex items-center text-sm text-neutral-400`}>
                Date preset applies across the ledger and drill-down links.
              </div>
              <div className={`${FILTER_CONTROL_CLASS} flex items-center text-sm text-neutral-400`}>
                Use custom range to target a specific transaction window.
              </div>
            </>
          )}

          <div className={`${FILTER_CONTROL_CLASS} xl:col-span-2`} data-testid="txn-amount-filter">
            <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.22em] text-neutral-500">
              <span>Amount bar</span>
              <span>{money(selectedMinAmount)} to {money(selectedMaxAmount)}</span>
            </div>

            <div className="relative mt-4">
              <div className="h-2 rounded-full bg-neutral-900" />
              <div
                className="pointer-events-none absolute top-0 h-2 rounded-full bg-emerald-400/70"
                style={sliderTrackStyle}
              />
              <input
                type="range"
                min={amountBoundMin}
                max={amountBoundMax}
                value={Math.min(selectedMinAmount, selectedMaxAmount)}
                onChange={(event) => {
                  const nextValue = Number(event.target.value);
                  updateFilters((previous) => {
                    const nextMax = previous.maxAmount ? Number(previous.maxAmount) : amountBoundMax;
                    return {
                      ...previous,
                      minAmount: String(Math.min(nextValue, nextMax))
                    };
                  });
                }}
                data-testid="txn-min-amount-range"
                aria-label="Minimum amount range"
                className="pointer-events-auto absolute inset-x-0 top-[-7px] h-5 w-full cursor-pointer appearance-none bg-transparent accent-emerald-400"
              />
              <input
                type="range"
                min={amountBoundMin}
                max={amountBoundMax}
                value={Math.max(selectedMinAmount, selectedMaxAmount)}
                onChange={(event) => {
                  const nextValue = Number(event.target.value);
                  updateFilters((previous) => {
                    const nextMin = previous.minAmount ? Number(previous.minAmount) : amountBoundMin;
                    return {
                      ...previous,
                      maxAmount: String(Math.max(nextValue, nextMin))
                    };
                  });
                }}
                data-testid="txn-max-amount-range"
                aria-label="Maximum amount range"
                className="pointer-events-auto absolute inset-x-0 top-[-7px] h-5 w-full cursor-pointer appearance-none bg-transparent accent-emerald-200"
              />
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <input
                value={filters.minAmount}
                onChange={(event) => updateFilters((previous) => ({ ...previous, minAmount: event.target.value }))}
                inputMode="decimal"
                aria-label="Minimum amount"
                placeholder={`Min (${money(amountBoundMin)})`}
                className={FILTER_INPUT_CLASS}
              />
              <input
                value={filters.maxAmount}
                onChange={(event) => updateFilters((previous) => ({ ...previous, maxAmount: event.target.value }))}
                inputMode="decimal"
                aria-label="Maximum amount"
                placeholder={`Max (${money(amountBoundMax)})`}
                className={FILTER_INPUT_CLASS}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 xl:items-end">
            <button
              type="button"
              onClick={applyFilters}
              data-testid="txn-apply"
              aria-label="Apply search and filters"
              className="w-full rounded-2xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm font-medium text-neutral-100 transition hover:border-neutral-500 hover:bg-neutral-800 xl:w-40"
            >
              Apply filters
            </button>
            <button
              type="button"
              onClick={clearFilters}
              className="w-full rounded-2xl border border-neutral-800 bg-transparent px-4 py-3 text-sm text-neutral-300 transition hover:border-neutral-600 hover:bg-neutral-900/70 xl:w-40"
            >
              Clear
            </button>
          </div>
        </div>
      </header>

      {message ? (
        <p className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-300" data-testid="global-message">
          {message}
        </p>
      ) : null}

      <section className="overflow-hidden rounded-[28px] border border-neutral-900 bg-neutral-950/80 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
        <div className="overflow-x-auto">
          <table className="min-w-[1120px] w-full text-left text-sm" data-testid="txn-table">
            <caption className="sr-only">Detailed transaction ledger with inline edit and row actions</caption>
            <thead className="bg-neutral-900/70 text-neutral-300">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Dates</th>
                <th scope="col" className="px-4 py-3 font-medium">Details</th>
                <th scope="col" className="px-4 py-3 font-medium">Category</th>
                <th scope="col" className="px-4 py-3 font-medium">Account</th>
                <th scope="col" className="px-4 py-3 font-medium">Type</th>
                <th scope="col" className="px-4 py-3 font-medium text-right">Amount</th>
                <th scope="col" className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900">
              {ledgerTransactions.map((txn) => {
                const isEditing = form.id === txn.id;
                return (
                  <Fragment key={txn.id}>
                    <tr className="align-top transition hover:bg-neutral-900/40">
                      <td className="px-4 py-4 text-neutral-300">
                        <div className="font-medium text-neutral-100">{txn.transaction_date}</div>
                        <div className="mt-1 text-xs text-neutral-500">
                          Post {txn.post_date || "n/a"}
                        </div>
                        <div className="mt-2 text-[11px] uppercase tracking-[0.18em] text-neutral-600">
                          {txn.created_at.slice(0, 10)}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-start gap-3">
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-900 text-base">
                            {txn.counterparty_emoji || "💳"}
                          </span>
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
                              <span className="rounded-full border border-neutral-800 px-2 py-1 uppercase tracking-[0.18em]">
                                {txn.source_type}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="inline-flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] text-neutral-200">
                          <span>
                            {(filters.categoryView === "coarse"
                              ? `${txn.category_coarse_emoji || ""} ${txn.category_coarse || txn.category_final}`
                              : `${txn.category_emoji || ""} ${txn.category_final}`).trim()}
                          </span>
                        </div>
                        <div className="mt-2 text-[11px] text-neutral-500">
                          {txn.review_status === "needs_review" ? "Needs review" : "Reviewed"}
                        </div>
                      </td>

                      <td className="px-4 py-4 text-neutral-300">
                        <div className="font-medium text-neutral-100">{txn.account_key || "Manual Account"}</div>
                        <div className="mt-1 text-xs text-neutral-500">{txn.account_id || "No linked account id"}</div>
                      </td>

                      <td className="px-4 py-4 text-neutral-300">
                        <div className="font-medium text-neutral-100">{formatTransactionTypeLabel(txn.transaction_type)}</div>
                        <div className="mt-1 text-xs text-neutral-500">{txn.direction}</div>
                      </td>

                      <td className="px-4 py-4 text-right font-medium">
                        <span className={txn.direction === "inflow" ? "text-emerald-400" : "text-neutral-100"}>
                          {txn.direction === "inflow" ? "+" : "-"}
                          {money(Math.abs(txn.amount))}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-right">
                        <div className="inline-flex gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(txn)}
                            data-testid={`txn-edit-${txn.id}`}
                            aria-label={`Edit transaction ${txn.merchant_raw}`}
                            className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs font-medium text-neutral-200 transition hover:bg-neutral-800 disabled:opacity-60"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void removeTransaction(txn.id)}
                            data-testid={`txn-delete-${txn.id}`}
                            aria-label={`Delete transaction ${txn.merchant_raw}`}
                            className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs font-medium text-neutral-200 transition hover:bg-neutral-800 disabled:opacity-60"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>

                    {isEditing ? (
                      <tr data-testid={`txn-inline-edit-row-${txn.id}`}>
                        <td colSpan={7} className="bg-neutral-950/70 px-4 py-4">
                          <form onSubmit={submitForm} className="grid gap-4" data-testid={`txn-inline-form-${txn.id}`}>
                            <input type="hidden" value={form.id} readOnly />
                            <TransactionEditorFields
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
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-neutral-400">
                    No transactions found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-900 bg-neutral-900/40 px-4 py-3">
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
    </div>
  );
}
