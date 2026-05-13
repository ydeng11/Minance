"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Archive, Link2, PauseCircle, PlayCircle, Plus, Repeat2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Account, Category, RecurringMatch, RecurringRule, RecurringSuggestion } from "@/lib/api/types";
import { useApi } from "@/hooks/useApi";
import { getRequestFeedbackMessage } from "@/lib/feedback/requestFeedback";
import { cn, money } from "@/lib/utils";
import { StatusMessage } from "@/components/feedback/StatusMessage";
import { RecurringTotalsBand } from "@/components/recurrings/RecurringTotalsBand";
import { SuggestionsSection } from "@/components/recurrings/SuggestionsSection";
import {
  CREATE_RULE_ERROR_MESSAGE,
  RECURRING_AMOUNT_ERROR_MESSAGE,
  RULE_NAME_REQUIRED_MESSAGE,
  serializeRecurringRuleDraft,
  validateRecurringRuleDraft,
  type RecurringFormErrors
} from "./form";

const CADENCE_OPTIONS = ["weekly", "biweekly", "monthly", "quarterly", "yearly"] as const;
const CONTROL_CLASS_NAME =
  "rounded-lg border border-border-subtle bg-surface-field px-3 py-2 text-sm text-text-primary outline-none transition focus:border-accent focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg";
const ERROR_CONTROL_CLASS_NAME = "border-danger focus:border-danger";
const ERROR_TEXT_CLASS_NAME = "text-xs text-danger";
const SECTION_PANEL_CLASS =
  "rounded-2xl border border-border-subtle bg-surface-panel/85 p-4 shadow-panel";
const SUB_PANEL_CLASS = "rounded-xl border border-border-subtle bg-surface-field p-3";
const SOFT_BUTTON_CLASS =
  "rounded-lg border border-border-subtle bg-surface-field px-3 py-2 text-sm text-text-primary transition hover:bg-surface-elevated disabled:opacity-60";
const ICON_BUTTON_CLASS =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-border-subtle bg-surface-field px-3 py-2 text-sm text-text-primary transition hover:bg-surface-elevated disabled:opacity-60";
const DANGER_BUTTON_CLASS =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger transition hover:border-danger/55 hover:bg-danger-soft/80 disabled:opacity-60";
const LABEL_CLASS = "grid gap-1 text-xs uppercase tracking-wide text-text-secondary";

const RECURRING_RULE_CREATED_MESSAGE = "Recurring rule created.";
const RECURRING_RULE_UPDATED_MESSAGE = "Recurring rule updated.";
const RECURRING_RULE_PAUSED_MESSAGE = "Recurring rule paused.";
const RECURRING_RULE_RESUMED_MESSAGE = "Recurring rule resumed.";
const RECURRING_RULE_ARCHIVED_MESSAGE = "Recurring rule archived.";
const RECURRING_RULE_DELETED_MESSAGE = "Recurring rule deleted.";

const LOAD_RULES_ERROR_MESSAGE =
  "Recurring rules couldn't be loaded. Nothing changed. Refresh the page and try again.";
const LOAD_RULE_DETAIL_ERROR_MESSAGE =
  "Recurring rule details couldn't be loaded. Nothing changed. Reopen the rule and try again.";
const UPDATE_RULE_ERROR_MESSAGE =
  "Recurring rule couldn't be updated. Your current draft is still here. Check the fields and try again.";
const EVALUATE_RULE_ERROR_MESSAGE =
  "Recurring rule couldn't be evaluated. Nothing changed. Try the evaluation again.";
const PAUSE_RULE_ERROR_MESSAGE =
  "Recurring rule couldn't be paused. Nothing changed. Refresh the rule and try again.";
const RESUME_RULE_ERROR_MESSAGE =
  "Recurring rule couldn't be resumed. Nothing changed. Refresh the rule and try again.";
const ARCHIVE_RULE_ERROR_MESSAGE =
  "Recurring rule couldn't be archived. Nothing changed. Refresh the rule and try again.";
const DELETE_RULE_ERROR_MESSAGE =
  "Recurring rule couldn't be deleted. Nothing changed. Refresh the list and try again.";

type RuleStatusFilter = "all" | "active" | "paused" | "archived";

function statusBadgeClass(status: RecurringRule["status"]) {
  if (status === "paused") {
    return "inline-flex items-center gap-1 rounded-full bg-warning-soft px-2 py-1 text-xs text-warning";
  }
  if (status === "archived") {
    return "inline-flex items-center gap-1 rounded-full bg-surface-elevated px-2 py-1 text-xs text-text-secondary";
  }
  return "inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-1 text-xs text-accent";
}

