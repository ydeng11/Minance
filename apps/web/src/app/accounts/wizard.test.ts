import test from "node:test";
import assert from "node:assert/strict";
import {
  createDefaultManualAccountDraft,
  hasManualDraftChanges,
  resolvePreferredProviderId,
  shouldConfirmWizardCancellation,
  validateManualAccountDraft
} from "./wizard";

test("createDefaultManualAccountDraft returns manual defaults", () => {
  assert.deepEqual(createDefaultManualAccountDraft(), {
    sourceInstitution: "",
    displayName: "",
    accountType: "",
    currency: "USD",
    initialBalance: "0"
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
    initialBalance: -82.4
  });
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
