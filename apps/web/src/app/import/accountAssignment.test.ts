import test from "node:test";
import assert from "node:assert/strict";

import {
  buildImportAccountOptions,
  buildReprocessNotice,
  collectRowIdsByAccountKey,
  collectVisibleSelectedRowIds,
  getReconciliationActionMode,
  normalizeAccountKey,
  runReprocessRowsFlow,
  resolveImportAccountValue
} from "./accountAssignment";
import type { Account, ImportReconciliationAccount, ProcessedRow, ProcessedSummary } from "@/lib/api/types";

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

function createProcessedSummary(overrides: Partial<ProcessedSummary> = {}): ProcessedSummary {
  return {
    all: 4,
    valid: 3,
    invalid: 1,
    duplicate: 0,
    excluded: 2,
    included: 2,
    ...overrides
  };
}

function createAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: "acct_1",
    userId: "user_1",
    displayName: "Main Checking",
    displayIdentifier: "Main Checking (Bank A | Checking)",
    sourceInstitution: "Bank A",
    accountType: "checking",
    currency: "USD",
    initialBalance: 0,
    version: 1,
    status: "active",
    includeInCharts: true,
    hidden: false,
    closed: false,
    closedAt: null,
    normalizedKey: "main checking",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides
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

test("buildReprocessNotice describes updated processed-row totals", () => {
  const message = buildReprocessNotice(4, createProcessedSummary());

  assert.equal(message, "Reprocessed 4 rows (included: 2, excluded: 2, invalid: 1).");
});

test("runReprocessRowsFlow refreshes rows and imports before publishing the notice", async () => {
  const calls: string[] = [];
  let publishedNotice = "";

  await runReprocessRowsFlow("imp_1", {
    reprocess: async (importId) => {
      calls.push(`reprocess:${importId}`);
      return {
        total: 4,
        summary: createProcessedSummary()
      };
    },
    refreshProcessedRows: async (importId) => {
      calls.push(`refreshProcessedRows:${importId}`);
    },
    refreshImports: async () => {
      calls.push("refreshImports");
    },
    publishNotice: (notice) => {
      calls.push("publishNotice");
      publishedNotice = notice;
    }
  });

  assert.deepEqual(calls, [
    "reprocess:imp_1",
    "refreshProcessedRows:imp_1",
    "refreshImports",
    "publishNotice"
  ]);
  assert.equal(publishedNotice, "Reprocessed 4 rows (included: 2, excluded: 2, invalid: 1).");
});

test("buildImportAccountOptions uses displayIdentifier and preserves unknown row account values", () => {
  const options = buildImportAccountOptions(
    [
      createAccount({
        id: "acct_2",
        displayName: "Travel Card",
        displayIdentifier: "Travel Card (Bank B | Credit)"
      })
    ],
    "Legacy Account"
  );

  assert.deepEqual(options, [
    { value: "Legacy Account", label: "Legacy Account" },
    { value: "Travel Card", label: "Travel Card (Bank B | Credit)" }
  ]);
});

test("buildImportAccountOptions matches normalized account identity without unknown fallback", () => {
  const options = buildImportAccountOptions(
    [
      createAccount({
        id: "acct_1",
        displayName: "Main Checking",
        displayIdentifier: "Main Checking (Bank A | Checking)",
        normalizedKey: "main checking"
      })
    ],
    "main-checking"
  );

  assert.deepEqual(options, [
    { value: "Main Checking", label: "Main Checking (Bank A | Checking)" }
  ]);
});

test("resolveImportAccountValue selects known account displayName when current value is normalized", () => {
  const selected = resolveImportAccountValue(
    [
      createAccount({
        id: "acct_1",
        displayName: "Main Checking",
        normalizedKey: "main checking"
      })
    ],
    "main-checking"
  );

  assert.equal(selected, "Main Checking");
});
