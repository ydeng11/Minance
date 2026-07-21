"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type MouseEvent as ReactMouseEvent } from "react";
import { Archive, ChevronDown, Loader2, Plus, Save, Trash2, Undo2, X } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { useApi } from "@/hooks/useApi";
import type { Account, AccountClassMetadata } from "@/lib/api/types";
import { StatusMessage } from "@/components/feedback/StatusMessage";
import { getDialogFocusableElements, trapDialogTabKey } from "@/lib/dialogFocus";
import { CardFace } from "./CardFace";
import { CardDetailsSection } from "./CardDetailsSection";
import {
  createDefaultManualAccountDraft,
  hasManualDraftChanges,
  validateManualAccountDraft,
  type ManualAccountDraft,
  type ManualAccountErrors
} from "./wizard";
import { formatAccountTypeLabel } from "./accountFormatting";
import { INSTITUTION_PRESETS, getCardPresetsForInstitution, getPresetMetadata } from "./presets";
import { SearchableSelect } from "./SearchableSelect";
import { createDefaultClassMetadata } from "../../../../../packages/domain/src/accounts";
import { resolveSupportedAccountTypes } from "./accountTypes";

interface AccountSettingsDraft {
  sourceInstitution: string;
  displayName: string;
  accountType: string;
  currency: string;
  initialBalance: string;
  status: Account["status"];
  includeInCharts: boolean;
  classMetadata: AccountClassMetadata | null;
}

interface AccountSettingsErrors {
  sourceInstitution?: string;
  displayName?: string;
  accountType?: string;
  currency?: string;
  initialBalance?: string;
}

interface NormalizedAccountSettingsDraft {
  sourceInstitution: string | null;
  displayName: string;
  accountType: string;
  currency: string;
  initialBalance: number;
  status: Account["status"];
  includeInCharts: boolean;
  classMetadata: AccountClassMetadata | null;
}

const SECTION_PANEL_CLASS =
  "rounded-2xl border border-border-subtle bg-surface-panel/85 p-4 shadow-panel";
const DIALOG_PANEL_CLASS =
  "w-full max-w-2xl rounded-2xl border border-border-subtle bg-surface-panel shadow-dialog";
const DIALOG_HEADER_CLASS = "flex items-start justify-between gap-3 border-b border-border-subtle px-5 py-4";
const DIALOG_BACKDROP_CLASS = "fixed inset-0 z-50 flex items-center justify-center bg-app-bg/80 p-4 backdrop-blur-sm";
const FIELD_CLASS =
  "rounded-md border border-border-subtle bg-surface-field px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-accent focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg";
const FIELD_ERROR_CLASS = "text-xs text-danger";
const SECONDARY_BUTTON_CLASS =
  "inline-flex min-h-[44px] items-center justify-center rounded-md border border-border-strong px-3 py-2 text-sm text-text-secondary transition hover:border-accent/40 hover:text-text-primary";
const PRIMARY_BUTTON_CLASS =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md border border-accent/40 bg-accent-soft px-3 py-2 text-sm font-medium text-accent transition hover:border-accent/60 disabled:cursor-not-allowed disabled:opacity-60";
const CLOSE_BUTTON_CLASS =
  "inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-border-subtle bg-surface-field p-2 text-text-muted transition hover:text-text-primary";
const WARNING_ACTION_BUTTON_CLASS =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md border border-warning/35 bg-warning-soft px-3 py-2 text-sm text-warning transition hover:border-warning/55 disabled:cursor-not-allowed disabled:opacity-60";
const DANGER_ACTION_BUTTON_CLASS =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md border border-danger/35 bg-danger-soft px-3 py-2 text-sm text-danger transition hover:border-danger/55 disabled:cursor-not-allowed disabled:opacity-60";
const DANGER_CONFIRM_BUTTON_CLASS =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md border border-danger bg-danger px-3 py-2 text-sm font-medium text-app-bg transition hover:bg-danger/90 disabled:cursor-not-allowed disabled:opacity-60";
const DANGER_ALERT_CLASS = "rounded-lg border border-danger/35 bg-danger-soft px-3 py-2 text-sm text-danger";
const DANGER_CONFIRM_PANEL_CLASS =
  "rounded-lg border border-danger/35 bg-danger-soft px-3 py-3 text-sm text-danger";

function accountBadge(status: string, hidden: boolean): { label: string; classes: string } | null {
  if (status === "closed") {
    return { label: "Closed", classes: "bg-danger-soft text-danger" };
  }
  if (hidden) {
    return { label: "Hidden", classes: "bg-warning-soft text-warning" };
  }
  return null;
}

function formatBalance(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: String(currency || "USD").toUpperCase()
    }).format(Number(amount || 0));
  } catch {
    return `${Number(amount || 0).toFixed(2)} ${String(currency || "USD").toUpperCase()}`;
  }
}

