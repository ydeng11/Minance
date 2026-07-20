import { getSupportedAccountTypes, createDefaultClassMetadata } from "../../../../../packages/domain/src/accounts";
import type { AccountClassMetadata } from "@/lib/api/types";

export type AddAccountPath = "provider" | "manual";

export interface ManualAccountDraft {
  sourceInstitution: string;
  selectedCardPreset: string;
  displayName: string;
  accountType: string;
  currency: string;
  initialBalance: string;
  classMetadata: AccountClassMetadata | null;
}

export interface ManualAccountErrors {
  sourceInstitution?: string;
  displayName?: string;
  accountType?: string;
  currency?: string;
  initialBalance?: string;
}

export interface NormalizedManualAccountInput {
  sourceInstitution: string;
  displayName: string;
  accountType: string;
  currency: string;
  initialBalance: number;
  classMetadata: AccountClassMetadata | null;
}

export interface ManualAccountValidationResult {
  errors: ManualAccountErrors;
  normalized: NormalizedManualAccountInput | null;
}

const DEFAULT_CURRENCY = "USD";

export function createDefaultManualAccountDraft(): ManualAccountDraft {
  return {
    sourceInstitution: "",
    selectedCardPreset: "",
    displayName: "",
    accountType: "",
    currency: DEFAULT_CURRENCY,
    initialBalance: "0",
    classMetadata: null
  };
}

function normalizeCurrencyInput(rawValue: string) {
  const value = String(rawValue || "").trim().toUpperCase();
  return value || DEFAULT_CURRENCY;
}

function normalizeBalanceInput(rawValue: string) {
  const value = String(rawValue || "").trim();
  return value || "0";
}

export function resolvePreferredProviderId(providerIds: string[], defaultProviderId: string | null) {
  if (defaultProviderId && providerIds.includes(defaultProviderId)) {
    return defaultProviderId;
  }
  return providerIds[0] || "";
}

export function hasManualDraftChanges(draft: ManualAccountDraft) {
  const defaultDraft = createDefaultManualAccountDraft();
  return (
    draft.sourceInstitution.trim() !== defaultDraft.sourceInstitution ||
    draft.selectedCardPreset !== defaultDraft.selectedCardPreset ||
    draft.displayName.trim() !== defaultDraft.displayName ||
    draft.accountType.trim() !== defaultDraft.accountType ||
    normalizeCurrencyInput(draft.currency) !== defaultDraft.currency ||
    normalizeBalanceInput(draft.initialBalance) !== defaultDraft.initialBalance
  );
}

export function shouldConfirmWizardCancellation(params: {
  selectedPath: AddAccountPath | null;
  manualDraft: ManualAccountDraft;
  selectedProviderId: string;
  defaultProviderId: string | null;
  attemptedProviderLink: boolean;
}) {
  if (params.attemptedProviderLink) {
    return true;
  }
  if (params.selectedPath === "manual") {
    return hasManualDraftChanges(params.manualDraft);
  }
  if (params.selectedPath === "provider") {
    const defaultProvider = params.defaultProviderId || "";
    return params.selectedProviderId !== defaultProvider;
  }
  return false;
}

export function validateManualAccountDraft(
  draft: ManualAccountDraft,
  supportedAccountTypes: string[] = getSupportedAccountTypes()
): ManualAccountValidationResult {
  const sourceInstitution = String(draft.sourceInstitution || "").trim();
  const displayName = String(draft.displayName || "").trim();
  const accountType = String(draft.accountType || "").trim();
  const currency = normalizeCurrencyInput(draft.currency);
  const initialBalanceRaw = String(draft.initialBalance || "").trim();

  const errors: ManualAccountErrors = {};

  if (!sourceInstitution) {
    errors.sourceInstitution = "Institution is required.";
  }
  if (displayName.length < 2) {
    errors.displayName = "Account name is required.";
  }
  if (!accountType) {
    errors.accountType = "Account type is required.";
  } else if (supportedAccountTypes.length > 0 && !supportedAccountTypes.includes(accountType)) {
    errors.accountType = "Account type is invalid.";
  }
  if (!/^[A-Z]{3}$/.test(currency)) {
    errors.currency = "Currency must be a 3-letter code.";
  }

  let initialBalance = 0;
  if (initialBalanceRaw) {
    const parsedBalance = Number(initialBalanceRaw);
    if (!Number.isFinite(parsedBalance)) {
      errors.initialBalance = "Starting balance must be numeric.";
    } else {
      initialBalance = parsedBalance;
    }
  }

  if (Object.keys(errors).length > 0) {
    return {
      errors,
      normalized: null
    };
  }

  // Pass through classMetadata if present; otherwise derive from account type
  const classMetadata = draft.classMetadata ?? createDefaultClassMetadata(accountType);

  return {
    errors: {},
    normalized: {
      sourceInstitution,
      displayName,
      accountType,
      currency,
      initialBalance,
      classMetadata
    }
  };
}