function formatCadence(cadence: string) {
  return cadence.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildEvaluationSuccessMessage(matchCount: number) {
  return `Evaluation complete. ${matchCount} matches found.`;
}

function getLifecycleSuccessMessage(action: "pause" | "resume" | "archive" | "remove") {
  switch (action) {
    case "pause":
      return RECURRING_RULE_PAUSED_MESSAGE;
    case "resume":
      return RECURRING_RULE_RESUMED_MESSAGE;
    case "archive":
      return RECURRING_RULE_ARCHIVED_MESSAGE;
    default:
      return RECURRING_RULE_DELETED_MESSAGE;
  }
}

function getLifecycleErrorMessage(action: "pause" | "resume" | "archive" | "remove") {
  switch (action) {
    case "pause":
      return PAUSE_RULE_ERROR_MESSAGE;
    case "resume":
      return RESUME_RULE_ERROR_MESSAGE;
    case "archive":
      return ARCHIVE_RULE_ERROR_MESSAGE;
    default:
      return DELETE_RULE_ERROR_MESSAGE;
  }
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
  const [pageError, setPageError] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<RecurringSuggestion[]>([]);
  const [createErrors, setCreateErrors] = useState<RecurringFormErrors>({});
  const [editErrors, setEditErrors] = useState<RecurringFormErrors>({});

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

  function setRecurringPageError(error: unknown, fallback: string) {
    setPageError(getRequestFeedbackMessage(error, fallback));
  }

  function updateCreateDraft<K extends keyof typeof createDraft>(field: K, value: (typeof createDraft)[K]) {
    setCreateDraft((previous) => ({ ...previous, [field]: value }));
    if (field === "name" || field === "amount") {
      setCreateErrors((previous) => ({ ...previous, [field]: undefined }));
    }
  }

  function updateEditDraft<K extends keyof typeof editDraft>(field: K, value: (typeof editDraft)[K]) {
    setEditDraft((previous) => ({ ...previous, [field]: value }));
    if (field === "name" || field === "amount") {
      setEditErrors((previous) => ({ ...previous, [field]: undefined }));
    }
  }

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
        setPageError(null);
        return;
      }

      const preferredId =
        nextSelectedRuleId && items.some((entry) => entry.id === nextSelectedRuleId)
          ? nextSelectedRuleId
          : items[0].id;
      setSelectedRuleId(preferredId);
      setPageError(null);
    } catch (error) {
      setRecurringPageError(error, LOAD_RULES_ERROR_MESSAGE);
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
      setPageError(null);
    } catch (error) {
      setRecurringPageError(error, LOAD_RULE_DETAIL_ERROR_MESSAGE);
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

    const errors = validateRecurringRuleDraft(createDraft);
    if (errors.name || errors.amount) {
      setCreateErrors(errors);
      setPageError(null);
      return;
    }

    setSaving(true);
    setCreateErrors({});
    setPageError(null);
    try {
      const amount = Number(createDraft.amount);
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
      toast.success(RECURRING_RULE_CREATED_MESSAGE);
      await loadRules(response.recurring.id);
    } catch (error) {
      setRecurringPageError(error, CREATE_RULE_ERROR_MESSAGE);
    } finally {
      setSaving(false);
    }
  }

  async function saveRuleEdits() {
    if (!selectedRuleId) {
      return;
    }

    const errors = validateRecurringRuleDraft(editDraft);
    if (errors.name || errors.amount) {
      setEditErrors(errors);
      setPageError(null);
      return;
    }

    setSaving(true);
    setEditErrors({});
    setPageError(null);
    try {
      await api.recurrings.update(selectedRuleId, serializeRecurringRuleDraft(editDraft));
      toast.success(RECURRING_RULE_UPDATED_MESSAGE);
      await Promise.all([loadRules(selectedRuleId), loadRuleDetail(selectedRuleId)]);
    } catch (error) {
      setRecurringPageError(error, UPDATE_RULE_ERROR_MESSAGE);
    } finally {
      setSaving(false);
    }
  }

  async function evaluateRule() {
    if (!selectedRuleId) {
      return;
    }

    const errors = validateRecurringRuleDraft(editDraft);
    if (errors.name || errors.amount) {
      setEditErrors(errors);
      setPageError(null);
      return;
    }

    setSaving(true);
    setEditErrors({});
    setPageError(null);
    try {
      await api.recurrings.update(selectedRuleId, serializeRecurringRuleDraft(editDraft));
      const response = await api.recurrings.evaluate(selectedRuleId, {});
      setSelectedRule(response.evaluation.rule);
      setMatches(response.evaluation.matches);
      toast.success(buildEvaluationSuccessMessage(response.evaluation.match_count));
      await loadRules(selectedRuleId);
    } catch (error) {
      setRecurringPageError(error, EVALUATE_RULE_ERROR_MESSAGE);
    } finally {
      setSaving(false);
    }
  }

  async function runLifecycleAction(action: "pause" | "resume" | "archive" | "remove") {
    if (!selectedRuleId) {
      return;
    }

    setSaving(true);
    setPageError(null);
    try {
      if (action === "pause") {
        await api.recurrings.pause(selectedRuleId);
      } else if (action === "resume") {
        await api.recurrings.resume(selectedRuleId);
      } else if (action === "archive") {
        await api.recurrings.archive(selectedRuleId);
      } else {
        await api.recurrings.remove(selectedRuleId);
        setDeleteConfirmId(null);
        setSelectedRuleId(null);
        setSelectedRule(null);
        setMatches([]);
      }

      await loadRules(action === "remove" ? null : selectedRuleId);
      if (action !== "remove") {
        await loadRuleDetail(selectedRuleId);
      }
      toast.success(getLifecycleSuccessMessage(action));
    } catch (error) {
      setRecurringPageError(error, getLifecycleErrorMessage(action));
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
        <h2 className="text-3xl font-semibold tracking-tight text-text-primary">Recurrings</h2>
        <p className="text-text-secondary">Track recurring rules and their linked transaction patterns.</p>
      </header>

      {pageError ? (
        <StatusMessage tone="error">{pageError}</StatusMessage>
      ) : null}

      <RecurringTotalsBand rules={rules} />

      <SuggestionsSection
        suggestions={suggestions}
        onSuggestionHandled={() => {
          void loadSuggestions();
          void loadRules(selectedRuleId);
        }}
      />

      <section className={SECTION_PANEL_CLASS}>
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="text-sm font-medium text-text-primary">Recurring list</h3>
            <p className="text-xs text-text-muted">Filter and manage lifecycle actions in one place.</p>
          </div>
          <label className="text-xs uppercase tracking-wide text-text-secondary">
            Status
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as RuleStatusFilter)}
              className="ml-2 rounded-lg border border-border-subtle bg-surface-field px-2 py-1 text-xs text-text-primary"
              data-testid="recurrings-status-filter"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="archived">Archived</option>
            </select>
          </label>
        </div>

        <form onSubmit={createRule} className="mb-4 grid gap-2 rounded-xl border border-border-subtle bg-surface-field p-3 md:grid-cols-[1.2fr_1fr_1fr_1fr_auto]">
          <div className="flex flex-col gap-1">
            <input
              value={createDraft.name}
              onChange={(event) => updateCreateDraft("name", event.target.value)}
              placeholder="Rule name"
              aria-label="Recurring rule name"
              aria-invalid={createErrors.name ? true : undefined}
              aria-describedby={createErrors.name ? "recurrings-create-name-error" : undefined}
              className={cn(CONTROL_CLASS_NAME, createErrors.name && ERROR_CONTROL_CLASS_NAME)}
              data-testid="recurrings-create-name"
            />
            {createErrors.name ? (
              <span
                id="recurrings-create-name-error"
                className={ERROR_TEXT_CLASS_NAME}
                data-testid="recurrings-create-name-error"
              >
                {createErrors.name}
              </span>
            ) : null}
          </div>
          <select
            value={createDraft.cadence}
            onChange={(event) => updateCreateDraft("cadence", event.target.value as (typeof CADENCE_OPTIONS)[number])}
            aria-label="Recurring rule cadence"
            className={CONTROL_CLASS_NAME}
            data-testid="recurrings-create-cadence"
          >
            {CADENCE_OPTIONS.map((option) => (
              <option key={option} value={option}>{formatCadence(option)}</option>
            ))}
          </select>
          <div className="flex flex-col">
            <input
              value={createDraft.amount}
              onChange={(event) => updateCreateDraft("amount", event.target.value)}
              placeholder="Amount"
              inputMode="decimal"
              aria-label="Recurring rule amount"
              aria-invalid={createErrors.amount ? true : undefined}
              aria-describedby={createErrors.amount ? "recurrings-create-amount-error" : undefined}
              className={cn(CONTROL_CLASS_NAME, createErrors.amount && ERROR_CONTROL_CLASS_NAME)}
              data-testid="recurrings-create-amount"
            />
            {createErrors.amount ? (
              <span
                id="recurrings-create-amount-error"
                className={cn(ERROR_TEXT_CLASS_NAME, "mt-1")}
                data-testid="recurrings-create-amount-error"
              >
                {createErrors.amount}
              </span>
            ) : null}
          </div>
          <select
            value={createDraft.direction}
            onChange={(event) => updateCreateDraft("direction", event.target.value as "" | "outflow" | "inflow")}
            aria-label="Recurring rule direction"
            className={CONTROL_CLASS_NAME}
            data-testid="recurrings-create-direction"
          >
            <option value="">Any direction</option>
            <option value="outflow">Outflow</option>
            <option value="inflow">Inflow</option>
          </select>
          <button
            type="submit"
            disabled={saving}
            className={ICON_BUTTON_CLASS}
            data-testid="recurrings-create-submit"
          >
            <Plus className="h-4 w-4" />
            Create
          </button>
        </form>

        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-3" data-testid="recurrings-list-panel">
            {loading ? (
              <p className="rounded-xl border border-border-subtle bg-surface-field px-3 py-3 text-sm text-text-secondary">Loading recurring rules...</p>
            ) : rules.length ? (
              rules.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setSelectedRuleId(entry.id)}
                  className={
                    entry.id === selectedRuleId
                      ? "w-full rounded-xl border border-accent/40 bg-surface-elevated px-3 py-3 text-left"
                      : "w-full rounded-xl border border-border-subtle bg-surface-field px-3 py-3 text-left transition hover:bg-surface-elevated"
                  }
                  data-testid={`recurring-row-${entry.id}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-text-primary">{entry.name}</p>
                      <p className="text-xs text-text-secondary">{formatCadence(entry.cadence)} · {money(entry.amount)}</p>
                    </div>
                    <span className={statusBadgeClass(entry.status)}>
                      {entry.status === "paused" ? <PauseCircle className="h-3.5 w-3.5" /> : <Repeat2 className="h-3.5 w-3.5" />}
                      {entry.status}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-text-muted">{entry.linked_transaction_count} linked transaction(s)</p>
                </button>
              ))
            ) : (
              <p className="rounded-xl border border-border-subtle bg-surface-field px-3 py-3 text-sm text-text-secondary">
                No recurring rules yet. Create one above.
              </p>
            )}
          </div>

          <div className={SUB_PANEL_CLASS} data-testid="recurrings-detail-panel">
            {selectedRule ? (
              <div className="space-y-4">
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  <label className={LABEL_CLASS}>
                    Name
                    <input
                      value={editDraft.name}
                      onChange={(event) => updateEditDraft("name", event.target.value)}
                      aria-invalid={editErrors.name ? true : undefined}
                      aria-describedby={editErrors.name ? "recurrings-edit-name-error" : undefined}
                      className={cn(CONTROL_CLASS_NAME, editErrors.name && ERROR_CONTROL_CLASS_NAME)}
                      data-testid="recurrings-edit-name"
                    />
                    {editErrors.name ? (
                      <span
                        id="recurrings-edit-name-error"
                        className={ERROR_TEXT_CLASS_NAME}
                        data-testid="recurrings-edit-name-error"
                      >
                        {editErrors.name}
                      </span>
                    ) : null}
                  </label>
                  <label className={LABEL_CLASS}>
                    Cadence
                    <select
                      value={editDraft.cadence}
                      onChange={(event) => updateEditDraft("cadence", event.target.value as (typeof CADENCE_OPTIONS)[number])}
                      className={CONTROL_CLASS_NAME}
                      data-testid="recurrings-edit-cadence"
                    >
                      {CADENCE_OPTIONS.map((option) => (
                        <option key={option} value={option}>{formatCadence(option)}</option>
                      ))}
                    </select>
                  </label>
                  <label className={LABEL_CLASS}>
                    Amount
                    <input
                      value={editDraft.amount}
                      onChange={(event) => updateEditDraft("amount", event.target.value)}
                      inputMode="decimal"
                      aria-invalid={editErrors.amount ? true : undefined}
                      aria-describedby={editErrors.amount ? "recurrings-edit-amount-error" : undefined}
                      className={cn(CONTROL_CLASS_NAME, editErrors.amount && ERROR_CONTROL_CLASS_NAME)}
                      data-testid="recurrings-edit-amount"
                    />
                    {editErrors.amount ? (
                      <span
                        id="recurrings-edit-amount-error"
                        className={ERROR_TEXT_CLASS_NAME}
                        data-testid="recurrings-edit-amount-error"
                      >
                        {editErrors.amount}
                      </span>
                    ) : null}
                  </label>
                  <label className={LABEL_CLASS}>
                    Merchant pattern
                    <input
                      value={editDraft.merchant_pattern}
                      onChange={(event) => updateEditDraft("merchant_pattern", event.target.value)}
                      className={CONTROL_CLASS_NAME}
                      data-testid="recurrings-edit-pattern"
                    />
                  </label>
                  <label className={LABEL_CLASS}>
                    Category
                    <select
                      value={editDraft.category_final}
                      onChange={(event) => updateEditDraft("category_final", event.target.value)}
                      className={CONTROL_CLASS_NAME}
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
                  <label className={LABEL_CLASS}>
                    Account
                    <select
                      value={editDraft.account_id}
                      onChange={(event) => updateEditDraft("account_id", event.target.value)}
                      className={CONTROL_CLASS_NAME}
                      data-testid="recurrings-edit-account"
                    >
                      <option value="">Any account</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>{a.displayName}</option>
                      ))}
                    </select>
                  </label>
                  <label className={LABEL_CLASS}>
                    Direction
                    <select
                      value={editDraft.direction}
                      onChange={(event) => updateEditDraft("direction", event.target.value as "" | "outflow" | "inflow")}
                      className={CONTROL_CLASS_NAME}
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
                    className={SOFT_BUTTON_CLASS}
                    data-testid="recurrings-save"
                  >
                    Save edits
                  </button>
                  <button
                    type="button"
                    onClick={() => void evaluateRule()}
                    disabled={saving}
                    className={SOFT_BUTTON_CLASS}
                    data-testid="recurrings-evaluate"
                  >
                    Evaluate links
                  </button>
                  {selectedRule.status === "active" ? (
                    <button
                      type="button"
                      onClick={() => void runLifecycleAction("pause")}
                      disabled={saving}
                      className={ICON_BUTTON_CLASS}
                      data-testid="recurrings-pause"
                    >
                      <PauseCircle className="h-4 w-4" /> Pause
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void runLifecycleAction("resume")}
                      disabled={saving || selectedRule.status === "archived"}
                      className={ICON_BUTTON_CLASS}
                      data-testid="recurrings-resume"
                    >
                      <PlayCircle className="h-4 w-4" /> Resume
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void runLifecycleAction("archive")}
                    disabled={saving || selectedRule.status === "archived"}
                    className={ICON_BUTTON_CLASS}
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
                        className={DANGER_BUTTON_CLASS}
                        data-testid="recurrings-delete-confirm"
                      >
                        Confirm delete?
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(null)}
                        disabled={saving}
                        className={ICON_BUTTON_CLASS}
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
                      className={DANGER_BUTTON_CLASS}
                      data-testid="recurrings-delete"
                    >
                      <Trash2 className="h-4 w-4" /> Delete
                    </button>
                  )}
                </div>

                <div className="grid gap-2 text-xs text-text-secondary sm:grid-cols-2">
                  <p>Next run: <span className="text-text-primary">{selectedRule.next_run_at || "Not scheduled"}</span></p>
                  <p>Last evaluated: <span className="text-text-primary">{selectedRule.last_evaluated_at || "Never"}</span></p>
                </div>

                <section className="rounded-lg border border-border-subtle bg-surface-panel/85 p-3" data-testid="recurrings-linked-transactions">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-text-primary">
                    <Link2 className="h-4 w-4 text-text-secondary" />
                    Linked Transactions
                  </div>

                  {matches.length ? (
                    <div className="space-y-2">
                      {matches.map((entry) => (
                        <Link
                          key={entry.id}
                          href={`/transactions?recurring_rule_id=${selectedRuleId}`}
                          className="flex items-center justify-between rounded-md bg-surface-field px-3 py-2 text-sm text-text-secondary transition hover:bg-surface-elevated"
                        >
                          <span>{entry.transaction_date} · {entry.merchant_raw}</span>
                          <span className="font-medium text-text-primary">{money(entry.amount)}</span>
                        </Link>
                      ))}
                    </div>
                  ) : selectedLinkedIds.length ? (
                    <div className="space-y-2">
                      {selectedLinkedIds.map((transactionId) => (
                        <p key={transactionId} className="rounded-md bg-surface-field px-3 py-2 text-sm text-text-secondary">
                          {transactionId}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-text-secondary">No linked transactions yet. Run evaluation to refresh links.</p>
                  )}
                </section>
              </div>
            ) : (
              <p className="text-sm text-text-secondary">Select a recurring rule to inspect details and lifecycle actions.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
