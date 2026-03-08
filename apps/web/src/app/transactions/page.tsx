"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDownRight, Filter, Search } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { RANGE_OPTIONS } from "@/lib/constants";
import { money } from "@/lib/utils";
import { useApi } from "@/hooks/useApi";
import type { Account, Category, Transaction } from "@/lib/api/types";
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
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [filters, setFilters] = useState<TransactionsFilterState>(createDefaultTransactionsFilterState);
  const filtersRef = useRef<TransactionsFilterState>(createDefaultTransactionsFilterState());
  const lastAppliedQueryRef = useRef<string | null>(null);
  const [form, setForm] = useState<TransactionFormDraft>(() => createInitialTransactionDraft());
  const [formErrors, setFormErrors] = useState<TransactionFormErrors>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const categoryFilterOptions = useMemo(() => {
    if (filters.categoryView === "granular") {
      return categories.map((entry) => entry.name);
    }

    const fromTransactions = transactions
      .map((entry) => entry.category_coarse || "")
      .filter(Boolean);
    return Array.from(new Set([...fromTransactions]));
  }, [categories, filters.categoryView, transactions]);

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

  async function loadTransactions(nextFilters: TransactionsFilterState, options: { preserveMessage?: boolean } = {}) {
    setLoading(true);
    if (!options.preserveMessage) {
      setMessage("");
    }

    try {
      const [transactionData] = await Promise.all([
        api.transactions.list(toTransactionsListApiParams(nextFilters))
      ]);

      setTransactions(transactionData.items);
      setTotalTransactions(transactionData.total);
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
    const nextFilters = toValidFilterState({
      ...filtersRef.current,
      page: 1
    });

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
    lastAppliedQueryRef.current = queryText;
    router.replace(queryText ? `/transactions?${queryText}` : "/transactions", { scroll: false });
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

    updateFilters(nextFilters);
    const nextSearchParams = buildTransactionsFilterSearchParams(nextFilters);
    const queryText = nextSearchParams.toString();
    lastAppliedQueryRef.current = queryText;
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
          <p className="text-neutral-400">Manage, edit, and organize your transactions.</p>
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

      <section className="overflow-hidden rounded-2xl border border-neutral-900 bg-neutral-950/70">
        <table className="w-full text-left text-sm" data-testid="txn-table">
          <caption className="sr-only">Transactions results with row actions</caption>
          <thead className="bg-neutral-900/60 text-neutral-300">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">Date</th>
              <th scope="col" className="px-4 py-3 font-medium">Merchant</th>
              <th scope="col" className="px-4 py-3 font-medium">Category</th>
              <th scope="col" className="px-4 py-3 font-medium text-right">Amount</th>
              <th scope="col" className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-900">
            {transactions.map((txn) => {
              const isEditing = form.id === txn.id;
              return (
                <Fragment key={txn.id}>
                  <tr className="hover:bg-neutral-900/40">
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
                      <span className={txn.direction === "inflow" ? "text-emerald-400" : "text-neutral-100"}>
                        {txn.direction === "inflow" ? "+" : "-"}
                        {money(Math.abs(txn.amount))}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(txn)}
                          data-testid={`txn-edit-${txn.id}`}
                          aria-label={`Edit transaction ${txn.merchant_raw}`}
                          className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-neutral-200 transition hover:bg-neutral-800 disabled:opacity-60"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void removeTransaction(txn.id)}
                          data-testid={`txn-delete-${txn.id}`}
                          aria-label={`Delete transaction ${txn.merchant_raw}`}
                          className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-neutral-200 transition hover:bg-neutral-800 disabled:opacity-60"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                  {isEditing ? (
                    <tr data-testid={`txn-inline-edit-row-${txn.id}`}>
                      <td colSpan={6} className="bg-neutral-950/70 px-4 py-4">
                        <form onSubmit={submitForm} className="grid gap-3" data-testid={`txn-inline-form-${txn.id}`}>
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
                            </label>
                          </div>

                          <div className="grid gap-3 md:grid-cols-4">
                            <label className="grid gap-1 text-sm text-neutral-300">
                              Direction
                              <select
                                name="direction"
                                value={form.direction}
                                onChange={(event) =>
                                  setForm((previous) => ({ ...previous, direction: event.target.value as "outflow" | "inflow" }))
                                }
                                className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-200 outline-none transition focus:border-emerald-500"
                              >
                                <option value="outflow">outflow</option>
                                <option value="inflow">inflow</option>
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
                            </label>
                            <label className="grid gap-1 text-sm text-neutral-300">
                              Tags
                              <input
                                name="tags"
                                value={form.tags}
                                onChange={(event) => setForm((previous) => ({ ...previous, tags: event.target.value }))}
                                placeholder="monthly, rent"
                                className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-200 outline-none transition focus:border-emerald-500"
                              />
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

                          {Object.values(formErrors).length ? (
                            <div className="grid gap-1 text-xs text-rose-300">
                              {Object.values(formErrors).map((error) => (
                                <span key={error}>{error}</span>
                              ))}
                            </div>
                          ) : null}

                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              type="submit"
                              disabled={saving}
                              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              {saving ? "Updating..." : "Update"}
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              data-testid={`txn-inline-cancel-${txn.id}`}
                              className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm text-neutral-200 transition hover:bg-neutral-800"
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
            {!loading && transactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-neutral-400">
                  No transactions found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>

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
            {form.id ? (
              <div className="mt-3 rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-300">
                Editing a transaction inline in the table. Save or cancel there before creating a new manual transaction.
              </div>
            ) : (
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
                      setForm((previous) => ({ ...previous, direction: event.target.value as "outflow" | "inflow" }))
                    }
                    className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-200 outline-none transition focus:border-emerald-500"
                  >
                    <option value="outflow">outflow</option>
                    <option value="inflow">inflow</option>
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
            )}
          </section>
        </div>
      </details>
    </div>
  );
}
