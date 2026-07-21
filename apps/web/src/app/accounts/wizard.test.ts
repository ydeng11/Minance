import test from "node:test";
import assert from "node:assert/strict";
import {
  createDefaultManualAccountDraft,
  hasManualDraftChanges,
  resolvePreferredProviderId,
  shouldConfirmWizardCancellation,
  validateManualAccountDraft
} from "./wizard";
import { formatAccountTypeLabel, getAccountIdentifier } from "./accountFormatting";
import type { Account } from "@/lib/api/types";

function createAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: "account-1",
    userId: "user-1",
    displayName: "Travel Fund",
    sourceInstitution: "Manual",
    accountType: "high_yield_savings",
    currency: "USD",
    initialBalance: 0,
    version: 1,
    status: "active",
    hidden: false,
    closed: false,
    closedAt: null,
    normalizedKey: "travel_fund",
    createdAt: "2026-03-25T00:00:00.000Z",
    updatedAt: "2026-03-25T00:00:00.000Z",
    classMetadata: null,
    ...overrides
  };
}

test("createDefaultManualAccountDraft returns manual defaults", () => {
  assert.deepEqual(createDefaultManualAccountDraft(), {
    sourceInstitution: "",
    selectedCardPreset: "",
    displayName: "",
    accountType: "",
    currency: "USD",
    initialBalance: "0",
    classMetadata: null
  });
});

test("resolvePreferredProviderId prioritizes default provider id when available", () => {
  assert.equal(resolvePreferredProviderId(["manual_csv", "bank_x"], "bank_x"), "bank_x");
  assert.equal(resolvePreferredProviderId(["manual_csv", "bank_x"], "missing"), "manual_csv");
  assert.equal(resolvePreferredProviderId([], "manual_csv"), "");
});

test("validateManualAccountDraft enforces required fields and numeric balance", () => {
  const result = validateManualAccountDraft({
    sourceInstitution: "",
    displayName: " ",
    accountType: "",
    currency: "US",
    initialBalance: "abc"
  });

  assert.equal(result.normalized, null);
  assert.equal(result.errors.sourceInstitution, "Institution is required.");
  assert.equal(result.errors.displayName, "Account name is required.");
  assert.equal(result.errors.accountType, "Account type is required.");
  assert.equal(result.errors.currency, "Currency must be a 3-letter code.");
  assert.equal(result.errors.initialBalance, "Starting balance must be numeric.");
});

test("validateManualAccountDraft trims and normalizes valid payloads", () => {
  // With accountType=credit and no explicit classMetadata, the validator
  // derives default credit metadata.
  const result = validateManualAccountDraft({
    sourceInstitution: "  Chase  ",
    displayName: "  Travel Card  ",
    accountType: "credit",
    currency: " usd ",
    initialBalance: "-82.40"
  });

  assert.deepEqual(result.errors, {});
  assert.deepEqual(result.normalized, {
    sourceInstitution: "Chase",
    displayName: "Travel Card",
    accountType: "credit",
    currency: "USD",
    initialBalance: -82.4,
    classMetadata: {
      type: "credit",
      credit: {
        annualFee: null,
        activationDate: null,
        lastRenewalDate: null,
        renewalCycleMonths: 12,
        benefits: []
      }
    }
  });

  // With explicit non-credit classMetadata, it passes through unchanged.
  const nonCreditResult = validateManualAccountDraft({
    sourceInstitution: "Manual",
    displayName: "Cash Wallet",
    accountType: "cash",
    currency: "USD",
    initialBalance: "100",
    classMetadata: { type: "cash" }
  });

  assert.deepEqual(nonCreditResult.errors, {});
  assert.deepEqual(nonCreditResult.normalized?.classMetadata, { type: "cash" });
});

test("validateManualAccountDraft rejects unsupported account types against the shared supported list", () => {
  const validate = validateManualAccountDraft as (
    draft: Parameters<typeof validateManualAccountDraft>[0],
    supportedAccountTypes?: string[]
  ) => ReturnType<typeof validateManualAccountDraft>;

  const result = validate(
    {
      sourceInstitution: "Manual",
      displayName: "Rainy Day",
      accountType: "high_yield_savings",
      currency: "USD",
      initialBalance: "25"
    },
    ["checking", "depository", "credit"]
  );

  assert.equal(result.normalized, null);
  assert.equal(result.errors.accountType, "Account type is invalid.");
});

test("hasManualDraftChanges tracks non-default edits", () => {
  const draft = createDefaultManualAccountDraft();
  assert.equal(hasManualDraftChanges(draft), false);
  assert.equal(
    hasManualDraftChanges({
      ...draft,
      sourceInstitution: "Citi"
    }),
    true
  );
});

test("shouldConfirmWizardCancellation only prompts for modified or progressed wizard state", () => {
  const draft = createDefaultManualAccountDraft();

  assert.equal(
    shouldConfirmWizardCancellation({
      selectedPath: null,
      manualDraft: draft,
      selectedProviderId: "manual_csv",
      defaultProviderId: "manual_csv",
      attemptedProviderLink: false
    }),
    false
  );

  assert.equal(
    shouldConfirmWizardCancellation({
      selectedPath: "provider",
      manualDraft: draft,
      selectedProviderId: "bank_x",
      defaultProviderId: "manual_csv",
      attemptedProviderLink: false
    }),
    true
  );

  assert.equal(
    shouldConfirmWizardCancellation({
      selectedPath: "manual",
      manualDraft: draft,
      selectedProviderId: "manual_csv",
      defaultProviderId: "manual_csv",
      attemptedProviderLink: false
    }),
    false
  );

  assert.equal(
    shouldConfirmWizardCancellation({
      selectedPath: "manual",
      manualDraft: {
        ...draft,
        displayName: "Wallet"
      },
      selectedProviderId: "manual_csv",
      defaultProviderId: "manual_csv",
      attemptedProviderLink: false
    }),
    true
  );
});

test("formatAccountTypeLabel title-cases snake case account types", () => {
  assert.equal(formatAccountTypeLabel("high_yield_savings"), "High Yield Savings");
});

test("getAccountIdentifier prefers API-provided display identifiers", () => {
  assert.equal(
    getAccountIdentifier(
      createAccount({
        displayIdentifier: "Custom Account Label"
      })
    ),
    "Custom Account Label"
  );
});

test("getAccountIdentifier falls back to the shared display identifier contract", () => {
  assert.equal(
    getAccountIdentifier(
      createAccount({
        displayIdentifier: undefined,
        sourceInstitution: "",
        accountType: "checking"
      })
    ),
    "Travel Fund (Manual | Checking)"
  );
});
