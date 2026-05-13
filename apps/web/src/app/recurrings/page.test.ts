import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ApiError } from "../../lib/api/client";
import { getRequestFeedbackMessage } from "../../lib/feedback/requestFeedback";
import {
  CREATE_RULE_ERROR_MESSAGE,
  RECURRING_AMOUNT_ERROR_MESSAGE,
  RULE_NAME_REQUIRED_MESSAGE,
  serializeRecurringRuleDraft,
  validateRecurringRuleDraft
} from "./form";

const recurringPageSource = readFileSync(fileURLToPath(new URL("./page.tsx", import.meta.url)), "utf8");
const evaluateSavesDraftBeforeLinkingPattern = new RegExp(
  [
    "async function evaluateRule\\(\\)",
    "api\\.recurrings\\.update\\(selectedRuleId, serializeRecurringRuleDraft\\(editDraft\\)\\)",
    "api\\.recurrings\\.evaluate\\(selectedRuleId, \\{\\}\\)"
  ].join("[\\s\\S]*")
);

test("validateRecurringRuleDraft flags blank names without mutating the draft", () => {
  const draft = {
    name: "   ",
    amount: "45.00",
    cadence: "monthly",
    direction: "inflow"
  };
  const originalDraft = { ...draft };

  const errors = validateRecurringRuleDraft(draft);

  assert.deepEqual(errors, {
    name: RULE_NAME_REQUIRED_MESSAGE
  });
  assert.deepEqual(draft, originalDraft);
});

test("validateRecurringRuleDraft flags missing, non-numeric, and non-positive amounts", () => {
  assert.deepEqual(validateRecurringRuleDraft({ name: "Rent", amount: "" }), {
    amount: RECURRING_AMOUNT_ERROR_MESSAGE
  });
  assert.deepEqual(validateRecurringRuleDraft({ name: "Rent", amount: "abc" }), {
    amount: RECURRING_AMOUNT_ERROR_MESSAGE
  });
  assert.deepEqual(validateRecurringRuleDraft({ name: "Rent", amount: "0" }), {
    amount: RECURRING_AMOUNT_ERROR_MESSAGE
  });
});

test("serializeRecurringRuleDraft builds the persisted recurring payload", () => {
  assert.deepEqual(
    serializeRecurringRuleDraft({
      name: "  AT&T Phone  ",
      cadence: "monthly",
      amount: "310",
      merchant_pattern: "  ATT* BILL PAYMENT  ",
      category_final: "Bills & Utilities",
      account_id: "acct_csp",
      direction: "outflow"
    }),
    {
      name: "AT&T Phone",
      cadence: "monthly",
      amount: 310,
      merchant_pattern: "ATT* BILL PAYMENT",
      category_final: "Bills & Utilities",
      account_id: "acct_csp",
      direction: "outflow"
    }
  );
});

test("serializeRecurringRuleDraft clears optional recurring filters", () => {
  assert.deepEqual(
    serializeRecurringRuleDraft({
      name: "Bill",
      cadence: "monthly",
      amount: "70.28",
      merchant_pattern: "   ",
      category_final: "",
      account_id: "",
      direction: ""
    }),
    {
      name: "Bill",
      cadence: "monthly",
      amount: 70.28,
      merchant_pattern: null,
      category_final: null,
      account_id: null,
      direction: null
    }
  );
});

test("recurring evaluation persists the visible draft before linking", () => {
  assert.match(recurringPageSource, evaluateSavesDraftBeforeLinkingPattern);
});

test("request feedback preserves recovery-oriented copy for recurring request failures", () => {
  assert.equal(getRequestFeedbackMessage(new Error("boom"), CREATE_RULE_ERROR_MESSAGE), CREATE_RULE_ERROR_MESSAGE);

  const apiError = new ApiError("Recurring rule couldn't be updated.", 422, {
    error: {
      message: "Recurring rule couldn't be updated.",
      details: {
        remediation: "Review the fields and try again."
      }
    }
  });

  assert.equal(
    getRequestFeedbackMessage(apiError, CREATE_RULE_ERROR_MESSAGE),
    "Recurring rule couldn't be updated. Review the fields and try again."
  );
});
