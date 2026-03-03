"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent, type MouseEvent as ReactMouseEvent } from "react";
import { Archive, Building2, CreditCard, Link2, Loader2, Plus, Save, ShieldAlert, Trash2, Undo2, X } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { useApi } from "@/hooks/useApi";
import type { Account, AccountProviderSummary } from "@/lib/api/types";
import {
  createDefaultManualAccountDraft,
  resolvePreferredProviderId,
  shouldConfirmWizardCancellation,
  validateManualAccountDraft,
  type AddAccountPath,
  type ManualAccountDraft,
  type ManualAccountErrors
} from "./wizard";

type MessageTone = "info" | "error";
type WizardStep = "path" | "provider" | "manual";

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

function messageClasses(tone: MessageTone) {
  if (tone === "error") {
    return "border-rose-700 bg-rose-950/40 text-rose-200";
  }
  return "border-neutral-800 bg-neutral-900/60 text-neutral-300";
}

function statusClasses(status: string) {
  if (status === "closed") {
    return "bg-rose-500/10 text-rose-300";
  }
  if (status === "hidden") {
    return "bg-amber-500/10 text-amber-300";
  }
  return "bg-emerald-500/10 text-emerald-300";
}

function formatAccountTypeLabel(accountType: string) {
  return accountType
    .split("_")
    .map((entry) => entry.charAt(0).toUpperCase() + entry.slice(1))
    .join(" ");
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
  const [providers, setProviders] = useState<AccountProviderSummary[]>([]);
  const [accountTypes, setAccountTypes] = useState<string[]>([]);
  const [defaultProviderId, setDefaultProviderId] = useState<string | null>(null);
  const [selectedProviderId, setSelectedProviderId] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<WizardStep>("path");
  const [selectedPath, setSelectedPath] = useState<AddAccountPath | null>(null);
  const [pathError, setPathError] = useState("");
  const [providerError, setProviderError] = useState("");
  const [providerMessage, setProviderMessage] = useState("");
  const [attemptedProviderLink, setAttemptedProviderLink] = useState(false);
  const [manualDraft, setManualDraft] = useState<ManualAccountDraft>(() => createDefaultManualAccountDraft());
  const [manualErrors, setManualErrors] = useState<ManualAccountErrors>({});
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<MessageTone>("info");
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);
  const [isStartingProviderLink, setIsStartingProviderLink] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [settingsDraft, setSettingsDraft] = useState<AccountSettingsDraft | null>(null);
  const [settingsErrors, setSettingsErrors] = useState<AccountSettingsErrors>({});
  const [settingsError, setSettingsError] = useState("");
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isUpdatingAccountState, setIsUpdatingAccountState] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const selectedProvider = useMemo(
    () => providers.find((entry) => entry.id === selectedProviderId) || null,
    [providers, selectedProviderId]
  );
  const supportedAccountTypes = useMemo(
    () => accountTypes.length ? accountTypes : ["checking", "savings", "credit", "loan", "investment", "cash"],
    [accountTypes]
  );
  const knownInstitutions = useMemo(
    () => Array.from(new Set(accounts.map((entry) => entry.sourceInstitution).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b)),
    [accounts]
  );

  const resetWizardState = useCallback((nextProviders = providers, nextDefaultProviderId = defaultProviderId) => {
    setWizardStep("path");
    setSelectedPath(null);
    setPathError("");
    setProviderError("");
    setProviderMessage("");
    setAttemptedProviderLink(false);
    setManualDraft(createDefaultManualAccountDraft());
    setManualErrors({});
    setSelectedProviderId(resolvePreferredProviderId(nextProviders.map((entry) => entry.id), nextDefaultProviderId));
  }, [defaultProviderId, providers]);

  const loadAccountsPage = useCallback(async () => {
    setIsLoading(true);
    try {
      const [accountsResponse, providersResponse, accountTypesResponse] = await Promise.all([
        api.accounts.list(),
        api.accounts.listProviders(),
        api.accounts.supportedAccountTypes()
      ]);

      setAccounts(accountsResponse.accounts || []);
      setProviders(providersResponse.providers || []);
      setDefaultProviderId(providersResponse.defaultProviderId || null);
      setAccountTypes(accountTypesResponse.accountTypes || []);
      setSelectedProviderId((previous) => {
        const nextProviderIds = (providersResponse.providers || []).map((entry) => entry.id);
        if (previous && nextProviderIds.includes(previous)) {
          return previous;
        }
        return resolvePreferredProviderId(nextProviderIds, providersResponse.defaultProviderId || null);
      });
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

  function openWizard() {
    resetWizardState();
    setIsWizardOpen(true);
  }

  function closeWizard(force = false) {
    if (!force) {
      const confirmCancel = shouldConfirmWizardCancellation({
        selectedPath,
        manualDraft,
        selectedProviderId,
        defaultProviderId,
        attemptedProviderLink
      });
      if (confirmCancel && typeof window !== "undefined") {
        const shouldDiscard = window.confirm("Discard this account setup?");
        if (!shouldDiscard) {
          return;
        }
      }
    }
    setIsWizardOpen(false);
    resetWizardState();
  }

  function handleWizardBackdropClick(event: ReactMouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      closeWizard();
    }
  }

  function proceedFromPathStep() {
    if (!selectedPath) {
      setPathError("Choose a setup path to continue.");
      return;
    }
    setPathError("");
    setWizardStep(selectedPath === "provider" ? "provider" : "manual");
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

  async function startProviderLinkSession() {
    if (!selectedProviderId) {
      setProviderError("Choose a provider.");
      return;
    }

    setProviderError("");
    setProviderMessage("");
    setIsStartingProviderLink(true);
    setAttemptedProviderLink(true);
    try {
      const response = await api.accounts.createLinkSession(selectedProviderId);
      const linkSession = response.linkSession;
      setProviderMessage(
        linkSession.linkUrl
          ? "Link session is ready. Continue with the provider authorization page."
          : "Link session initialized."
      );
      setMessageTone("info");
      setMessage(`Provider flow initialized for ${selectedProvider?.name || selectedProviderId}.`);
    } catch (error) {
      const nextMessage = error instanceof ApiError ? error.message : "Unable to start provider link session.";
      setProviderError(nextMessage);
      setMessageTone("error");
      setMessage(nextMessage);
    } finally {
      setIsStartingProviderLink(false);
    }
  }

  async function submitManualAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const validation = validateManualAccountDraft(manualDraft);
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

  function openAccountSettings(account: Account) {
    setMessage("");
    setSettingsError("");
    setSettingsErrors({});
    setEditingAccount(account);
    setSettingsDraft(createAccountSettingsDraft(account));
    setIsSettingsOpen(true);
  }

  function closeAccountSettings(force = false) {
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
  }

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
          <h2 className="text-3xl font-semibold tracking-tight">Accounts</h2>
          <p className="text-neutral-400">Manage linked and manual accounts across your workspace.</p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm font-medium text-neutral-200 transition hover:border-emerald-500/40 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
          data-testid="accounts-add"
          onClick={openWizard}
          disabled={isLoading}
        >
          <Plus className="h-4 w-4" />
          Add account
        </button>
      </header>

      {message ? (
        <p
          className={`rounded-lg border px-3 py-2 text-sm ${messageClasses(messageTone)}`}
          data-testid={messageTone === "error" ? "accounts-error" : "global-message"}
        >
          {message}
        </p>
      ) : null}

      {isLoading ? (
        <section className="rounded-2xl border border-neutral-900 bg-neutral-950/70 p-4 text-sm text-neutral-400" data-testid="accounts-skeleton">
          Loading accounts…
        </section>
      ) : (
        <section className="rounded-2xl border border-neutral-900 bg-neutral-950/70 p-4">
          <h3 className="text-sm font-medium text-neutral-300">Connected accounts</h3>
          {accounts.length ? (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {accounts.map((entry) => (
                <article key={entry.id} className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4" data-testid={`account-row-${entry.id}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-medium text-neutral-100">{entry.displayName}</p>
                      <p className="text-xs uppercase tracking-wide text-neutral-400">{entry.sourceInstitution || "Manual"}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`rounded-full px-2 py-1 text-xs ${statusClasses(entry.status)}`}>{entry.status}</span>
                      <button
                        type="button"
                        className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-neutral-300 transition hover:border-neutral-600"
                        data-testid={`account-manage-${entry.id}`}
                        onClick={() => openAccountSettings(entry)}
                      >
                        Manage
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3 text-sm text-neutral-300">
                    <div className="flex items-center gap-2">
                      {entry.accountType === "credit" || entry.accountType === "loan" ? (
                        <CreditCard className="h-4 w-4" />
                      ) : (
                        <Building2 className="h-4 w-4" />
                      )}
                      <span>{formatAccountTypeLabel(entry.accountType)}</span>
                    </div>
                    <span className="font-medium text-neutral-200">{formatBalance(entry.initialBalance, entry.currency)}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-3 rounded-lg border border-dashed border-neutral-800 bg-neutral-900/40 px-3 py-4 text-sm text-neutral-400">
              No accounts yet. Use <strong className="text-neutral-200">Add account</strong> to create one manually or try a provider flow.
            </p>
          )}
        </section>
      )}

      <p className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-300">
        Use account <strong className="text-neutral-100">Manage</strong> actions for rename/type/state updates, and use{" "}
        <Link href="/transactions" className="text-emerald-300 underline decoration-emerald-700 underline-offset-2">
          transactions
        </Link>{" "}
        to validate account activity after onboarding.
      </p>

      {isWizardOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={handleWizardBackdropClick}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-account-wizard-title"
            data-testid="accounts-wizard"
            className="w-full max-w-2xl rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl shadow-black/50"
          >
            <header className="flex items-start justify-between gap-3 border-b border-neutral-800 px-5 py-4">
              <div>
                <h3 id="add-account-wizard-title" className="text-lg font-semibold text-neutral-100">Add account</h3>
                <p className="text-sm text-neutral-400">Choose provider linking or manual setup.</p>
              </div>
              <button
                type="button"
                className="rounded-md border border-neutral-800 bg-neutral-900 p-2 text-neutral-400 transition hover:text-neutral-200"
                data-testid="accounts-wizard-close"
                onClick={() => closeWizard()}
              >
                <span className="sr-only">Close</span>
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="space-y-4 px-5 py-4">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
                <span className={wizardStep === "path" ? "text-emerald-300" : "text-neutral-500"}>1. Path</span>
                <span>/</span>
                <span className={wizardStep !== "path" ? "text-emerald-300" : "text-neutral-500"}>2. Setup</span>
              </div>

              {wizardStep === "path" ? (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      data-testid="accounts-wizard-path-provider"
                      className={`rounded-xl border p-4 text-left transition ${
                        selectedPath === "provider"
                          ? "border-emerald-500/60 bg-emerald-950/20"
                          : "border-neutral-800 bg-neutral-900/50 hover:border-neutral-700"
                      }`}
                      onClick={() => {
                        setSelectedPath("provider");
                        setPathError("");
                      }}
                    >
                      <p className="text-sm font-medium text-neutral-100">Institution provider</p>
                      <p className="mt-2 text-xs text-neutral-400">
                        Start a provider session to connect institutions when supported by your deployment.
                      </p>
                    </button>
                    <button
                      type="button"
                      data-testid="accounts-wizard-path-manual"
                      className={`rounded-xl border p-4 text-left transition ${
                        selectedPath === "manual"
                          ? "border-emerald-500/60 bg-emerald-950/20"
                          : "border-neutral-800 bg-neutral-900/50 hover:border-neutral-700"
                      }`}
                      onClick={() => {
                        setSelectedPath("manual");
                        setPathError("");
                      }}
                    >
                      <p className="text-sm font-medium text-neutral-100">Manual account</p>
                      <p className="mt-2 text-xs text-neutral-400">
                        Create an account directly with institution, type, and starting balance.
                      </p>
                    </button>
                  </div>
                  {pathError ? (
                    <p className="text-sm text-rose-300" data-testid="accounts-wizard-path-error">{pathError}</p>
                  ) : null}
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="rounded-md border border-neutral-700 px-3 py-2 text-sm text-neutral-300 transition hover:border-neutral-600"
                      onClick={() => closeWizard()}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      data-testid="accounts-wizard-path-continue"
                      className="rounded-md border border-emerald-600/40 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-300 transition hover:border-emerald-500/60"
                      onClick={proceedFromPathStep}
                    >
                      Continue
                    </button>
                  </div>
                </div>
              ) : null}

              {wizardStep === "provider" ? (
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <label htmlFor="accounts-wizard-provider-select" className="text-sm font-medium text-neutral-200">Provider</label>
                    <select
                      id="accounts-wizard-provider-select"
                      data-testid="accounts-wizard-provider-select"
                      className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100"
                      value={selectedProviderId}
                      onChange={(event) => {
                        setSelectedProviderId(event.target.value);
                        setProviderError("");
                        setProviderMessage("");
                      }}
                    >
                      {!providers.length ? <option value="">No providers available</option> : null}
                      {providers.map((entry) => (
                        <option key={entry.id} value={entry.id}>
                          {entry.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedProvider ? (
                    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-3 text-xs text-neutral-300">
                      <p className="font-medium text-neutral-100">{selectedProvider.name}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="rounded-full border border-neutral-700 px-2 py-1">
                          Direct aggregation: {selectedProvider.capabilities.directAggregation ? "yes" : "no"}
                        </span>
                        <span className="rounded-full border border-neutral-700 px-2 py-1">
                          Institution lookup: {selectedProvider.capabilities.institutionLookup ? "yes" : "no"}
                        </span>
                        <span className="rounded-full border border-neutral-700 px-2 py-1">
                          Manual account create: {selectedProvider.capabilities.manualAccountCreate ? "yes" : "no"}
                        </span>
                      </div>
                      {selectedProvider.fallback?.remediation ? (
                        <div className="mt-3 rounded-md border border-neutral-800 bg-neutral-950/70 p-3 text-neutral-300">
                          <p className="font-medium text-neutral-200">Fallback guidance</p>
                          <p className="mt-1 text-xs">{selectedProvider.fallback.remediation}</p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {providerError ? (
                    <p className="text-sm text-rose-300" data-testid="accounts-wizard-provider-error">{providerError}</p>
                  ) : null}
                  {providerMessage ? (
                    <p className="text-sm text-emerald-300" data-testid="accounts-wizard-provider-message">{providerMessage}</p>
                  ) : null}

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-md border border-neutral-700 px-3 py-2 text-sm text-neutral-300 transition hover:border-neutral-600"
                        onClick={() => {
                          setWizardStep("path");
                          setProviderError("");
                          setProviderMessage("");
                        }}
                      >
                        <Undo2 className="h-4 w-4" />
                        Back
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-neutral-700 px-3 py-2 text-sm text-neutral-300 transition hover:border-neutral-600"
                        onClick={() => closeWizard()}
                      >
                        Cancel
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        data-testid="accounts-wizard-provider-manual"
                        className="rounded-md border border-neutral-700 px-3 py-2 text-sm text-neutral-300 transition hover:border-neutral-600"
                        onClick={() => {
                          setSelectedPath("manual");
                          setWizardStep("manual");
                          setProviderError("");
                          setProviderMessage("");
                        }}
                      >
                        Switch to manual
                      </button>
                      <button
                        type="button"
                        data-testid="accounts-wizard-provider-start"
                        className="inline-flex items-center gap-2 rounded-md border border-emerald-600/40 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-300 transition hover:border-emerald-500/60 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => void startProviderLinkSession()}
                        disabled={!selectedProviderId || isStartingProviderLink}
                      >
                        {isStartingProviderLink ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                        Start institution flow
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {wizardStep === "manual" ? (
                <form className="space-y-4" data-testid="accounts-wizard-manual-form" onSubmit={submitManualAccount}>
                  <div className="grid gap-2">
                    <label htmlFor="accounts-manual-institution" className="text-sm font-medium text-neutral-200">Institution</label>
                    <input
                      id="accounts-manual-institution"
                      data-testid="accounts-wizard-manual-institution"
                      type="text"
                      list="accounts-known-institutions"
                      value={manualDraft.sourceInstitution}
                      onChange={(event) => updateManualDraft("sourceInstitution", event.target.value)}
                      className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500"
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
                      <p className="text-xs text-rose-300">{manualErrors.sourceInstitution}</p>
                    ) : null}
                  </div>

                  <div className="grid gap-2">
                    <label htmlFor="accounts-manual-name" className="text-sm font-medium text-neutral-200">Account name</label>
                    <input
                      id="accounts-manual-name"
                      data-testid="accounts-wizard-manual-name"
                      type="text"
                      value={manualDraft.displayName}
                      onChange={(event) => updateManualDraft("displayName", event.target.value)}
                      className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500"
                      placeholder="e.g. Travel Card"
                    />
                    {manualErrors.displayName ? (
                      <p className="text-xs text-rose-300">{manualErrors.displayName}</p>
                    ) : null}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <label htmlFor="accounts-manual-type" className="text-sm font-medium text-neutral-200">Account type</label>
                      <select
                        id="accounts-manual-type"
                        data-testid="accounts-wizard-manual-type"
                        value={manualDraft.accountType}
                        onChange={(event) => updateManualDraft("accountType", event.target.value)}
                        className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100"
                      >
                        <option value="">Select account type</option>
                        {supportedAccountTypes.map((type) => (
                          <option key={type} value={type}>{formatAccountTypeLabel(type)}</option>
                        ))}
                      </select>
                      {manualErrors.accountType ? (
                        <p className="text-xs text-rose-300">{manualErrors.accountType}</p>
                      ) : null}
                    </div>

                    <div className="grid gap-2">
                      <label htmlFor="accounts-manual-currency" className="text-sm font-medium text-neutral-200">Currency</label>
                      <input
                        id="accounts-manual-currency"
                        data-testid="accounts-wizard-manual-currency"
                        type="text"
                        maxLength={3}
                        value={manualDraft.currency}
                        onChange={(event) => updateManualDraft("currency", event.target.value.toUpperCase())}
                        className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm uppercase text-neutral-100 placeholder:text-neutral-500"
                        placeholder="USD"
                      />
                      {manualErrors.currency ? (
                        <p className="text-xs text-rose-300">{manualErrors.currency}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <label htmlFor="accounts-manual-balance" className="text-sm font-medium text-neutral-200">Starting balance</label>
                    <input
                      id="accounts-manual-balance"
                      data-testid="accounts-wizard-manual-balance"
                      type="text"
                      inputMode="decimal"
                      value={manualDraft.initialBalance}
                      onChange={(event) => updateManualDraft("initialBalance", event.target.value)}
                      className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500"
                      placeholder="0.00"
                    />
                    {manualErrors.initialBalance ? (
                      <p className="text-xs text-rose-300">{manualErrors.initialBalance}</p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-md border border-neutral-700 px-3 py-2 text-sm text-neutral-300 transition hover:border-neutral-600"
                        onClick={() => {
                          setWizardStep("path");
                          setPathError("");
                        }}
                      >
                        <Undo2 className="h-4 w-4" />
                        Back
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-neutral-700 px-3 py-2 text-sm text-neutral-300 transition hover:border-neutral-600"
                        onClick={() => closeWizard()}
                      >
                        Cancel
                      </button>
                    </div>
                    <button
                      type="submit"
                      data-testid="accounts-wizard-manual-save"
                      className="inline-flex items-center gap-2 rounded-md border border-emerald-600/40 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-300 transition hover:border-emerald-500/60 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isSubmittingManual}
                    >
                      {isSubmittingManual ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Save account
                    </button>
                  </div>
                </form>
              ) : null}

              {wizardStep === "provider" && selectedProvider?.capabilities.directAggregation === false ? (
                <div className="flex items-start gap-2 rounded-lg border border-amber-800/50 bg-amber-950/30 px-3 py-2 text-xs text-amber-200">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>Direct aggregation is not available for this provider in self-host mode. Use manual setup or CSV import.</p>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}

      {isSettingsOpen && editingAccount && settingsDraft ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={(event) => {
          if (event.target === event.currentTarget) {
            closeAccountSettings();
          }
        }}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-settings-title"
            data-testid="accounts-settings-modal"
            className="w-full max-w-2xl rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl shadow-black/50"
          >
            <header className="flex items-start justify-between gap-3 border-b border-neutral-800 px-5 py-4">
              <div>
                <h3 id="account-settings-title" className="text-lg font-semibold text-neutral-100">Account settings</h3>
                <p className="text-sm text-neutral-400">Rename, retype, archive, close, or delete this account.</p>
              </div>
              <button
                type="button"
                className="rounded-md border border-neutral-800 bg-neutral-900 p-2 text-neutral-400 transition hover:text-neutral-200"
                data-testid="accounts-settings-close"
                onClick={() => closeAccountSettings()}
              >
                <span className="sr-only">Close</span>
                <X className="h-4 w-4" />
              </button>
            </header>

            <form className="space-y-4 px-5 py-4" onSubmit={(event) => void saveAccountSettings(event)}>
              <div className="grid gap-2">
                <label htmlFor="accounts-settings-institution" className="text-sm font-medium text-neutral-200">Institution</label>
                <input
                  id="accounts-settings-institution"
                  type="text"
                  value={settingsDraft.sourceInstitution}
                  onChange={(event) => updateSettingsDraftField("sourceInstitution", event.target.value)}
                  className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500"
                />
                {settingsErrors.sourceInstitution ? <p className="text-xs text-rose-300">{settingsErrors.sourceInstitution}</p> : null}
              </div>

              <div className="grid gap-2">
                <label htmlFor="accounts-settings-name" className="text-sm font-medium text-neutral-200">Account name</label>
                <input
                  id="accounts-settings-name"
                  type="text"
                  value={settingsDraft.displayName}
                  onChange={(event) => updateSettingsDraftField("displayName", event.target.value)}
                  className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500"
                />
                {settingsErrors.displayName ? <p className="text-xs text-rose-300">{settingsErrors.displayName}</p> : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <label htmlFor="accounts-settings-type" className="text-sm font-medium text-neutral-200">Account type</label>
                  <select
                    id="accounts-settings-type"
                    value={settingsDraft.accountType}
                    onChange={(event) => updateSettingsDraftField("accountType", event.target.value)}
                    className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100"
                  >
                    {supportedAccountTypes.map((type) => (
                      <option key={type} value={type}>{formatAccountTypeLabel(type)}</option>
                    ))}
                  </select>
                  {settingsErrors.accountType ? <p className="text-xs text-rose-300">{settingsErrors.accountType}</p> : null}
                </div>

                <div className="grid gap-2">
                  <label htmlFor="accounts-settings-currency" className="text-sm font-medium text-neutral-200">Currency</label>
                  <input
                    id="accounts-settings-currency"
                    type="text"
                    maxLength={3}
                    value={settingsDraft.currency}
                    onChange={(event) => updateSettingsDraftField("currency", event.target.value.toUpperCase())}
                    className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm uppercase text-neutral-100 placeholder:text-neutral-500"
                  />
                  {settingsErrors.currency ? <p className="text-xs text-rose-300">{settingsErrors.currency}</p> : null}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <label htmlFor="accounts-settings-balance" className="text-sm font-medium text-neutral-200">Starting balance</label>
                  <input
                    id="accounts-settings-balance"
                    type="text"
                    inputMode="decimal"
                    value={settingsDraft.initialBalance}
                    onChange={(event) => updateSettingsDraftField("initialBalance", event.target.value)}
                    className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500"
                  />
                  {settingsErrors.initialBalance ? <p className="text-xs text-rose-300">{settingsErrors.initialBalance}</p> : null}
                </div>

                <div className="grid gap-2">
                  <label htmlFor="accounts-settings-status" className="text-sm font-medium text-neutral-200">State</label>
                  <select
                    id="accounts-settings-status"
                    value={settingsDraft.status}
                    onChange={(event) => updateSettingsDraftField("status", event.target.value as Account["status"])}
                    className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100"
                  >
                    <option value="active">Active</option>
                    <option value="hidden">Archived</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-neutral-300">
                <input
                  type="checkbox"
                  checked={settingsDraft.includeInCharts}
                  onChange={(event) => updateSettingsDraftField("includeInCharts", event.target.checked)}
                  className="h-4 w-4 rounded border border-neutral-700 bg-neutral-900"
                />
                Include in charts and net worth calculations
              </label>

              {settingsError ? (
                <p className="rounded-lg border border-rose-700 bg-rose-950/40 px-3 py-2 text-sm text-rose-200">{settingsError}</p>
              ) : null}

              <div className="grid gap-2 border-t border-neutral-800 pt-4 sm:grid-cols-3">
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-amber-700/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-300 transition hover:border-amber-500/50 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => void updateAccountState("hidden")}
                  disabled={isUpdatingAccountState || editingAccount.status === "hidden"}
                >
                  {isUpdatingAccountState ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
                  Archive
                </button>
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-neutral-700 px-3 py-2 text-sm text-neutral-300 transition hover:border-neutral-600 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => void updateAccountState(editingAccount.status === "active" ? "closed" : "active")}
                  disabled={isUpdatingAccountState}
                >
                  {isUpdatingAccountState ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />}
                  {editingAccount.status === "active" ? "Close account" : "Restore active"}
                </button>
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-rose-700/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300 transition hover:border-rose-500/50 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => void deleteEditingAccount()}
                  disabled={isDeletingAccount}
                >
                  {isDeletingAccount ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Delete
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-neutral-800 pt-4">
                <button
                  type="button"
                  className="rounded-md border border-neutral-700 px-3 py-2 text-sm text-neutral-300 transition hover:border-neutral-600"
                  onClick={() => closeAccountSettings()}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  data-testid="accounts-settings-save"
                  className="inline-flex items-center gap-2 rounded-md border border-emerald-600/40 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-300 transition hover:border-emerald-500/60 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSavingSettings}
                >
                  {isSavingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
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
