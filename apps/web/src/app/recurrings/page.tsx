"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Archive, Link2, PauseCircle, PlayCircle, Plus, Repeat2, Trash2 } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import type { Account, Category, RecurringMatch, RecurringRule, RecurringSuggestion } from "@/lib/api/types";
import { useApi } from "@/hooks/useApi";
import { money } from "@/lib/utils";
import { RecurringTotalsBand } from "@/components/recurrings/RecurringTotalsBand";
import { SuggestionsSection } from "@/components/recurrings/SuggestionsSection";

const CADENCE_OPTIONS = ["weekly", "biweekly", "monthly", "quarterly", "yearly"] as const;

type RuleStatusFilter = "all" | "active" | "paused" | "archived";

function statusBadgeClass(status: RecurringRule["status"]) {
  if (status === "paused") {
    return "inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-1 text-xs text-amber-300";
  }
  if (status === "archived") {
    return "inline-flex items-center gap-1 rounded-full bg-slate-500/20 px-2 py-1 text-xs text-slate-300";
  }
  return "inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300";
}

function formatCadence(cadence: string) {
  return cadence.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function RecurringsPage() {
  const api = useApi();
  const [statusFilter, setStatusFilter] = useState<RuleStatusFilter>("all");
  const [rules, setRules] = useState<RecurringRule[]>([]);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [selectedRule, setSelectedRule] = useState<RecurringRule | null>(null);
  const [matches, setMatches] = useState<RecurringMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<RecurringSuggestion[]>([]);

  const [createDraft, setCreateDraft] = useState({
    name: "",
    cadence: "monthly" as (typeof CADENCE_OPTIONS)[number],
    amount: "",
    direction: "" as "" | "outflow" | "inflow"
  });

  const [editDraft, setEditDraft] = useState({
    name: "",
    cadence: "monthly" as (typeof CADENCE_OPTIONS)[number],
    amount: "",
    merchant_pattern: "",
    category_final: "",
    account_id: "",
    direction: "" as "" | "outflow" | "inflow"
  });

  async function loadRules(nextSelectedRuleId: string | null = selectedRuleId) {
    setLoading(true);
    try {
      const response = await api.recurrings.list({
        status: statusFilter === "all" ? undefined : statusFilter
      });
      const items = response.items;
      setRules(items);

      if (!items.length) {
        setSelectedRuleId(null);
        setSelectedRule(null);
        setMatches([]);
        return;
      }

      const preferredId =
        nextSelectedRuleId && items.some((entry) => entry.id === nextSelectedRuleId)
          ? nextSelectedRuleId
          : items[0].id;
      setSelectedRuleId(preferredId);
    } catch (error) {
      if (error instanceof ApiError) {
        setMessage(error.message);
      } else {
        setMessage("Failed to load recurring rules.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadRuleDetail(ruleId: string) {
    try {
      const response = await api.recurrings.getById(ruleId);
      const recurring = response.recurring;
      setSelectedRule(recurring);
      setEditDraft({
        name: recurring.name,
        cadence: recurring.cadence,
        amount: String(recurring.amount),
        merchant_pattern: recurring.merchant_pattern || "",
        category_final: recurring.category_final || "",
        account_id: recurring.account_id || "",
        direction: recurring.direction || ""
      });
    } catch (error) {
      if (error instanceof ApiError) {
        setMessage(error.message);
      } else {
        setMessage("Failed to load recurring detail.");
      }
    }
  }

  async function loadMetadata() {
    try {
      const [categoriesData, accountsData] = await Promise.all([
        api.categories.list(),
        api.accounts.list()
      ]);
      setCategories(categoriesData.categories);
      setAccounts(accountsData.accounts);
    } catch {
      // Metadata loading is optional; keep page usable
    }
  }

  async function loadSuggestions() {
    try {
      const response = await api.recurrings.getSuggestions();
      if ("items" in response) {
        setSuggestions(response.items);
      }
    } catch {
      // Suggestions loading is optional; keep page usable
    }
  }

  useEffect(() => {
    void loadMetadata();
    void loadSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadRules(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  useEffect(() => {
    if (!selectedRuleId) {
      return;
    }
    setMatches([]);
    void loadRuleDetail(selectedRuleId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRuleId]);

  useEffect(() => {
    setDeleteConfirmId(null);
  }, [selectedRuleId]);

  async function createRule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!createDraft.name.trim()) {
      setMessage("Rule name is required.");
      return;
    }

    const amount = Number(createDraft.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage("Recurring amount must be greater than zero.");
      return;
    }

    setSaving(true);
    try {
      const response = await api.recurrings.create({
        name: createDraft.name.trim(),
        cadence: createDraft.cadence,
        amount,
        direction: createDraft.direction || undefined
      });
      setCreateDraft({
        name: "",
        cadence: "monthly",
        amount: "",
        direction: ""
      });
      setMessage("Recurring rule created.");
      await loadRules(response.recurring.id);
    } catch (error) {
      if (error instanceof ApiError) {
        setMessage(error.message);
      } else {
        setMessage("Failed to create recurring rule.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function saveRuleEdits() {
    if (!selectedRuleId) {
      return;
    }

    const amount = Number(editDraft.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage("Recurring amount must be greater than zero.");
      return;
    }

    setSaving(true);
    try {
      await api.recurrings.update(selectedRuleId, {
        name: editDraft.name.trim(),
        cadence: editDraft.cadence,
        amount,
        merchant_pattern: editDraft.merchant_pattern.trim() || null,
        category_final: editDraft.category_final || null,
        account_id: editDraft.account_id || null,
        direction: editDraft.direction || null
      });
      setMessage("Recurring rule updated.");
      await Promise.all([loadRules(selectedRuleId), loadRuleDetail(selectedRuleId)]);
    } catch (error) {
      if (error instanceof ApiError) {
        setMessage(error.message);
      } else {
        setMessage("Failed to update recurring rule.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function evaluateRule() {
    if (!selectedRuleId) {
      return;
    }

    setSaving(true);
    try {
      const response = await api.recurrings.evaluate(selectedRuleId, {});
      setSelectedRule(response.evaluation.rule);
      setMatches(response.evaluation.matches);
      setMessage(`Evaluation complete: ${response.evaluation.match_count} matches.`);
      await loadRules(selectedRuleId);
    } catch (error) {
      if (error instanceof ApiError) {
        setMessage(error.message);
      } else {
        setMessage("Failed to evaluate recurring rule.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function runLifecycleAction(action: "pause" | "resume" | "archive" | "remove") {
    if (!selectedRuleId) {
      return;
    }

    setSaving(true);
    try {
      if (action === "pause") {
        await api.recurrings.pause(selectedRuleId);
        setMessage("Recurring rule paused.");
      } else if (action === "resume") {
        await api.recurrings.resume(selectedRuleId);
        setMessage("Recurring rule resumed.");
      } else if (action === "archive") {
        await api.recurrings.archive(selectedRuleId);
        setMessage("Recurring rule archived.");
      } else {
        await api.recurrings.remove(selectedRuleId);
        setMessage("Recurring rule deleted.");
        setDeleteConfirmId(null);
        setSelectedRuleId(null);
        setSelectedRule(null);
        setMatches([]);
      }

      await loadRules(action === "remove" ? null : selectedRuleId);
      if (action !== "remove") {
        await loadRuleDetail(selectedRuleId);
      }
    } catch (error) {
      if (error instanceof ApiError) {
        setMessage(error.message);
      } else {
        setMessage("Failed to apply recurring lifecycle action.");
      }
    } finally {
      setSaving(false);
    }
  }

  const selectedLinkedIds = useMemo(
    () => selectedRule?.linked_transaction_ids || [],
    [selectedRule]
  );

  return (
    <div className="space-y-6" data-testid="recurrings-page">
      <header>
        <h2 className="text-3xl font-semibold tracking-tight">Recurrings</h2>
        <p className="text-neutral-400">Track recurring rules and their linked transaction patterns.</p>
      </header>

      {message ? (
        <p className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-200" data-testid="global-message">
          {message}
        </p>
      ) : null}

      <RecurringTotalsBand rules={rules} />

      <SuggestionsSection
        suggestions={suggestions}
        onSuggestionHandled={() => {
          void loadSuggestions();
          void loadRules(selectedRuleId);
        }}
      />

      <section className="rounded-2xl border border-neutral-900 bg-neutral-950/70 p-4">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="text-sm font-medium text-neutral-300">Recurring list</h3>
            <p className="text-xs text-neutral-500">Filter and manage lifecycle actions in one place.</p>
          </div>
          <label className="text-xs uppercase tracking-wide text-neutral-400">
            Status
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as RuleStatusFilter)}
              className="ml-2 rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs text-neutral-200"
              data-testid="recurrings-status-filter"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="archived">Archived</option>
            </select>
          </label>
        </div>

        <form onSubmit={createRule} className="mb-4 grid gap-2 rounded-xl border border-neutral-800 bg-neutral-900/60 p-3 md:grid-cols-[1.2fr_1fr_1fr_1fr_auto]">
          <input
            value={createDraft.name}
            onChange={(event) => setCreateDraft((previous) => ({ ...previous, name: event.target.value }))}
            placeholder="Rule name"
            className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-200 outline-none transition focus:border-emerald-500"
            data-testid="recurrings-create-name"
          />
          <select
            value={createDraft.cadence}
            onChange={(event) => setCreateDraft((previous) => ({ ...previous, cadence: event.target.value as (typeof CADENCE_OPTIONS)[number] }))}
            className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-200 outline-none transition focus:border-emerald-500"
            data-testid="recurrings-create-cadence"
          >
            {CADENCE_OPTIONS.map((option) => (
              <option key={option} value={option}>{formatCadence(option)}</option>
            ))}
          </select>
          <div className="flex flex-col">
            <input
              value={createDraft.amount}
              onChange={(event) => setCreateDraft((previous) => ({ ...previous, amount: event.target.value }))}
              placeholder="Amount"
              inputMode="decimal"
              className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-200 outline-none transition focus:border-emerald-500"
              data-testid="recurrings-create-amount"
            />
            <p className="text-xs text-neutral-500">Matches within ±$0.01</p>
          </div>
          <select
            value={createDraft.direction}
            onChange={(event) => setCreateDraft((previous) => ({ ...previous, direction: event.target.value as "" | "outflow" | "inflow" }))}
            className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-200 outline-none transition focus:border-emerald-500"
            data-testid="recurrings-create-direction"
          >
            <option value="">Any direction</option>
            <option value="outflow">Outflow</option>
            <option value="inflow">Inflow</option>
          </select>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 transition hover:bg-neutral-800 disabled:opacity-60"
            data-testid="recurrings-create-submit"
          >
            <Plus className="h-4 w-4" />
            Create
          </button>
        </form>

        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-3" data-testid="recurrings-list-panel">
            {loading ? (
              <p className="rounded-xl border border-neutral-800 bg-neutral-900/60 px-3 py-3 text-sm text-neutral-300">Loading recurring rules...</p>
            ) : rules.length ? (
              rules.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setSelectedRuleId(entry.id)}
                  className={
                    entry.id === selectedRuleId
                      ? "w-full rounded-xl border border-emerald-500/40 bg-neutral-900/80 px-3 py-3 text-left"
                      : "w-full rounded-xl border border-neutral-800 bg-neutral-900/60 px-3 py-3 text-left transition hover:bg-neutral-900/80"
                  }
                  data-testid={`recurring-row-${entry.id}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-neutral-100">{entry.name}</p>
                      <p className="text-xs text-neutral-400">{formatCadence(entry.cadence)} · {money(entry.amount)}</p>
                    </div>
                    <span className={statusBadgeClass(entry.status)}>
                      {entry.status === "paused" ? <PauseCircle className="h-3.5 w-3.5" /> : <Repeat2 className="h-3.5 w-3.5" />}
                      {entry.status}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-neutral-500">{entry.linked_transaction_count} linked transaction(s)</p>
                </button>
              ))
            ) : (
              <p className="rounded-xl border border-neutral-800 bg-neutral-900/60 px-3 py-3 text-sm text-neutral-300">
                No recurring rules yet. Create one above.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3" data-testid="recurrings-detail-panel">
            {selectedRule ? (
              <div className="space-y-4">
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  <label className="grid gap-1 text-xs uppercase tracking-wide text-neutral-400">
                    Name
                    <input
                      value={editDraft.name}
                      onChange={(event) => setEditDraft((previous) => ({ ...previous, name: event.target.value }))}
                      className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-200 outline-none transition focus:border-emerald-500"
                      data-testid="recurrings-edit-name"
                    />
                  </label>
                  <label className="grid gap-1 text-xs uppercase tracking-wide text-neutral-400">
                    Cadence
                    <select
                      value={editDraft.cadence}
                      onChange={(event) => setEditDraft((previous) => ({ ...previous, cadence: event.target.value as (typeof CADENCE_OPTIONS)[number] }))}
                      className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-200 outline-none transition focus:border-emerald-500"
                      data-testid="recurrings-edit-cadence"
                    >
                      {CADENCE_OPTIONS.map((option) => (
                        <option key={option} value={option}>{formatCadence(option)}</option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1 text-xs uppercase tracking-wide text-neutral-400">
                    Amount
                    <input
                      value={editDraft.amount}
                      onChange={(event) => setEditDraft((previous) => ({ ...previous, amount: event.target.value }))}
                      inputMode="decimal"
                      className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-200 outline-none transition focus:border-emerald-500"
                      data-testid="recurrings-edit-amount"
                    />
                    <p className="text-xs text-neutral-500">Matches within ±$0.01</p>
                  </label>
                  <label className="grid gap-1 text-xs uppercase tracking-wide text-neutral-400">
                    Merchant pattern
                    <input
                      value={editDraft.merchant_pattern}
                      onChange={(event) => setEditDraft((previous) => ({ ...previous, merchant_pattern: event.target.value }))}
                      className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-200 outline-none transition focus:border-emerald-500"
                      data-testid="recurrings-edit-pattern"
                    />
                  </label>
                  <label className="grid gap-1 text-xs uppercase tracking-wide text-neutral-400">
                    Category
                    <select
                      value={editDraft.category_final}
                      onChange={(event) => setEditDraft((previous) => ({ ...previous, category_final: event.target.value }))}
                      className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-200 outline-none transition focus:border-emerald-500"
                      data-testid="recurrings-edit-category"
                    >
                      <option value="">Any category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.emoji ? `${c.emoji} ` : ""}{c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1 text-xs uppercase tracking-wide text-neutral-400">
                    Account
                    <select
                      value={editDraft.account_id}
                      onChange={(event) => setEditDraft((previous) => ({ ...previous, account_id: event.target.value }))}
                      className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-200 outline-none transition focus:border-emerald-500"
                      data-testid="recurrings-edit-account"
                    >
                      <option value="">Any account</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>{a.displayName}</option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1 text-xs uppercase tracking-wide text-neutral-400">
                    Direction
                    <select
                      value={editDraft.direction}
                      onChange={(event) => setEditDraft((previous) => ({ ...previous, direction: event.target.value as "" | "outflow" | "inflow" }))}
                      className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-200 outline-none transition focus:border-emerald-500"
                      data-testid="recurrings-edit-direction"
                    >
                      <option value="">Any direction</option>
                      <option value="outflow">Outflow (expense)</option>
                      <option value="inflow">Inflow (income)</option>
                    </select>
                  </label>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => void saveRuleEdits()}
                    disabled={saving}
                    className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 transition hover:bg-neutral-800 disabled:opacity-60"
                    data-testid="recurrings-save"
                  >
                    Save edits
                  </button>
                  <button
                    type="button"
                    onClick={() => void evaluateRule()}
                    disabled={saving}
                    className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 transition hover:bg-neutral-800 disabled:opacity-60"
                    data-testid="recurrings-evaluate"
                  >
                    Evaluate links
                  </button>
                  {selectedRule.status === "active" ? (
                    <button
                      type="button"
                      onClick={() => void runLifecycleAction("pause")}
                      disabled={saving}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 transition hover:bg-neutral-800 disabled:opacity-60"
                      data-testid="recurrings-pause"
                    >
                      <PauseCircle className="h-4 w-4" /> Pause
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void runLifecycleAction("resume")}
                      disabled={saving || selectedRule.status === "archived"}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 transition hover:bg-neutral-800 disabled:opacity-60"
                      data-testid="recurrings-resume"
                    >
                      <PlayCircle className="h-4 w-4" /> Resume
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void runLifecycleAction("archive")}
                    disabled={saving || selectedRule.status === "archived"}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 transition hover:bg-neutral-800 disabled:opacity-60"
                    data-testid="recurrings-archive"
                  >
                    <Archive className="h-4 w-4" /> Archive
                  </button>
                  {deleteConfirmId === selectedRuleId ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void runLifecycleAction("remove")}
                        disabled={saving}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-600 bg-rose-950/60 px-3 py-2 text-sm text-rose-200 transition hover:bg-rose-900/40 disabled:opacity-60"
                        data-testid="recurrings-delete-confirm"
                      >
                        Confirm delete?
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(null)}
                        disabled={saving}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 transition hover:bg-neutral-800 disabled:opacity-60"
                        data-testid="recurrings-delete-cancel"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(selectedRuleId)}
                      disabled={saving}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-700/70 bg-rose-950/40 px-3 py-2 text-sm text-rose-200 transition hover:bg-rose-900/40 disabled:opacity-60"
                      data-testid="recurrings-delete"
                    >
                      <Trash2 className="h-4 w-4" /> Delete
                    </button>
                  )}
                </div>

                <div className="grid gap-2 text-xs text-neutral-400 sm:grid-cols-2">
                  <p>Next run: <span className="text-neutral-200">{selectedRule.next_run_at || "Not scheduled"}</span></p>
                  <p>Last evaluated: <span className="text-neutral-200">{selectedRule.last_evaluated_at || "Never"}</span></p>
                </div>

                <section className="rounded-lg border border-neutral-800 bg-neutral-950/70 p-3" data-testid="recurrings-linked-transactions">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-neutral-200">
                    <Link2 className="h-4 w-4 text-neutral-400" />
                    Linked Transactions
                  </div>

                  {matches.length ? (
                    <div className="space-y-2">
                      {matches.map((entry) => (
                        <Link
                          key={entry.id}
                          href={`/transactions?recurring_rule_id=${selectedRuleId}`}
                          className="flex items-center justify-between rounded-md bg-neutral-900/70 px-3 py-2 text-sm text-neutral-300 transition hover:bg-neutral-800/70"
                        >
                          <span>{entry.transaction_date} · {entry.merchant_raw}</span>
                          <span className="font-medium text-neutral-100">{money(entry.amount)}</span>
                        </Link>
                      ))}
                    </div>
                  ) : selectedLinkedIds.length ? (
                    <div className="space-y-2">
                      {selectedLinkedIds.map((transactionId) => (
                        <p key={transactionId} className="rounded-md bg-neutral-900/70 px-3 py-2 text-sm text-neutral-300">
                          {transactionId}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-neutral-400">No linked transactions yet. Run evaluation to refresh links.</p>
                  )}
                </section>
              </div>
            ) : (
              <p className="text-sm text-neutral-300">Select a recurring rule to inspect details and lifecycle actions.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
