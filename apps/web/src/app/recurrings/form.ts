export const RULE_NAME_REQUIRED_MESSAGE = "Rule name is required.";
export const RECURRING_AMOUNT_ERROR_MESSAGE = "Recurring amount must be greater than zero.";
export const CREATE_RULE_ERROR_MESSAGE =
  "Recurring rule couldn't be created. Your current draft is still here. Check the fields and try again.";

export interface RecurringFormErrors {
  name?: string;
  amount?: string;
}

export interface RecurringDraftValidationInput {
  name: string;
  amount: string;
}

export type RecurringCadence = "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly";

export interface RecurringRuleDraftInput extends RecurringDraftValidationInput {
  cadence: RecurringCadence;
  merchant_pattern: string;
  category_final: string;
  account_id: string;
  direction: "" | "outflow" | "inflow";
}

export function validateRecurringRuleDraft(
  draft: RecurringDraftValidationInput
): RecurringFormErrors {
  const errors: RecurringFormErrors = {};

  if (!draft.name.trim()) {
    errors.name = RULE_NAME_REQUIRED_MESSAGE;
  }

  const amount = Number(draft.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    errors.amount = RECURRING_AMOUNT_ERROR_MESSAGE;
  }

  return errors;
}

export function serializeRecurringRuleDraft(draft: RecurringRuleDraftInput) {
  return {
    name: draft.name.trim(),
    cadence: draft.cadence,
    amount: Number(draft.amount),
    merchant_pattern: draft.merchant_pattern.trim() || null,
    category_final: draft.category_final || null,
    account_id: draft.account_id || null,
    direction: draft.direction || null
  };
}
