import test from "node:test";
import assert from "node:assert/strict";
import type { Category, Transaction } from "@/lib/api/types";
import {
  buildDraftFromTransaction,
  createInitialTransactionDraft,
  parseTagListInput,
  validateTransactionDraft
} from "./form";

function createCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: "cat_001",
    userId: "user_001",
    name: "Dining",
    emoji: "meal",
    coarseKey: "extra",
    type: "expense",
    budget: null,
    isSystem: false,
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-01T00:00:00.000Z",
    ...overrides
  };
}

function createTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "txn_001",
    user_id: "user_001",
    account_id: "acct_001",
    account_key: "primary-checking",
    source_type: "manual",
    source_file_id: null,
    transaction_date: "2026-03-01",
    post_date: null,
    merchant_raw: "Cafe Brisk",
    merchant_normalized: "cafe brisk",
    description: "Lunch",
    amount: 24.5,
    currency: "USD",
    direction: "debit",
    transaction_type: "expense",
    category_raw: "Dining",
    category_final: "Dining",
    category_coarse: "extra",
    category_coarse_key: "extra",
    category_emoji: "meal",
    category_coarse_emoji: "sparkles",
    category_confidence: 1,
    category_strategy: "manual",
    needs_category_review: false,
    review_status: "reviewed",
    tags: ["lunch", "weekday"],
    recurring_rule_id: null,
    memo: "business meeting",
    dedupe_fingerprint: "fp_001",
    created_at: "2026-03-01T00:00:00.000Z",
    updated_at: "2026-03-01T00:00:00.000Z",
    ...overrides
  };
}

test("createInitialTransactionDraft returns default create state", () => {
  const draft = createInitialTransactionDraft({ category: "Dining", today: "2026-03-02" });
  assert.equal(draft.id, "");
  assert.equal(draft.transaction_date, "2026-03-02");
  assert.equal(draft.category_final, "Dining");
  assert.equal(draft.review_status, "reviewed");
  assert.equal(draft.transaction_type, "");
});

test("buildDraftFromTransaction maps existing transaction into editable draft", () => {
  const draft = buildDraftFromTransaction(createTransaction());
  assert.equal(draft.id, "txn_001");
  assert.equal(draft.transaction_date, "2026-03-01");
  assert.equal(draft.tags, "lunch, weekday");
  assert.equal(draft.account_name, "primary-checking");
  assert.equal(draft.transaction_type, "expense");
});

test("parseTagListInput normalizes, deduplicates, and lowercases tags", () => {
  const parsed = parseTagListInput(" Monthly, groceries,monthly , groceries ");
  assert.equal(parsed.error, undefined);
  assert.deepEqual(parsed.tags, ["monthly", "groceries"]);
});

test("parseTagListInput rejects invalid characters", () => {
  const parsed = parseTagListInput("ok-tag, bad/tag");
  assert.equal(parsed.tags.length, 0);
  assert.equal(
    parsed.error,
    "Tags can include letters/numbers separated by spaces, dashes, or underscores."
  );
});

test("validateTransactionDraft enforces required date, description, amount, and category", () => {
  const result = validateTransactionDraft(
    {
      ...createInitialTransactionDraft({ today: "" }),
      transaction_date: "",
      description: " ",
      amount: "0",
      category_final: ""
    },
    [createCategory()]
  );

  assert.equal(result.payload, null);
  assert.equal(result.errors.transaction_date, "Date is required.");
  assert.equal(result.errors.description, "Description is required.");
  assert.equal(result.errors.amount, "Amount must be greater than 0.");
  assert.equal(result.errors.category_final, "Category is required.");
});

test("validateTransactionDraft rejects unknown category names", () => {
  const result = validateTransactionDraft(
    {
      ...createInitialTransactionDraft({ today: "2026-03-02" }),
      description: "Coffee",
      merchant_raw: "Coffee Shop",
      amount: "7.25",
      category_final: "Unknown"
    },
    [createCategory({ name: "Dining" })]
  );

  assert.equal(result.payload, null);
  assert.equal(result.errors.category_final, "Category must match an existing category.");
});

test("validateTransactionDraft rejects incompatible transaction type and direction", () => {
  const result = validateTransactionDraft(
    {
      ...createInitialTransactionDraft({ category: "Dining", today: "2026-03-02" }),
      description: "Refund",
      amount: "12.50",
      direction: "credit",
      transaction_type: "expense"
    },
    [createCategory({ name: "Dining" })]
  );

  assert.equal(result.payload, null);
  assert.equal(result.errors.transaction_type, "Expense type cannot use credit direction.");
});

test("validateTransactionDraft builds normalized payload for valid input", () => {
  const result = validateTransactionDraft(
    {
      ...createInitialTransactionDraft({ category: "dining", today: "2026-03-02" }),
      description: "Lunch",
      merchant_raw: "",
      amount: "18.40",
      direction: "debit",
      account_name: "  Main Checking  ",
      memo: "  Team sync  ",
      tags: "Food, weekday, food",
      review_status: "needs_review",
      transaction_type: "expense"
    },
    [createCategory({ name: "Dining" })]
  );

  assert.deepEqual(result.errors, {});
  assert.deepEqual(result.payload, {
    transaction_date: "2026-03-02",
    description: "Lunch",
    merchant_raw: "Lunch",
    amount: 18.4,
    direction: "debit",
    category_final: "Dining",
    account_name: "Main Checking",
    memo: "Team sync",
    tags: ["food", "weekday"],
    review_status: "needs_review",
    transaction_type: "expense"
  });
});
