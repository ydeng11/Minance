"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type MouseEvent as ReactMouseEvent } from "react";
import { Archive, Building2, CreditCard, Loader2, Plus, Save, Trash2, Undo2, X } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { useApi } from "@/hooks/useApi";
import type { Account } from "@/lib/api/types";
import { StatusMessage } from "@/components/feedback/StatusMessage";
import { getDialogFocusableElements, trapDialogTabKey } from "@/lib/dialogFocus";
import {
  createDefaultManualAccountDraft,
  hasManualDraftChanges,
  validateManualAccountDraft,
  type ManualAccountDraft,
  type ManualAccountErrors
} from "./wizard";
import { formatAccountTypeLabel, getAccountIdentifier } from "./accountFormatting";
import { resolveSupportedAccountTypes } from "./accountTypes";

interface AccountSettingsDraft {
  sourceInstitution: string;
  displayName: string;
  accountType: string;
  currency: string;
  initialBalance: string;
  status: Account["status"];
  includeInCharts: boolean;
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
const DANGER_ALERT_CLASS = "rounded-lg border border-danger/35 bg-danger-soft px-3 py-2 text-sm text-danger";

function statusClasses(status: string) {
  if (status === "closed") {
    return "bg-danger-soft text-danger";
  }
  if (status === "hidden") {
    return "bg-warning-soft text-warning";
  }
  return "bg-accent-soft text-accent";
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
    includeInCharts: account.includeInCharts
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
      includeInCharts: draft.includeInCharts
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
    account.includeInCharts !== draft.includeInCharts
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
  const wizardDialogRef = useRef<HTMLElement | null>(null);
  const settingsDialogRef = useRef<HTMLElement | null>(null);
  const lastFocusedElementRef = useRef<HTMLElement | null>(null);

  const supportedAccountTypes = useMemo(
    () => resolveSupportedAccountTypes(accountTypes),
    [accountTypes]
  );
  const knownInstitutions = useMemo(
    () => Array.from(new Set(accounts.map((entry) => entry.sourceInstitution).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b)),
    [accounts]
  );

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
    if (!force) {
      const confirmCancel = hasManualDraftChanges(manualDraft);
      if (confirmCancel && typeof window !== "undefined") {
        const shouldDiscard = window.confirm("Discard this account setup?");
        if (!shouldDiscard) {
          return;
        }
      }
    }
    setIsWizardOpen(false);
    resetWizardState();
    restoreFocusAfterDialogClose();
  }, [manualDraft, resetWizardState, restoreFocusAfterDialogClose]);

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

  async function updateAccountState(nextStatus: Account["status"]) {
    if (!editingAccount) {
      return;
    }

    const stateLabel = nextStatus === "hidden" ? "archive" : nextStatus === "closed" ? "close" : "restore";
    if (typeof window !== "undefined" && !window.confirm(`Confirm ${stateLabel} action for "${editingAccount.displayName}"?`)) {
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
      setSettingsError(error instanceof ApiError ? error.message : "Failed to update account status.");
    } finally {
      setIsUpdatingAccountState(false);
    }
  }

  async function deleteEditingAccount() {
    if (!editingAccount) {
      return;
    }
    if (typeof window !== "undefined" && !window.confirm(`Delete "${editingAccount.displayName}"? This cannot be undone.`)) {
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
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {accounts.map((entry) => (
                <article key={entry.id} className="rounded-xl border border-border-subtle bg-surface-field p-4" data-testid={`account-row-${entry.id}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-medium text-text-primary">{entry.displayName}</p>
                      <p className="text-xs text-text-secondary">{getAccountIdentifier(entry)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`rounded-full px-2 py-1 text-xs ${statusClasses(entry.status)}`}>{entry.status}</span>
                      <button
                        type="button"
                        className="inline-flex min-h-[44px] items-center justify-center rounded-md border border-border-strong bg-surface-panel px-3 py-2 text-xs text-text-secondary transition hover:border-accent/40 hover:text-text-primary"
                        data-testid={`account-manage-${entry.id}`}
                        onClick={() => openAccountSettings(entry)}
                      >
                        Manage
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3 text-sm text-text-secondary">
                    <div className="flex items-center gap-2">
                      {entry.accountType === "credit" || entry.accountType === "loan" ? (
                        <CreditCard className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Building2 className="h-4 w-4" aria-hidden="true" />
                      )}
                      <span>{formatAccountTypeLabel(entry.accountType)}</span>
                    </div>
                    <span className="font-medium text-text-primary">{formatBalance(entry.initialBalance, entry.currency)}</span>
                  </div>
                </article>
              ))}
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
                    <label htmlFor="accounts-manual-institution" className="text-sm font-medium text-text-primary">Institution</label>
                    <input
                      id="accounts-manual-institution"
                      data-testid="accounts-wizard-manual-institution"
                      type="text"
                      list="accounts-known-institutions"
                      value={manualDraft.sourceInstitution}
                      onChange={(event) => updateManualDraft("sourceInstitution", event.target.value)}
                      className={FIELD_CLASS}
                      placeholder="e.g. Chase"
                    />
                    {knownInstitutions.length ? (
                      <datalist id="accounts-known-institutions">
                        {knownInstitutions.map((entry) => (
                          <option key={entry} value={entry} />
                        ))}
                      </datalist>
                    ) : null}
                    {manualErrors.sourceInstitution ? (
                      <p className={FIELD_ERROR_CLASS}>{manualErrors.sourceInstitution}</p>
                    ) : null}
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
                      <label htmlFor="accounts-manual-type" className="text-sm font-medium text-text-primary">Account type</label>
                      <select
                        id="accounts-manual-type"
                        data-testid="accounts-wizard-manual-type"
                        value={manualDraft.accountType}
                        onChange={(event) => updateManualDraft("accountType", event.target.value)}
                        className={FIELD_CLASS}
                      >
                        <option value="">Select account type</option>
                        {supportedAccountTypes.map((type) => (
                          <option key={type} value={type}>{formatAccountTypeLabel(type)}</option>
                        ))}
                      </select>
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
                    <option value="hidden">Archived</option>
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

              {settingsError ? (
                <p className={DANGER_ALERT_CLASS}>{settingsError}</p>
              ) : null}

              <div className="grid gap-2 border-t border-border-subtle pt-4 sm:grid-cols-3">
                <button
                  type="button"
                  className={WARNING_ACTION_BUTTON_CLASS}
                  onClick={() => void updateAccountState("hidden")}
                  disabled={isUpdatingAccountState || editingAccount.status === "hidden"}
                >
                  {isUpdatingAccountState ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Archive className="h-4 w-4" aria-hidden="true" />}
                  Archive
                </button>
                <button
                  type="button"
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md border border-border-strong px-3 py-2 text-sm text-text-secondary transition hover:border-accent/40 hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => void updateAccountState(editingAccount.status === "active" ? "closed" : "active")}
                  disabled={isUpdatingAccountState}
                >
                  {isUpdatingAccountState ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Undo2 className="h-4 w-4" aria-hidden="true" />}
                  {editingAccount.status === "active" ? "Close account" : "Restore active"}
                </button>
                <button
                  type="button"
                  className={DANGER_ACTION_BUTTON_CLASS}
                  onClick={() => void deleteEditingAccount()}
                  disabled={isDeletingAccount}
                >
                  {isDeletingAccount ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Trash2 className="h-4 w-4" aria-hidden="true" />}
                  Delete
                </button>
              </div>

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