function createAccountSettingsDraft(account: Account): AccountSettingsDraft {
  return {
    sourceInstitution: account.sourceInstitution || "",
    displayName: account.displayName,
    accountType: account.accountType,
    currency: account.currency,
    initialBalance: String(account.initialBalance),
    status: account.status,
    includeInCharts: account.includeInCharts,
    classMetadata: account.classMetadata ?? null
  };
}

function validateAccountSettingsDraft(draft: AccountSettingsDraft): { errors: AccountSettingsErrors; normalized: NormalizedAccountSettingsDraft | null } {
  const sourceInstitution = draft.sourceInstitution.trim();
  const displayName = draft.displayName.trim();
  const accountType = draft.accountType.trim();
  const currency = draft.currency.trim().toUpperCase();
  const initialBalanceRaw = draft.initialBalance.trim();
  const errors: AccountSettingsErrors = {};

  if (!sourceInstitution) {
    errors.sourceInstitution = "Institution is required.";
  }
  if (displayName.length < 2) {
    errors.displayName = "Account name is required.";
  }
  if (!accountType) {
    errors.accountType = "Account type is required.";
  }
  if (!/^[A-Z]{3}$/.test(currency)) {
    errors.currency = "Currency must be a 3-letter code.";
  }

  const parsedBalance = Number(initialBalanceRaw);
  if (!Number.isFinite(parsedBalance)) {
    errors.initialBalance = "Starting balance must be numeric.";
  }

  if (Object.keys(errors).length > 0) {
    return {
      errors,
      normalized: null
    };
  }

  return {
    errors: {},
    normalized: {
      sourceInstitution: sourceInstitution || null,
      displayName,
      accountType,
      currency,
      initialBalance: parsedBalance,
      status: draft.status,
      includeInCharts: draft.includeInCharts,
      classMetadata: draft.classMetadata
    }
  };
}

function hasSettingsDraftChanges(account: Account, draft: AccountSettingsDraft) {
  const initialBalance = Number(draft.initialBalance.trim());
  return (
    account.sourceInstitution !== (draft.sourceInstitution.trim() || null) ||
    account.displayName !== draft.displayName.trim() ||
    account.accountType !== draft.accountType.trim() ||
    account.currency !== draft.currency.trim().toUpperCase() ||
    !Number.isFinite(initialBalance) ||
    Number(account.initialBalance) !== initialBalance ||
    account.status !== draft.status ||
    account.includeInCharts !== draft.includeInCharts ||
    JSON.stringify(account.classMetadata ?? null) !== JSON.stringify(draft.classMetadata)
  );
}

