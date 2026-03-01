"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownRight, Filter, Search } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { RANGE_OPTIONS } from "@/lib/constants";
import { localDateYmd, money, toInputDate } from "@/lib/utils";
import { useApi } from "@/hooks/useApi";
import type { Category, OverviewResponse, Transaction } from "@/lib/api/types";

interface TransactionForm {
  id: string;
  transaction_date: string;
  description: string;
  merchant_raw: string;
  amount: string;
  direction: "debit" | "credit";
  category_final: string;
  account_name: string;
  memo: string;
}

const initialForm = (): TransactionForm => ({
  id: "",
  transaction_date: localDateYmd(),
  description: "",
  merchant_raw: "",
  amount: "",
  direction: "debit",
  category_final: "",
  account_name: "Manual Account",
  memo: ""
});

export default function TransactionsPage() {
  const api = useApi();

  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [categoryView, setCategoryView] = useState<"granular" | "coarse">("granular");
  const [range, setRange] = useState("all");
  const [needsReview, setNeedsReview] = useState(false);
  const [form, setForm] = useState<TransactionForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const trendBars = useMemo(() => {
    return (overview?.trend || []).slice(-7);
  }, [overview]);

  async function loadCategories() {
    const categoryData = await api.categories.list();
    setCategories(categoryData.categories);
    if (!form.category_final && categoryData.categories[0]) {
      setForm((prev) => ({ ...prev, category_final: categoryData.categories[0].name }));
    }
  }

  async function loadTransactions() {
    setLoading(true);
    setMessage("");
    try {
      const [transactionData, overviewData] = await Promise.all([
        api.transactions.list({
          query: search,
          category,
          category_view: categoryView,
          range,
          needs_category_review: needsReview,
          limit: 200
        }),
        api.analytics.overview({ range, category_view: categoryView })
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
    void Promise.all([loadCategories(), loadTransactions()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categoryFilterOptions = useMemo(() => {
    if (categoryView === "granular") {
      return categories.map((entry) => entry.name);
    }

    const fromTransactions = transactions
      .map((entry) => entry.category_coarse || "")
      .filter(Boolean);
    const fromOverview = (overview?.topCategories || []).map((entry) => entry.category);
    return Array.from(new Set([...fromTransactions, ...fromOverview]));
  }, [categories, categoryView, overview, transactions]);

  useEffect(() => {
    if (category && !categoryFilterOptions.includes(category)) {
      setCategory("");
    }
  }, [category, categoryFilterOptions]);

  function startEdit(transaction: Transaction) {
    setForm({
      id: transaction.id,
      transaction_date: toInputDate(transaction.transaction_date),
      description: transaction.description,
      merchant_raw: transaction.merchant_raw,
      amount: String(transaction.amount),
      direction: transaction.direction,
      category_final: transaction.category_final,
      account_name: transaction.account_key || "Manual Account",
      memo: transaction.memo || ""
    });
  }

  async function removeTransaction(transactionId: string) {
    try {
      await api.transactions.remove(transactionId);
      setMessage("Transaction deleted.");
      await loadTransactions();
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

    const payload = {
      transaction_date: form.transaction_date,
      description: form.description,
      merchant_raw: form.merchant_raw,
      amount: Number(form.amount),
      direction: form.direction,
      category_final: form.category_final,
      account_name: form.account_name,
      memo: form.memo
    };

    try {
      if (form.id) {
        await api.transactions.update(form.id, payload);
        setMessage("Transaction updated.");
      } else {
        await api.transactions.create(payload);
        setMessage("Transaction created.");
      }

      setForm(initialForm());
      await Promise.all([loadCategories(), loadTransactions()]);
    } catch (error) {
      if (error instanceof ApiError) {
        setMessage(error.message);
      } else {
        setMessage("Failed to save transaction.");
      }
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
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              data-testid="txn-query"
              placeholder="Search merchants..."
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 py-2 pl-9 pr-3 text-sm text-neutral-100 placeholder:text-neutral-400 outline-none transition focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500/40"
            />
          </div>
          <button
            type="button"
            data-testid="txn-apply"
            onClick={() => void loadTransactions()}
            className="rounded-lg border border-neutral-800 bg-neutral-900 p-2 text-neutral-300 transition hover:bg-neutral-800"
          >
            <Filter className="h-4 w-4" />
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
                      <span className="text-[11px] text-neutral-500">{entry.month.slice(5)}</span>
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
        <table className="w-full text-left text-sm" data-testid="txn-table">
          <thead className="bg-neutral-900/60 text-neutral-300">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Merchant</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium text-right">Amount</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-900">
            {transactions.map((txn) => (
              <tr key={txn.id} className="hover:bg-neutral-900/40">
                <td className="px-4 py-3 text-neutral-300">{txn.transaction_date}</td>
                <td className="px-4 py-3 font-medium text-neutral-200">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex rounded-full bg-neutral-800 p-1.5">
                      <ArrowDownRight className="h-3 w-3 text-neutral-400" />
                    </span>
                    {txn.merchant_raw}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-md bg-neutral-800 px-2 py-1 text-[11px] uppercase tracking-wide text-neutral-300">
                    {(categoryView === "coarse"
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
                      data-testid={`txn-edit-${txn.id}`}
                      className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-neutral-200 transition hover:bg-neutral-800"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeTransaction(txn.id)}
                      data-testid={`txn-delete-${txn.id}`}
                      className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-neutral-200 transition hover:bg-neutral-800"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && transactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-neutral-400">
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
                value={category}
                onChange={(event) => setCategory(event.target.value)}
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
              Range
              <select
                value={range}
                onChange={(event) => setRange(event.target.value)}
                data-testid="txn-range"
                className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-200 outline-none transition focus:border-emerald-500"
              >
                {RANGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-sm text-neutral-300">
              Category View
              <select
                value={categoryView}
                onChange={(event) => setCategoryView(event.target.value as "granular" | "coarse")}
                data-testid="txn-category-view"
                className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-200 outline-none transition focus:border-emerald-500"
              >
                <option value="granular">Granular</option>
                <option value="coarse">Coarse</option>
              </select>
            </label>

            <label className="grid gap-1 text-sm text-neutral-300">
              Needs Review
              <input
                type="checkbox"
                checked={needsReview}
                onChange={(event) => setNeedsReview(event.target.checked)}
                data-testid="txn-review-only"
                className="h-10 w-10 rounded border-neutral-700 bg-neutral-900"
              />
            </label>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => void loadTransactions()}
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
                    onChange={(event) => setForm((prev) => ({ ...prev, transaction_date: event.target.value }))}
                    className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-200 outline-none transition focus:border-emerald-500"
                    required
                  />
                </label>

                <label className="grid gap-1 text-sm text-neutral-300">
                  Description
                  <input
                    name="description"
                    value={form.description}
                    onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                    className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-200 outline-none transition focus:border-emerald-500"
                    required
                  />
                </label>

                <label className="grid gap-1 text-sm text-neutral-300">
                  Merchant
                  <input
                    name="merchant_raw"
                    value={form.merchant_raw}
                    onChange={(event) => setForm((prev) => ({ ...prev, merchant_raw: event.target.value }))}
                    className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-200 outline-none transition focus:border-emerald-500"
                  />
                </label>

                <label className="grid gap-1 text-sm text-neutral-300">
                  Amount
                  <input
                    name="amount"
                    type="number"
                    step="0.01"
                    value={form.amount}
                    onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
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
                    onChange={(event) => setForm((prev) => ({ ...prev, direction: event.target.value as "debit" | "credit" }))}
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
                    onChange={(event) => setForm((prev) => ({ ...prev, category_final: event.target.value }))}
                    className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-200 outline-none transition focus:border-emerald-500"
                  >
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
                    onChange={(event) => setForm((prev) => ({ ...prev, account_name: event.target.value }))}
                    className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-200 outline-none transition focus:border-emerald-500"
                  />
                </label>

                <label className="grid gap-1 text-sm text-neutral-300">
                  Memo
                  <input
                    name="memo"
                    value={form.memo}
                    onChange={(event) => setForm((prev) => ({ ...prev, memo: event.target.value }))}
                    className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-200 outline-none transition focus:border-emerald-500"
                  />
                </label>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-emerald-400"
                >
                  {form.id ? "Update" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => setForm(initialForm())}
                  className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm text-neutral-200 transition hover:bg-neutral-800"
                >
                  Reset
                </button>
              </div>
            </form>
          </section>
        </div>
      </details>
    </div>
  );
}
