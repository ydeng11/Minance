"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDownRight, Filter, Search } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { RANGE_OPTIONS } from "@/lib/constants";
import { money } from "@/lib/utils";
import { useApi } from "@/hooks/useApi";
import type { Account, Category, OverviewResponse, Transaction } from "@/lib/api/types";
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
  toTransactionsListApiParams,
  toTransactionsOverviewApiParams,
  toValidFilterState,
  type TransactionsFilterState
} from "./filters";

const TRANSACTION_RANGE_OPTIONS = [...RANGE_OPTIONS, { value: "custom", label: "Custom" }];

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
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [filters, setFilters] = useState<TransactionsFilterState>(createDefaultTransactionsFilterState);
  const filtersRef = useRef<TransactionsFilterState>(createDefaultTransactionsFilterState());
  const [form, setForm] = useState<TransactionFormDraft>(() => createInitialTransactionDraft());
  const [formErrors, setFormErrors] = useState<TransactionFormErrors>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  const trendBars = useMemo(() => {
    return (overview?.trend || []).slice(-7);
  }, [overview]);

  const categoryFilterOptions = useMemo(() => {
    if (filters.categoryView === "granular") {
      return categories.map((entry) => entry.name);
    }

    const fromTransactions = transactions
      .map((entry) => entry.category_coarse || "")
      .filter(Boolean);
    const fromOverview = (overview?.topCategories || []).map((entry) => entry.category);
    return Array.from(new Set([...fromTransactions, ...fromOverview]));
  }, [categories, filters.categoryView, overview, transactions]);

  const accountFilterOptions = useMemo(() => {
    const options = new Map<string, string>();

    for (const account of accounts) {
      if (!account.normalizedKey) {
        continue;
      }
      options.set(account.normalizedKey, account.displayName || account.normalizedKey);
    }

    for (const transaction of transactions) {
      const key = String(transaction.account_key || "").trim();
      if (!key || options.has(key)) {
        continue;
      }
      options.set(key, key);
    }

    return Array.from(options.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [accounts, transactions]);

  const selectedTransactionIdSet = useMemo(
    () => new Set(selectedTransactionIds),
    [selectedTransactionIds]
  );
  const allVisibleSelected = transactions.length > 0 && transactions.every((entry) => selectedTransactionIdSet.has(entry.id));

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

  async function loadTransactions(nextFilters: TransactionsFilterState, options: { preserveMessage?: boolean } = {}) {
    setLoading(true);
    if (!options.preserveMessage) {
      setMessage("");
    }

    try {
      const [transactionData, overviewData] = await Promise.all([
        api.transactions.list(toTransactionsListApiParams(nextFilters)),
        api.analytics.overview(toTransactionsOverviewApiParams(nextFilters))
      ]);

      setTransactions(transactionData.items);
      setOverview(overviewData);
    } catch (error) {
      if (error instanceof ApiError) {
        setMessage(error.message);
      } else {
        setMessage("Failed to load transactions.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void Promise.all([loadCategories(), loadAccounts()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setFilters(parsedFilters);
    filtersRef.current = parsedFilters;
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

  useEffect(() => {
    const visibleIds = new Set(transactions.map((entry) => entry.id));
    setSelectedTransactionIds((previous) => previous.filter((id) => visibleIds.has(id)));
  }, [transactions]);

  function updateFilters(updater: TransactionsFilterState | ((previous: TransactionsFilterState) => TransactionsFilterState)) {
    setFilters((previous) => {
      const next = typeof updater === "function" ? updater(previous) : updater;
      filtersRef.current = next;
      return next;
    });
  }

  function applyFilters() {
    const nextFilters = toValidFilterState(filtersRef.current);

    if (
      nextFilters.range === "custom" &&
      nextFilters.start &&
      nextFilters.end &&
      nextFilters.start > nextFilters.end
    ) {
      setMessage("Custom date range is invalid: start date must be before end date.");
      return;
    }

    updateFilters(nextFilters);
    const nextSearchParams = buildTransactionsFilterSearchParams(nextFilters);
    const queryText = nextSearchParams.toString();
    router.replace(queryText ? `/transactions?${queryText}` : "/transactions", { scroll: false });
  }

  function resetManualForm() {
    setForm(createInitialTransactionDraft({ category: categories[0]?.name || "" }));
    setFormErrors({});
  }

  function startEdit(transaction: Transaction) {
    setForm(buildDraftFromTransaction(transaction));
    setFormErrors({});
    setMessage("");
  }

  function cancelEdit() {
    resetManualForm();
    setMessage("Edit canceled.");
  }

  function toggleTransactionSelection(transactionId: string) {
    setSelectedTransactionIds((previous) => {
      if (previous.includes(transactionId)) {
        return previous.filter((id) => id !== transactionId);
      }
      return [...previous, transactionId];
    });
  }

  function toggleSelectVisibleTransactions() {
    if (allVisibleSelected) {
      setSelectedTransactionIds([]);
      return;
    }
    setSelectedTransactionIds(transactions.map((entry) => entry.id));
  }

  async function applyBulkReviewStatus(reviewStatus: "reviewed" | "needs_review") {
    if (!selectedTransactionIds.length) {
      setMessage("Select at least one transaction for bulk actions.");
      return;
    }

    const selectedIds = [...selectedTransactionIds];
    const optimisticTransactions = transactions.map((entry) => {
      if (!selectedIds.includes(entry.id)) {
        return entry;
      }
      const needsReview = reviewStatus === "needs_review";
      return {
        ...entry,
        review_status: reviewStatus,
        needs_category_review: needsReview
      };
    });

    setBulkSaving(true);
    setTransactions(optimisticTransactions);

    try {
      await api.transactions.bulkUpdate({
        transaction_ids: selectedIds,
        review_status: reviewStatus
      });
      setMessage(
        reviewStatus === "reviewed"
          ? `Marked ${selectedIds.length} transaction(s) as reviewed.`
          : `Marked ${selectedIds.length} transaction(s) as needs review.`
      );
      setSelectedTransactionIds([]);
      await loadTransactions(parsedFilters, { preserveMessage: true });
    } catch (error) {
      setTransactions(transactions);
      if (error instanceof ApiError) {
        setMessage(error.message);
      } else {
        setMessage("Bulk update failed.");
      }
    } finally {
      setBulkSaving(false);
    }
  }

  async function removeTransaction(transactionId: string) {
    try {
      await api.transactions.remove(transactionId);
      setMessage("Transaction deleted.");
      await loadTransactions(parsedFilters, { preserveMessage: true });
    } catch (error) {
      if (error instanceof ApiError) {
        setMessage(error.message);
      } else {
        setMessage("Failed to delete transaction.");
      }
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
      } else {
        await api.transactions.create(validation.payload);
        setMessage("Transaction created.");
      }

      resetManualForm();
      await Promise.all([
        loadCategories(),
        loadAccounts(),
        loadTransactions(parsedFilters, { preserveMessage: true })
      ]);
    } catch (error) {
      if (error instanceof ApiError) {
        setMessage(error.message);
      } else {
        setMessage("Failed to save transaction.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6" data-testid="transactions-page">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">Transactions</h2>
          <p className="text-neutral-400">Review and filter your parsed financial data.</p>
        </div>

        <div className="flex w-full items-center gap-2 md:w-auto">
          <div className="relative flex-1 md:w-64">
            <label htmlFor="txn-query-input" className="sr-only">
              Search merchants
            </label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              id="txn-query-input"
              value={filters.query}
              onChange={(event) => updateFilters((previous) => ({ ...previous, query: event.target.value }))}
              data-testid="txn-query"
              placeholder="Search merchants..."
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 py-2 pl-9 pr-3 text-sm text-neutral-100 placeholder:text-neutral-400 outline-none transition focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500/40"
            />
          </div>
          <button
            type="button"
            data-testid="txn-apply"
            onClick={applyFilters}
            aria-label="Apply search and filters"
            className="rounded-lg border border-neutral-800 bg-neutral-900 p-2 text-neutral-300 transition hover:bg-neutral-800"
          >
            <Filter className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </header>

      {message ? (
        <p className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-300" data-testid="global-message">
          {message}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-neutral-900 bg-neutral-950/70 p-6 lg:col-span-2">
          <h3 className="text-sm font-medium text-neutral-300">Spending Trend</h3>
          <div className="mt-4 grid h-56 grid-cols-7 items-end gap-2" data-testid="transactions-trend">
            {trendBars.length
              ? trendBars.map((entry) => {
                  const max = Math.max(1, ...trendBars.map((item) => item.spend));
                  const height = Math.max(18, Math.round((entry.spend / max) * 180));
                  return (
                    <div key={entry.month} className="flex flex-col items-center gap-2">
                      <div className="w-full rounded bg-neutral-700/80" style={{ height }} />
                      <span className="text-[11px] text-neutral-400">{entry.month.slice(5)}</span>
                    </div>
                  );
                })
              : Array.from({ length: 7 }).map((_, index) => <div key={index} className="h-10 rounded bg-neutral-900" />)}
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-900 bg-neutral-950/70 p-6">
          <h3 className="text-sm text-neutral-400">Total Expenses</h3>
          <p className="mt-2 text-4xl font-semibold text-neutral-100">{money(overview?.summary.totalSpend || 0)}</p>

          <div className="mt-6 space-y-4">
            {(overview?.topCategories || []).slice(0, 2).map((entry) => {
              const total = Math.max(1, overview?.summary.totalSpend || 1);
              const width = Math.min(100, Math.round((entry.amount / total) * 100));
              return (
                <div key={entry.category}>
                  <div className="mb-1 flex justify-between text-sm text-neutral-300">
                    <span>{entry.emoji ? `${entry.emoji} ` : ""}{entry.category}</span>
                    <span>{money(entry.amount)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-neutral-800">
                    <div className="h-2 rounded-full bg-emerald-400" style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl border border-neutral-900 bg-neutral-950/70">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-900 bg-neutral-900/40 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-neutral-400">
            {selectedTransactionIds.length
              ? `${selectedTransactionIds.length} selected`
              : "Select rows for bulk actions"}
          </p>
          <div className="inline-flex gap-2">
            <button
              type="button"
              onClick={() => void applyBulkReviewStatus("reviewed")}
              disabled={bulkSaving || selectedTransactionIds.length === 0}
              className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-neutral-200 transition hover:bg-neutral-800 disabled:opacity-60"
              data-testid="txn-bulk-reviewed"
            >
              Mark reviewed
            </button>
            <button
              type="button"
              onClick={() => void applyBulkReviewStatus("needs_review")}
              disabled={bulkSaving || selectedTransactionIds.length === 0}
              className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-neutral-200 transition hover:bg-neutral-800 disabled:opacity-60"
              data-testid="txn-bulk-needs-review"
            >
              Mark needs review
            </button>
          </div>
        </div>

        <table className="w-full text-left text-sm" data-testid="txn-table">
          <caption className="sr-only">Transactions results with row actions</caption>
          <thead className="bg-neutral-900/60 text-neutral-300">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleSelectVisibleTransactions}
                  aria-label="Select all visible transactions"
                  className="h-4 w-4 rounded border-neutral-700 bg-neutral-900 text-emerald-500 focus:ring-emerald-500"
                  data-testid="txn-select-all"
                />
              </th>
              <th scope="col" className="px-4 py-3 font-medium">Date</th>
              <th scope="col" className="px-4 py-3 font-medium">Merchant</th>
              <th scope="col" className="px-4 py-3 font-medium">Category</th>
              <th scope="col" className="px-4 py-3 font-medium text-right">Amount</th>
              <th scope="col" className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-900">
            {transactions.map((txn) => (
              <tr key={txn.id} className="hover:bg-neutral-900/40">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedTransactionIdSet.has(txn.id)}
                    onChange={() => toggleTransactionSelection(txn.id)}
                    aria-label={`Select transaction ${txn.merchant_raw} on ${txn.transaction_date}`}
                    className="h-4 w-4 rounded border-neutral-700 bg-neutral-900 text-emerald-500 focus:ring-emerald-500"
                    data-testid={`txn-select-${txn.id}`}
                  />
                </td>
                <td className="px-4 py-3 text-neutral-300">{txn.transaction_date}</td>
                <td className="px-4 py-3 font-medium text-neutral-200">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex rounded-full bg-neutral-800 p-1.5">
                      <ArrowDownRight className="h-3 w-3 text-neutral-400" />
                    </span>
                    <div>
                      <div>{txn.merchant_raw}</div>
                      {Array.isArray(txn.tags) && txn.tags.length ? (
                        <div className="mt-1 text-[11px] text-neutral-400">#{txn.tags.join(" #")}</div>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-md bg-neutral-800 px-2 py-1 text-[11px] uppercase tracking-wide text-neutral-300">
                    {(filters.categoryView === "coarse"
                      ? `${txn.category_coarse_emoji || ""} ${txn.category_coarse || txn.category_final}`
                      : `${txn.category_emoji || ""} ${txn.category_final}`).trim()}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-medium">
                  <span className={txn.direction === "credit" ? "text-emerald-400" : "text-neutral-100"}>
                    {txn.direction === "credit" ? "+" : "-"}
                    {money(txn.amount)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(txn)}
                      disabled={bulkSaving}
                      data-testid={`txn-edit-${txn.id}`}
                      aria-label={`Edit transaction ${txn.merchant_raw}`}
                      className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-neutral-200 transition hover:bg-neutral-800 disabled:opacity-60"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeTransaction(txn.id)}
                      disabled={bulkSaving}
                      data-testid={`txn-delete-${txn.id}`}
                      aria-label={`Delete transaction ${txn.merchant_raw}`}
                      className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-neutral-200 transition hover:bg-neutral-800 disabled:opacity-60"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && transactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-neutral-400">
                  No transactions found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <details className="rounded-2xl border border-neutral-900 bg-neutral-950/70" data-testid="advanced-transactions" open>
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-neutral-300">Advanced transaction tools</summary>
        <div className="space-y-5 px-4 pb-4">
          <div className="grid gap-3 md:grid-cols-5">
            <label className="grid gap-1 text-sm text-neutral-300">
              Category
              <select
                value={filters.category}
                onChange={(event) => updateFilters((previous) => ({ ...previous, category: event.target.value }))}
                data-testid="txn-category-filter"
                className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-200 outline-none transition focus:border-emerald-500"
              >
                <option value="">All</option>
                {categoryFilterOptions.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-sm text-neutral-300">
              Account
              <select
                value={filters.account}
                onChange={(event) => updateFilters((previous) => ({ ...previous, account: event.target.value }))}
                data-testid="txn-account-filter"
                className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-200 outline-none transition focus:border-emerald-500"
              >
                <option value="">All</option>
                {accountFilterOptions.map((entry) => (
                  <option key={entry.value} value={entry.value}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-sm text-neutral-300">
              Range
              <select
                value={filters.range}
                onChange={(event) => updateFilters((previous) => ({ ...previous, range: event.target.value }))}
                data-testid="txn-range"
                className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-200 outline-none transition focus:border-emerald-500"
              >
                {TRANSACTION_RANGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-sm text-neutral-300">
              Category View
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
                className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-200 outline-none transition focus:border-emerald-500"
              >
                <option value="granular">Granular</option>
                <option value="coarse">Coarse</option>
              </select>
            </label>

            <label className="grid gap-1 text-sm text-neutral-300">
              Review State
              <select
                value={filters.review}
                onChange={(event) =>
                  updateFilters((previous) => ({
                    ...previous,
                    review: event.target.value as "all" | "reviewed" | "needs_review"
                  }))
                }
                data-testid="txn-review-only"
                className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-200 outline-none transition focus:border-emerald-500"
              >
                <option value="all">All</option>
                <option value="reviewed">Reviewed</option>
                <option value="needs_review">Needs Review</option>
              </select>
            </label>

            <label className="grid gap-1 text-sm text-neutral-300">
              Type
              <select
                value={filters.transactionType}
                onChange={(event) =>
                  updateFilters((previous) => ({
                    ...previous,
                    transactionType: event.target.value as "all" | "expense" | "income" | "transfer"
                  }))
                }
                data-testid="txn-type-filter"
                className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-200 outline-none transition focus:border-emerald-500"
              >
                <option value="all">All</option>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
                <option value="transfer">Transfer</option>
              </select>
            </label>

            <label className="grid gap-1 text-sm text-neutral-300">
              Tag
              <input
                value={filters.tag}
                onChange={(event) => updateFilters((previous) => ({ ...previous, tag: event.target.value }))}
                data-testid="txn-tag-filter"
                placeholder="monthly"
                className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-200 outline-none transition focus:border-emerald-500"
              />
            </label>

            {filters.range === "custom" ? (
              <>
                <label className="grid gap-1 text-sm text-neutral-300">
                  Start
                  <input
                    type="date"
                    value={filters.start}
                    onChange={(event) => updateFilters((previous) => ({ ...previous, start: event.target.value }))}
                    data-testid="txn-start-date"
                    className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-200 outline-none transition focus:border-emerald-500"
                  />
                </label>

                <label className="grid gap-1 text-sm text-neutral-300">
                  End
                  <input
                    type="date"
                    value={filters.end}
                    onChange={(event) => updateFilters((previous) => ({ ...previous, end: event.target.value }))}
                    data-testid="txn-end-date"
                    className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-200 outline-none transition focus:border-emerald-500"
                  />
                </label>
              </>
            ) : null}

            <div className="flex items-end">
              <button
                type="button"
                onClick={applyFilters}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 transition hover:bg-neutral-800"
              >
                Apply filters
              </button>
            </div>
          </div>

          <section className="rounded-xl border border-neutral-900 bg-neutral-950 p-4">
            <h3 className="text-sm font-medium text-neutral-300">Manual Transaction</h3>
            <form onSubmit={submitForm} className="mt-3 grid gap-3" data-testid="txn-form">
              <input type="hidden" value={form.id} readOnly />

              <div className="grid gap-3 md:grid-cols-4">
                <label className="grid gap-1 text-sm text-neutral-300">
                  Date
                  <input
                    type="date"
                    name="transaction_date"
                    value={form.transaction_date}
                    onChange={(event) => setForm((previous) => ({ ...previous, transaction_date: event.target.value }))}
                    className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-200 outline-none transition focus:border-emerald-500"
                    required
                  />
                  {formErrors.transaction_date ? <span className="text-xs text-rose-300">{formErrors.transaction_date}</span> : null}
                </label>

                <label className="grid gap-1 text-sm text-neutral-300">
                  Description
                  <input
                    name="description"
                    value={form.description}
                    onChange={(event) => setForm((previous) => ({ ...previous, description: event.target.value }))}
                    className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-200 outline-none transition focus:border-emerald-500"
                    required
                  />
                  {formErrors.description ? <span className="text-xs text-rose-300">{formErrors.description}</span> : null}
                </label>

                <label className="grid gap-1 text-sm text-neutral-300">
                  Merchant
                  <input
                    name="merchant_raw"
                    value={form.merchant_raw}
                    onChange={(event) => setForm((previous) => ({ ...previous, merchant_raw: event.target.value }))}
                    className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-200 outline-none transition focus:border-emerald-500"
                  />
                </label>

                <label className="grid gap-1 text-sm text-neutral-300">
                  Amount
                  <input
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.amount}
                    onChange={(event) => setForm((previous) => ({ ...previous, amount: event.target.value }))}
                    className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-200 outline-none transition focus:border-emerald-500"
                    required
                  />
                  {formErrors.amount ? <span className="text-xs text-rose-300">{formErrors.amount}</span> : null}
                </label>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <label className="grid gap-1 text-sm text-neutral-300">
                  Direction
                  <select
                    name="direction"
                    value={form.direction}
                    onChange={(event) =>
                      setForm((previous) => ({ ...previous, direction: event.target.value as "debit" | "credit" }))
                    }
                    className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-200 outline-none transition focus:border-emerald-500"
                  >
                    <option value="debit">debit</option>
                    <option value="credit">credit</option>
                  </select>
                </label>

                <label className="grid gap-1 text-sm text-neutral-300">
                  Category
                  <select
                    name="category_final"
                    value={form.category_final}
                    onChange={(event) => setForm((previous) => ({ ...previous, category_final: event.target.value }))}
                    className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-200 outline-none transition focus:border-emerald-500"
                  >
                    <option value="">Select category</option>
                    {categories.map((entry) => (
                      <option key={entry.id} value={entry.name}>
                        {entry.emoji ? `${entry.emoji} ` : ""}{entry.name}
                      </option>
                    ))}
                  </select>
                  {formErrors.category_final ? <span className="text-xs text-rose-300">{formErrors.category_final}</span> : null}
                </label>

                <label className="grid gap-1 text-sm text-neutral-300">
                  Account
                  <input
                    name="account_name"
                    value={form.account_name}
                    onChange={(event) => setForm((previous) => ({ ...previous, account_name: event.target.value }))}
                    className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-200 outline-none transition focus:border-emerald-500"
                  />
                </label>

                <label className="grid gap-1 text-sm text-neutral-300">
                  Review State
                  <select
                    name="review_status"
                    value={form.review_status}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        review_status: event.target.value as "reviewed" | "needs_review"
                      }))
                    }
                    className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-200 outline-none transition focus:border-emerald-500"
                  >
                    <option value="reviewed">Reviewed</option>
                    <option value="needs_review">Needs Review</option>
                  </select>
                  {formErrors.review_status ? <span className="text-xs text-rose-300">{formErrors.review_status}</span> : null}
                </label>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <label className="grid gap-1 text-sm text-neutral-300">
                  Type
                  <select
                    name="transaction_type"
                    value={form.transaction_type}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        transaction_type: event.target.value as "" | "expense" | "income" | "transfer"
                      }))
                    }
                    className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-200 outline-none transition focus:border-emerald-500"
                  >
                    <option value="">Auto</option>
                    <option value="expense">expense</option>
                    <option value="income">income</option>
                    <option value="transfer">transfer</option>
                  </select>
                  {formErrors.transaction_type ? <span className="text-xs text-rose-300">{formErrors.transaction_type}</span> : null}
                </label>

                <label className="grid gap-1 text-sm text-neutral-300">
                  Tags
                  <input
                    name="tags"
                    value={form.tags}
                    onChange={(event) => setForm((previous) => ({ ...previous, tags: event.target.value }))}
                    placeholder="monthly, rent"
                    data-testid="txn-tags-input"
                    className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-200 outline-none transition focus:border-emerald-500"
                  />
                  {formErrors.tags ? <span className="text-xs text-rose-300">{formErrors.tags}</span> : null}
                </label>

                <label className="grid gap-1 text-sm text-neutral-300">
                  Memo
                  <input
                    name="memo"
                    value={form.memo}
                    onChange={(event) => setForm((previous) => ({ ...previous, memo: event.target.value }))}
                    className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-200 outline-none transition focus:border-emerald-500"
                  />
                </label>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {saving ? (form.id ? "Updating..." : "Saving...") : form.id ? "Update" : "Save"}
                </button>
                {form.id ? (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    data-testid="txn-cancel"
                    className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm text-neutral-200 transition hover:bg-neutral-800"
                  >
                    Cancel
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={resetManualForm}
                    data-testid="txn-cancel"
                    className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm text-neutral-200 transition hover:bg-neutral-800"
                  >
                    Clear
                  </button>
                )}
              </div>
            </form>
          </section>
        </div>
      </details>
    </div>
  );
}