export default function AccountsPage() {
  const api = useApi();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountTypes, setAccountTypes] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [manualDraft, setManualDraft] = useState<ManualAccountDraft>(() => createDefaultManualAccountDraft());
  const [manualErrors, setManualErrors] = useState<ManualAccountErrors>({});
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"info" | "error">("info");
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [settingsDraft, setSettingsDraft] = useState<AccountSettingsDraft | null>(null);
  const [settingsErrors, setSettingsErrors] = useState<AccountSettingsErrors>({});
  const [settingsError, setSettingsError] = useState("");
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isUpdatingAccountState, setIsUpdatingAccountState] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isWizardCloseConfirmOpen, setIsWizardCloseConfirmOpen] = useState(false);
  const wizardDialogRef = useRef<HTMLElement | null>(null);
  const settingsDialogRef = useRef<HTMLElement | null>(null);
  const lastFocusedElementRef = useRef<HTMLElement | null>(null);

  const supportedAccountTypes = useMemo(
    () => resolveSupportedAccountTypes(accountTypes),
    [accountTypes]
  );
  const knownInstitutions = useMemo(
    () => {
      const dynamic = new Set(
        accounts.map((entry) => entry.sourceInstitution).filter(Boolean) as string[]
      );
      for (const inst of INSTITUTION_PRESETS) {
        dynamic.add(inst);
      }
      return Array.from(dynamic).sort((a, b) => a.localeCompare(b));
    },
    [accounts]
  );

  const groupedAccounts = useMemo(() => {
    const groups = new Map<string, Account[]>();
    const other: Account[] = [];

    for (const account of accounts) {
      const inst = account.sourceInstitution?.trim();
      if (inst) {
        const list = groups.get(inst);
        if (list) {
          list.push(account);
        } else {
          groups.set(inst, [account]);
        }
      } else {
        other.push(account);
      }
    }

    const result: { institution: string; accounts: Account[] }[] = [];
    for (const inst of knownInstitutions) {
      const list = groups.get(inst);
      if (list) {
        result.push({ institution: inst, accounts: list });
      }
    }
    if (other.length) {
      result.push({ institution: "Other", accounts: other });
    }

    return result;
  }, [accounts, knownInstitutions]);

  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  function toggleSection(institution: string) {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(institution)) {
        next.delete(institution);
      } else {
        next.add(institution);
      }
      return next;
    });
  }

  const resetWizardState = useCallback(() => {
    setManualDraft(createDefaultManualAccountDraft());
    setManualErrors({});
  }, []);

  const loadAccountsPage = useCallback(async () => {
    setIsLoading(true);
    try {
      const [accountsResponse, accountTypesResponse] = await Promise.all([
        api.accounts.list(),
        api.accounts.supportedAccountTypes()
      ]);

      setAccounts(accountsResponse.accounts || []);
      setAccountTypes(accountTypesResponse.accountTypes || []);
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Failed to load accounts.");
      setMessageTone("error");
    } finally {
      setIsLoading(false);
    }
  }, [api.accounts]);

  useEffect(() => {
    void loadAccountsPage();
  }, [loadAccountsPage]);

  const focusDialogFirstElement = useCallback((dialog: HTMLElement | null) => {
    const focusable = getDialogFocusableElements(dialog);
    const target = focusable[0] ?? dialog;
    target?.focus();
  }, []);

  const rememberFocusedElement = useCallback(() => {
    if (typeof document === "undefined") {
      return;
    }

    lastFocusedElementRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }, []);

  const restoreFocusAfterDialogClose = useCallback(() => {
    if (typeof document === "undefined") {
      return;
    }

    requestAnimationFrame(() => {
      const target = lastFocusedElementRef.current;
      if (target && document.contains(target)) {
        target.focus();
      }
      lastFocusedElementRef.current = null;
    });
  }, []);

  const openWizard = useCallback(() => {
    rememberFocusedElement();
    resetWizardState();
    setIsWizardOpen(true);
  }, [rememberFocusedElement, resetWizardState]);

  const closeWizard = useCallback((force = false) => {
    if (!force && hasManualDraftChanges(manualDraft)) {
      setIsWizardCloseConfirmOpen(true);
      return;
    }
    setIsWizardOpen(false);
    setIsWizardCloseConfirmOpen(false);
    resetWizardState();
    restoreFocusAfterDialogClose();
  }, [manualDraft, resetWizardState, restoreFocusAfterDialogClose]);

  function confirmDiscardWizard() {
    setIsWizardOpen(false);
    setIsWizardCloseConfirmOpen(false);
    resetWizardState();
    restoreFocusAfterDialogClose();
  }

  function cancelDiscardWizard() {
    setIsWizardCloseConfirmOpen(false);
  }

  function handleWizardBackdropClick(event: ReactMouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      closeWizard();
    }
  }

  function updateManualDraft(field: keyof ManualAccountDraft, value: string) {
    setManualDraft((previous) => ({
      ...previous,
      [field]: value
    }));
    if (manualErrors[field]) {
      setManualErrors((previous) => ({
        ...previous,
        [field]: undefined
      }));
    }
  }

  function handleCardPresetSelect(cardName: string) {
    setManualDraft((previous) => {
      if (!cardName) {
        // Custom — clear any preset-derived classMetadata
        return {
          ...previous,
          selectedCardPreset: "",
          classMetadata: createDefaultClassMetadata(previous.accountType)
        };
      }
      const preset = getPresetMetadata(previous.sourceInstitution, cardName);
      if (preset) {
        return {
          ...previous,
          selectedCardPreset: cardName,
          displayName: cardName,
          accountType: preset.accountType,
          classMetadata: {
            type: "credit",
            credit: {
              annualFee: preset.annualFee,
              activationDate: null,
              lastRenewalDate: null,
              renewalCycleMonths: 12,
              benefits: preset.benefits.map((b) => ({
                id: "",
                name: b.name,
                monetaryValue: b.monetaryValue,
                used: false,
                lastUsedDate: null
              }))
            }
          }
        };
      }
      // Name-only preset (no metadata) — fill name, default credit metadata
      return {
        ...previous,
        selectedCardPreset: cardName,
        displayName: cardName,
        classMetadata: createDefaultClassMetadata(previous.accountType || "credit")
      };
    });
  }

  function handleAccountTypeChange(type: string) {
    setManualDraft((previous) => ({
      ...previous,
      accountType: type,
      classMetadata: createDefaultClassMetadata(type)
    }));
    if (manualErrors.accountType) {
      setManualErrors((prev) => ({ ...prev, accountType: undefined }));
    }
  }

  async function submitManualAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const validation = validateManualAccountDraft(manualDraft, supportedAccountTypes);
    setManualErrors(validation.errors);
    if (!validation.normalized) {
      return;
    }

    setIsSubmittingManual(true);
    try {
      await api.accounts.create(validation.normalized);
      setMessage(`Account "${validation.normalized.displayName}" added.`);
      setMessageTone("info");
      setIsWizardOpen(false);
      resetWizardState();
      restoreFocusAfterDialogClose();
      await loadAccountsPage();
    } catch (error) {
      const nextMessage = error instanceof ApiError ? error.message : "Failed to create account.";
      const normalizedMessage = nextMessage.toLowerCase();
      if (normalizedMessage.includes("already exists")) {
        setManualErrors((previous) => ({
          ...previous,
          displayName: "Account name already exists."
        }));
      }
      if (normalizedMessage.includes("account type")) {
        setManualErrors((previous) => ({
          ...previous,
          accountType: "Account type is invalid."
        }));
      }
      setMessage(nextMessage);
      setMessageTone("error");
    } finally {
      setIsSubmittingManual(false);
    }
  }

  function upsertAccountInList(account: Account) {
    setAccounts((previous) => {
      let found = false;
      const next = previous.map((entry) => {
        if (entry.id !== account.id) {
          return entry;
        }
        found = true;
        return account;
      });
      if (!found) {
        next.push(account);
      }
      return next.sort((left, right) => left.displayName.localeCompare(right.displayName));
    });
  }

  const openAccountSettings = useCallback((account: Account) => {
    rememberFocusedElement();
    setMessage("");
    setSettingsError("");
    setSettingsErrors({});
    setIsDeleteConfirmOpen(false);
    setEditingAccount(account);
    setSettingsDraft(createAccountSettingsDraft(account));
    setIsSettingsOpen(true);
  }, [rememberFocusedElement]);

  const closeAccountSettings = useCallback((force = false) => {
    if (!force && editingAccount && settingsDraft && typeof window !== "undefined") {
      const shouldConfirm = hasSettingsDraftChanges(editingAccount, settingsDraft);
      if (shouldConfirm && !window.confirm("Discard account setting changes?")) {
        return;
      }
    }

    setIsSettingsOpen(false);
    setEditingAccount(null);
    setSettingsDraft(null);
    setSettingsErrors({});
    setSettingsError("");
    setIsSavingSettings(false);
    setIsUpdatingAccountState(false);
    setIsDeletingAccount(false);
    setIsDeleteConfirmOpen(false);
    restoreFocusAfterDialogClose();
  }, [editingAccount, restoreFocusAfterDialogClose, settingsDraft]);

  useEffect(() => {
    const dialogRef = isWizardOpen ? wizardDialogRef : isSettingsOpen ? settingsDialogRef : null;
    const dialog = dialogRef?.current;
    if (!dialogRef || !dialog) {
      return;
    }
    const activeDialogRef = dialogRef;

    requestAnimationFrame(() => {
      if (!dialog.contains(document.activeElement)) {
        focusDialogFirstElement(dialog);
      }
    });

    function closeActiveDialog() {
      if (isWizardOpen) {
        closeWizard();
        return;
      }
      closeAccountSettings();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeActiveDialog();
        return;
      }

      const activeDialog = activeDialogRef.current;
      trapDialogTabKey(event, activeDialog);
    }

    function onFocusIn(event: FocusEvent) {
      const activeDialog = activeDialogRef.current;
      const target = event.target as Node | null;
      if (!activeDialog || !target || activeDialog.contains(target)) {
        return;
      }

      focusDialogFirstElement(activeDialog);
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, [closeAccountSettings, closeWizard, focusDialogFirstElement, isSettingsOpen, isWizardOpen]);

  function updateSettingsDraftField<Key extends keyof AccountSettingsDraft>(field: Key, value: AccountSettingsDraft[Key]) {
    setSettingsDraft((previous) => {
      if (!previous) {
        return previous;
      }
      return {
        ...previous,
        [field]: value
      };
    });
    setSettingsErrors((previous) => ({
      ...previous,
      [field]: undefined
    }));
    setSettingsError("");
    setIsDeleteConfirmOpen(false);
  }

  async function saveAccountSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingAccount || !settingsDraft) {
      return;
    }

    const validation = validateAccountSettingsDraft(settingsDraft);
    setSettingsErrors(validation.errors);
    if (!validation.normalized) {
      return;
    }

    setIsSavingSettings(true);
    setSettingsError("");

    try {
      const response = await api.accounts.update(editingAccount.id, {
        ...validation.normalized,
        expectedVersion: editingAccount.version
      });

      upsertAccountInList(response.account);
      setEditingAccount(response.account);
      setSettingsDraft(createAccountSettingsDraft(response.account));
      setMessage(`Account "${response.account.displayName}" updated.`);
      setMessageTone("info");
    } catch (error) {
      const nextMessage = error instanceof ApiError ? error.message : "Failed to update account settings.";
      setSettingsError(nextMessage);
      setMessageTone("error");
    } finally {
      setIsSavingSettings(false);
    }
  }

  async function toggleAccountHidden() {
    if (!editingAccount) return;

    setIsUpdatingAccountState(true);
    setSettingsError("");

    try {
      const response = await api.accounts.updateSettings(editingAccount.id, {
        hidden: !editingAccount.hidden,
        expectedVersion: editingAccount.version
      });
      upsertAccountInList(response.account);
      setEditingAccount(response.account);
      setSettingsDraft(createAccountSettingsDraft(response.account));
      const label = response.account.hidden ? "hidden" : "unhidden";
      setMessage(`Account "${response.account.displayName}" ${label}.`);
      setMessageTone("info");
    } catch (error) {
      setSettingsError(error instanceof ApiError ? error.message : "Failed to update account.");
    } finally {
      setIsUpdatingAccountState(false);
    }
  }

  async function toggleAccountClosed() {
    if (!editingAccount) return;

    const nextStatus = editingAccount.status === "active" ? "closed" : "active";
    const verb = nextStatus === "closed" ? "close" : "restore";
    if (typeof window !== "undefined" && !window.confirm(`Confirm ${verb} action for "${editingAccount.displayName}"?`)) {
      return;
    }

    setIsUpdatingAccountState(true);
    setSettingsError("");

    try {
      const response = await api.accounts.updateSettings(editingAccount.id, {
        status: nextStatus,
        expectedVersion: editingAccount.version
      });
      upsertAccountInList(response.account);
      setEditingAccount(response.account);
      setSettingsDraft(createAccountSettingsDraft(response.account));
      setMessage(`Account "${response.account.displayName}" status set to ${response.account.status}.`);
      setMessageTone("info");
    } catch (error) {
      setSettingsError(error instanceof ApiError ? error.message : "Failed to update account.");
    } finally {
      setIsUpdatingAccountState(false);
    }
  }

  function requestDeleteEditingAccount() {
    setSettingsError("");
    setIsDeleteConfirmOpen(true);
  }

  async function confirmDeleteEditingAccount() {
    if (!editingAccount) {
      return;
    }

    setIsDeletingAccount(true);
    setSettingsError("");

    try {
      await api.accounts.remove(editingAccount.id);
      setAccounts((previous) => previous.filter((entry) => entry.id !== editingAccount.id));
      setMessage(`Account "${editingAccount.displayName}" deleted.`);
      setMessageTone("info");
      closeAccountSettings(true);
    } catch (error) {
      setSettingsError(error instanceof ApiError ? error.message : "Failed to delete account.");
    } finally {
      setIsDeletingAccount(false);
      setIsDeleteConfirmOpen(false);
    }
  }

  return (
    <div className="space-y-6" data-testid="accounts-page">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-text-primary">Accounts</h2>
          <p className="text-text-secondary">Manage manual accounts across your workspace.</p>
        </div>
        <button
          type="button"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-border-subtle bg-surface-field px-3 py-2 text-sm font-medium text-text-primary transition hover:border-accent/40 hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
          data-testid="accounts-add"
          onClick={openWizard}
          disabled={isLoading}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add account
        </button>
      </header>

      {message ? (
        <StatusMessage
          tone={messageTone}
          data-testid={messageTone === "error" ? "accounts-error" : "global-message"}
        >
          {message}
        </StatusMessage>
      ) : null}

      {isLoading ? (
        <section className={`${SECTION_PANEL_CLASS} text-sm text-text-secondary`} data-testid="accounts-skeleton">
          Loading accounts…
        </section>
      ) : (
        <section className={SECTION_PANEL_CLASS}>
          <h3 className="text-sm font-medium text-text-primary">Connected accounts</h3>
          {accounts.length ? (
            <div className="mt-3 space-y-4">
              {groupedAccounts.map(({ institution, accounts: groupAccounts }) => {
                const isCollapsed = collapsedSections.has(institution);
                return (
                  <section key={institution}>
                    <button
                      type="button"
                      className="flex items-center gap-2 text-sm font-medium text-text-primary"
                      onClick={() => toggleSection(institution)}
                    >
                      <ChevronDown
                        className={`h-4 w-4 transition-transform duration-200 ${isCollapsed ? "-rotate-90" : ""}`}
                        aria-hidden="true"
                      />
                      {institution}
                      <span className="text-xs text-text-secondary">({groupAccounts.length})</span>
                    </button>
                    {!isCollapsed && (
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        {groupAccounts.map((entry) => (
                          <article
                            key={entry.id}
                            className="relative cursor-pointer rounded-xl overflow-hidden aspect-[280/176]"
                            data-testid={`account-row-${entry.id}`}
                            onClick={() => openAccountSettings(entry)}
                          >
                            <CardFace
                              sourceInstitution={entry.sourceInstitution}
                              accountType={entry.accountType}
                              displayName={entry.displayName}
                              cover
                            />
                            {/* Gradient overlay for text readability */}
                            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                            {/* Account name + balance */}
                            <div className="pointer-events-none absolute bottom-0 left-0 right-0 flex items-end justify-between gap-3 p-4">
                              <p className="text-lg font-semibold text-white">{entry.displayName}</p>
                              <span className="text-lg font-semibold text-white">{formatBalance(entry.initialBalance, entry.currency)}</span>
                            </div>
                            {(() => {
                              const badge = accountBadge(entry.status, entry.hidden);
                              return badge ? (
                                <span className={`pointer-events-none absolute right-3 top-3 rounded-full px-2 py-0.5 text-xs ${badge.classes}`}>
                                  {badge.label}
                                </span>
                              ) : null;
                            })()}
                          </article>
                        ))}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          ) : (
            <p className="mt-3 rounded-lg border border-dashed border-border-subtle bg-surface-field px-3 py-4 text-sm text-text-secondary">
              No accounts yet. Use <strong className="text-text-primary">Add account</strong> to create one manually.
            </p>
          )}
        </section>
      )}

      <p className="rounded-lg border border-border-subtle bg-surface-field px-3 py-2 text-sm text-text-secondary">
        Use account <strong className="text-text-primary">Manage</strong> actions for rename/type/state updates, and use{" "}
        <Link href="/transactions" className="text-accent underline decoration-accent/50 underline-offset-2">
          transactions
        </Link>{" "}
        to validate account activity after onboarding.
      </p>

      {isWizardOpen ? (
        <div className={DIALOG_BACKDROP_CLASS} onClick={handleWizardBackdropClick}>
          <section
            ref={wizardDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-account-wizard-title"
            tabIndex={-1}
            data-testid="accounts-wizard"
            className={DIALOG_PANEL_CLASS}
          >
            <header className={DIALOG_HEADER_CLASS}>
              <div>
                <h3 id="add-account-wizard-title" className="text-lg font-semibold text-text-primary">Add account</h3>
                <p className="text-sm text-text-secondary">Create an account with institution, type, and starting balance.</p>
              </div>
              <button
                type="button"
                className={CLOSE_BUTTON_CLASS}
                data-testid="accounts-wizard-close"
                onClick={() => closeWizard()}
              >
                <span className="sr-only">Close</span>
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </header>

            <div className="space-y-4 px-5 py-4">
              <p className="text-xs font-medium uppercase tracking-wide text-accent">Manual setup</p>
              <form className="space-y-4" data-testid="accounts-wizard-manual-form" onSubmit={submitManualAccount}>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-text-primary">Institution</label>
                    <SearchableSelect
                      options={knownInstitutions.map((i) => ({ value: i, label: i }))}
                      value={manualDraft.sourceInstitution}
                      onChange={(val) => {
                        setManualDraft((prev) => ({
                          ...prev,
                          sourceInstitution: val,
                          selectedCardPreset: "",
                          classMetadata: createDefaultClassMetadata(prev.accountType)
                        }));
                      }}
                      placeholder="Search institution…"
                      testId="accounts-wizard-manual-institution"
                    />
                    {manualErrors.sourceInstitution ? (
                      <p className={FIELD_ERROR_CLASS}>{manualErrors.sourceInstitution}</p>
                    ) : null}
                  </div>

                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-text-primary">Card preset</label>
                    <SearchableSelect
                      options={getCardPresetsForInstitution(manualDraft.sourceInstitution).map(
                        (p) => ({ value: p.name, label: p.name })
                      )}
                      value={manualDraft.selectedCardPreset}
                      onChange={handleCardPresetSelect}
                      placeholder="Select a card or type custom…"
                      testId="accounts-wizard-card-preset"
                      showCustom
                    />
                  </div>

                  <div className="grid gap-2">
                    <label htmlFor="accounts-manual-name" className="text-sm font-medium text-text-primary">Account name</label>
                    <input
                      id="accounts-manual-name"
                      data-testid="accounts-wizard-manual-name"
                      type="text"
                      value={manualDraft.displayName}
                      onChange={(event) => updateManualDraft("displayName", event.target.value)}
                      className={FIELD_CLASS}
                      placeholder="e.g. Travel Card"
                    />
                    {manualErrors.displayName ? (
                      <p className={FIELD_ERROR_CLASS}>{manualErrors.displayName}</p>
                    ) : null}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <label className="text-sm font-medium text-text-primary">Account type</label>
                      <SearchableSelect
                        options={supportedAccountTypes.map((t) => ({
                          value: t,
                          label: formatAccountTypeLabel(t)
                        }))}
                        value={manualDraft.accountType}
                        onChange={handleAccountTypeChange}
                        placeholder="Select account type"
                        testId="accounts-wizard-manual-type"
                      />
                      {manualErrors.accountType ? (
                        <p className={FIELD_ERROR_CLASS}>{manualErrors.accountType}</p>
                      ) : null}
                    </div>

                    <div className="grid gap-2">
                      <label htmlFor="accounts-manual-currency" className="text-sm font-medium text-text-primary">Currency</label>
                      <input
                        id="accounts-manual-currency"
                        data-testid="accounts-wizard-manual-currency"
                        type="text"
                        maxLength={3}
                        value={manualDraft.currency}
                        onChange={(event) => updateManualDraft("currency", event.target.value.toUpperCase())}
                        className={`${FIELD_CLASS} uppercase`}
                        placeholder="USD"
                      />
                      {manualErrors.currency ? (
                        <p className={FIELD_ERROR_CLASS}>{manualErrors.currency}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <label htmlFor="accounts-manual-balance" className="text-sm font-medium text-text-primary">Starting balance</label>
                    <input
                      id="accounts-manual-balance"
                      data-testid="accounts-wizard-manual-balance"
                      type="text"
                      inputMode="decimal"
                      value={manualDraft.initialBalance}
                      onChange={(event) => updateManualDraft("initialBalance", event.target.value)}
                      className={FIELD_CLASS}
                      placeholder="0.00"
                    />
                    {manualErrors.initialBalance ? (
                      <p className={FIELD_ERROR_CLASS}>{manualErrors.initialBalance}</p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className={SECONDARY_BUTTON_CLASS}
                        onClick={() => closeWizard()}
                      >
                        Cancel
                      </button>
                    </div>
                    <button
                      type="submit"
                      data-testid="accounts-wizard-manual-save"
                      className={PRIMARY_BUTTON_CLASS}
                      disabled={isSubmittingManual}
                    >
                      {isSubmittingManual ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                      Save account
                    </button>
                  </div>

                  {isWizardCloseConfirmOpen ? (
                    <div className={DANGER_CONFIRM_PANEL_CLASS} role="alert" aria-labelledby="wizard-discard-title">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p id="wizard-discard-title" className="font-medium text-danger">
                            Discard this account setup?
                          </p>
                          <p className="mt-1 text-danger/85">
                            All entered details will be lost.
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <button
                            type="button"
                            className={SECONDARY_BUTTON_CLASS}
                            onClick={cancelDiscardWizard}
                          >
                            Keep editing
                          </button>
                          <button
                            type="button"
                            className={DANGER_CONFIRM_BUTTON_CLASS}
                            onClick={confirmDiscardWizard}
                          >
                            Discard
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </form>
            </div>
          </section>
        </div>
      ) : null}

      {isSettingsOpen && editingAccount && settingsDraft ? (
        <div className={DIALOG_BACKDROP_CLASS} onClick={(event) => {
          if (event.target === event.currentTarget) {
            closeAccountSettings();
          }
        }}>
          <section
            ref={settingsDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-settings-title"
            tabIndex={-1}
            data-testid="accounts-settings-modal"
            className={DIALOG_PANEL_CLASS}
          >
            <header className={DIALOG_HEADER_CLASS}>
              <div>
                <h3 id="account-settings-title" className="text-lg font-semibold text-text-primary">Account settings</h3>
                <p className="text-sm text-text-secondary">Rename, retype, archive, close, or delete this account.</p>
              </div>
              <button
                type="button"
                className={CLOSE_BUTTON_CLASS}
                data-testid="accounts-settings-close"
                onClick={() => closeAccountSettings()}
              >
                <span className="sr-only">Close</span>
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </header>

            <form className="space-y-4 px-5 py-4" onSubmit={(event) => void saveAccountSettings(event)}>
              <div className="grid gap-2">
                <label htmlFor="accounts-settings-institution" className="text-sm font-medium text-text-primary">Institution</label>
                <input
                  id="accounts-settings-institution"
                  type="text"
                  value={settingsDraft.sourceInstitution}
                  onChange={(event) => updateSettingsDraftField("sourceInstitution", event.target.value)}
                  className={FIELD_CLASS}
                />
                {settingsErrors.sourceInstitution ? <p className={FIELD_ERROR_CLASS}>{settingsErrors.sourceInstitution}</p> : null}
              </div>

              <div className="grid gap-2">
                <label htmlFor="accounts-settings-name" className="text-sm font-medium text-text-primary">Account name</label>
                <input
                  id="accounts-settings-name"
                  type="text"
                  value={settingsDraft.displayName}
                  onChange={(event) => updateSettingsDraftField("displayName", event.target.value)}
                  className={FIELD_CLASS}
                />
                {settingsErrors.displayName ? <p className={FIELD_ERROR_CLASS}>{settingsErrors.displayName}</p> : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <label htmlFor="accounts-settings-type" className="text-sm font-medium text-text-primary">Account type</label>
                  <select
                    id="accounts-settings-type"
                    value={settingsDraft.accountType}
                    onChange={(event) => updateSettingsDraftField("accountType", event.target.value)}
                    className={FIELD_CLASS}
                  >
                    {supportedAccountTypes.map((type) => (
                      <option key={type} value={type}>{formatAccountTypeLabel(type)}</option>
                    ))}
                  </select>
                  {settingsErrors.accountType ? <p className={FIELD_ERROR_CLASS}>{settingsErrors.accountType}</p> : null}
                </div>

                <div className="grid gap-2">
                  <label htmlFor="accounts-settings-currency" className="text-sm font-medium text-text-primary">Currency</label>
                  <input
                    id="accounts-settings-currency"
                    type="text"
                    maxLength={3}
                    value={settingsDraft.currency}
                    onChange={(event) => updateSettingsDraftField("currency", event.target.value.toUpperCase())}
                    className={`${FIELD_CLASS} uppercase`}
                  />
                  {settingsErrors.currency ? <p className={FIELD_ERROR_CLASS}>{settingsErrors.currency}</p> : null}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <label htmlFor="accounts-settings-balance" className="text-sm font-medium text-text-primary">Starting balance</label>
                  <input
                    id="accounts-settings-balance"
                    type="text"
                    inputMode="decimal"
                    value={settingsDraft.initialBalance}
                    onChange={(event) => updateSettingsDraftField("initialBalance", event.target.value)}
                    className={FIELD_CLASS}
                  />
                  {settingsErrors.initialBalance ? <p className={FIELD_ERROR_CLASS}>{settingsErrors.initialBalance}</p> : null}
                </div>

                <div className="grid gap-2">
                  <label htmlFor="accounts-settings-status" className="text-sm font-medium text-text-primary">State</label>
                  <select
                    id="accounts-settings-status"
                    value={settingsDraft.status}
                    onChange={(event) => updateSettingsDraftField("status", event.target.value as Account["status"])}
                    className={FIELD_CLASS}
                  >
                    <option value="active">Active</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-text-secondary">
                <input
                  type="checkbox"
                  checked={settingsDraft.includeInCharts}
                  onChange={(event) => updateSettingsDraftField("includeInCharts", event.target.checked)}
                  className="h-4 w-4 rounded border border-border-strong bg-surface-field text-accent focus-visible:ring-2 focus-visible:ring-focus-ring"
                />
                Include in charts and net worth calculations
              </label>

              <div className="border-t border-border-subtle pt-4">
                <CardDetailsSection
                  classMetadata={settingsDraft.classMetadata}
                  onChange={(metadata) => updateSettingsDraftField("classMetadata", metadata)}
                />
              </div>

              {settingsError ? (
                <p className={DANGER_ALERT_CLASS}>{settingsError}</p>
              ) : null}

              <div className="grid gap-2 border-t border-border-subtle pt-4 sm:grid-cols-3">
                <button
                  type="button"
                  className={WARNING_ACTION_BUTTON_CLASS}
                  onClick={() => void toggleAccountHidden()}
                  disabled={isUpdatingAccountState}
                >
                  {isUpdatingAccountState ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Archive className="h-4 w-4" aria-hidden="true" />}
                  {editingAccount.hidden ? "Show in list" : "Hide from list"}
                </button>
                <button
                  type="button"
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md border border-border-strong px-3 py-2 text-sm text-text-secondary transition hover:border-accent/40 hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => void toggleAccountClosed()}
                  disabled={isUpdatingAccountState}
                >
                  {isUpdatingAccountState ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Undo2 className="h-4 w-4" aria-hidden="true" />}
                  {editingAccount.status === "active" ? "Close account" : "Restore active"}
                </button>
                <button
                  type="button"
                  className={DANGER_ACTION_BUTTON_CLASS}
                  onClick={requestDeleteEditingAccount}
                  disabled={isDeletingAccount}
                >
                  {isDeletingAccount ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Trash2 className="h-4 w-4" aria-hidden="true" />}
                  Delete
                </button>
              </div>

              {isDeleteConfirmOpen ? (
                <div className={DANGER_CONFIRM_PANEL_CLASS} role="alert" aria-labelledby="account-delete-confirm-title" data-testid="accounts-delete-confirm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p id="account-delete-confirm-title" className="font-medium text-danger">
                        Delete {editingAccount.displayName}?
                      </p>
                      <p className="mt-1 text-danger/85">
                        This account will be removed permanently. Accounts with linked transactions cannot be deleted.
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <button
                        type="button"
                        className={SECONDARY_BUTTON_CLASS}
                        onClick={() => setIsDeleteConfirmOpen(false)}
                        disabled={isDeletingAccount}
                      >
                        Keep account
                      </button>
                      <button
                        type="button"
                        className={DANGER_CONFIRM_BUTTON_CLASS}
                        onClick={() => void confirmDeleteEditingAccount()}
                        disabled={isDeletingAccount}
                        data-testid="accounts-delete-confirm-submit"
                      >
                        {isDeletingAccount ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Trash2 className="h-4 w-4" aria-hidden="true" />}
                        Delete account
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border-subtle pt-4">
                <button
                  type="button"
                  className={SECONDARY_BUTTON_CLASS}
                  onClick={() => closeAccountSettings()}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  data-testid="accounts-settings-save"
                  className={PRIMARY_BUTTON_CLASS}
                  disabled={isSavingSettings}
                >
                  {isSavingSettings ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
                  Save changes
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
