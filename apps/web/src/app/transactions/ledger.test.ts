import test from "node:test";
import assert from "node:assert/strict";
import type { Transaction } from "@/lib/api/types";
import {
  buildCreateResultMessage,
  getLedgerAmountBounds,
  sortTransactionsForLedger
} from "./ledger";

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
    direction: "outflow",
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
    tags: [],
    recurring_rule_id: null,
    memo: null,
    dedupe_fingerprint: "fp_001",
    created_at: "2026-03-01T00:00:00.000Z",
    updated_at: "2026-03-01T00:00:00.000Z",
    ...overrides
  };
}

test("sortTransactionsForLedger prefers newer created_at values when transaction_date matches", () => {
  const sorted = sortTransactionsForLedger([
    createTransaction({
      id: "txn_older",
      transaction_date: "2026-03-09",
      created_at: "2026-03-09T09:00:00.000Z"
    }),
    createTransaction({
      id: "txn_newer",
      transaction_date: "2026-03-09",
      created_at: "2026-03-09T12:00:00.000Z"
    }),
    createTransaction({
      id: "txn_previous_day",
      transaction_date: "2026-03-08",
      created_at: "2026-03-08T23:59:00.000Z"
    })
  ]);

  assert.deepEqual(sorted.map((entry) => entry.id), ["txn_newer", "txn_older", "txn_previous_day"]);
});

test("getLedgerAmountBounds uses response metadata when available", () => {
  assert.deepEqual(
    getLedgerAmountBounds(
      {
        amountBounds: {
          min: 12,
          max: 340
        }
      },
      [createTransaction({ amount: 24.5 })]
    ),
    { min: 12, max: 340 }
  );
});

test("buildCreateResultMessage warns when a new transaction is hidden by active filters", () => {
  assert.equal(
    buildCreateResultMessage("txn_hidden", [createTransaction({ id: "txn_other" })]),
    "Transaction created. It is outside the current filter view."
  );
});
