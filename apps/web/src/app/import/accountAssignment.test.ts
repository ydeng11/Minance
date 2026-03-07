import test from "node:test";
import assert from "node:assert/strict";

import {
  collectRowIdsByAccountKey,
  collectVisibleSelectedRowIds,
  getReconciliationActionMode,
  normalizeAccountKey
} from "./accountAssignment";
import type { ImportReconciliationAccount, ProcessedRow } from "@/lib/api/types";

function createReconciliationEntry(overrides: Partial<ImportReconciliationAccount> = {}): ImportReconciliationAccount {
  return {
    accountKey: "checking",
    accountName: "Checking",
    accountId: "acct_1",
    status: "needs_review",
    totalRows: 2,
    includedValidRows: 2,
    invalidRows: 0,
    duplicateRows: 0,
    excludedRows: 0,
    lowDirectionConfidenceRows: 0,
    importedNet: 50,
    existingWindowNet: 10,
    discrepancyAmount: 40,
    existingWindowCount: 0,
    matchedExistingCount: 0,
    unmatchedImportedCount: 2,
    dateBounds: {
      start: "2026-01-01",
      end: "2026-01-02"
    },
    recommendations: [],
    ...overrides
  };
}

function createProcessedRow(rowId: string, accountName: string): ProcessedRow {
  return {
    rowId,
    importId: "imp_1",
    rowIndex: 1,
    include: true,
    status: "valid",
    issues: [],
    source: {
      transaction_date: "2026-01-01",
      merchant_raw: "Coffee",
      description: "Coffee",
      amount: "3.00",
      currency: "USD",
      account_name: accountName,
      category_raw: null,
      memo: null
    },
    normalized: {
      import_id: "imp_1",
      row_index: 1,
      transaction_date: "2026-01-01",
      merchant_raw: "Coffee",
      merchant_normalized: "coffee",
      description: "Coffee",
      amount: 3,
      direction: "outflow",
      direction_confidence: 1,
      direction_strategy: "manual_override",
      needs_direction_review: false,
      currency: "USD",
      account_name: accountName,
      category_raw: null,
      category_final: "Uncategorized",
      category_confidence: 0.5,
      category_strategy: "keyword",
      needs_category_review: false,
      memo: null,
      dedupe_fingerprint: `${rowId}-fingerprint`
    },
    overrides: {},
    editedAt: null,
    updatedAt: "2026-01-01T00:00:00.000Z"
  };
}

test("normalizeAccountKey mirrors backend normalization rules", () => {
  assert.equal(normalizeAccountKey("  BOA Checking #123  "), "boa checking 123");
  assert.equal(normalizeAccountKey(""), "");
});

test("getReconciliationActionMode returns assign_account when account link is missing", () => {
  const missingLink = createReconciliationEntry({
    accountId: null,
    status: "account_missing"
  });

  assert.equal(getReconciliationActionMode(missingLink), "assign_account");

  const needsAdjustment = createReconciliationEntry({
    accountId: "acct_2",
    discrepancyAmount: 14.2
  });
  assert.equal(getReconciliationActionMode(needsAdjustment), "create_adjustment");

  const noAction = createReconciliationEntry({
    accountId: "acct_2",
    discrepancyAmount: 0
  });
  assert.equal(getReconciliationActionMode(noAction), "none");
});

test("collectVisibleSelectedRowIds keeps rendered row order", () => {
  const rows = [
    createProcessedRow("row_1", "Checking"),
    createProcessedRow("row_2", "Checking"),
    createProcessedRow("row_3", "Savings")
  ];

  const selected = new Set(["row_3", "row_1", "row_missing"]);
  assert.deepEqual(collectVisibleSelectedRowIds(rows, selected), ["row_1", "row_3"]);
});

test("collectRowIdsByAccountKey matches account names with normalization", () => {
  const rows = [
    createProcessedRow("row_1", "BOA 123"),
    createProcessedRow("row_2", "BOA-123"),
    createProcessedRow("row_3", "Chase Main")
  ];

  assert.deepEqual(collectRowIdsByAccountKey(rows, "boa 123"), ["row_1", "row_2"]);
});
