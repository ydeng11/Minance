import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  buildImportAccountOptions,
  buildImportAccountReviewState,
  buildImportIssueVisibilitySummary,
  buildReprocessNotice,
  collectRowIdsByAccountKey,
  collectVisibleSelectedRowIds,
  collectRowsWithoutExplicitAccountOverride,
  getReconciliationActionMode,
  normalizeAccountKey,
  resolveImportAccountSelectionId,
  shouldShowImportIssues,
  shouldShowReconciliationSummary,
  summarizeImportAccountUsage,
  runReprocessRowsFlow,
  resolveImportAccountValue
} from "./accountAssignment";
import { ImportAccountSelector, ImportIssuesSummaryPanel, ProcessedRowAccountSelect } from "./pageComponents";
import type {
  Account,
  ImportReconciliationAccount,
  ImportReconciliationResponse,
  ProcessedRow,
  ProcessedSummary
} from "@/lib/api/types";

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

function createProcessedRow(
  rowId: string,
  accountName: string,
  overrides: Record<string, unknown> = {}
): ProcessedRow {
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
    overrides,
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

function createReconciliationResponse(
  overrides: Partial<ImportReconciliationResponse> = {},
  accounts: ImportReconciliationAccount[] = [createReconciliationEntry({
    status: "balanced",
    discrepancyAmount: 0,
    recommendations: []
  })]
): ImportReconciliationResponse {
  return {
    importId: "imp_1",
    importStatus: "processing",
    generatedAt: "2026-01-01T00:00:00.000Z",
    summary: {
      accountsTotal: accounts.length,
      balancedAccounts: accounts.filter((entry) => entry.status === "balanced").length,
      needsReviewAccounts: accounts.filter((entry) => entry.status === "needs_review").length,
      missingAccounts: accounts.filter((entry) => entry.status === "account_missing").length,
      unresolvedRows: 0,
      importedNet: 0,
      existingWindowNet: 0,
      discrepancyAmount: 0,
      actionRequired: false
    },
    accounts,
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

  const noAction = createReconciliationEntry({
    accountId: "acct_2",
    discrepancyAmount: 14.2
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

test("summarizeImportAccountUsage treats matching rows as default-inherited and flags exceptions", () => {
  const rows = [
    createProcessedRow("row_1", "Main Checking"),
    createProcessedRow("row_2", "main-checking"),
    createProcessedRow("row_3", "Travel Card")
  ];

  const summary = summarizeImportAccountUsage(rows, "Main Checking");

  assert.equal(summary.visibleRowCount, 3);
  assert.equal(summary.defaultInheritedRowIds.length, 2);
  assert.deepEqual(summary.defaultInheritedRowIds, ["row_1", "row_2"]);
  assert.deepEqual(summary.exceptionRowIds, ["row_3"]);
  assert.equal(summary.allVisibleRowsShareOneAccountIdentity, false);
});

test("summarizeImportAccountUsage treats explicit account overrides as exceptions even when they match the import default", () => {
  const rows = [
    createProcessedRow("row_1", "Main Checking", { account_name: "Main Checking" }),
    createProcessedRow("row_2", "Main Checking")
  ];

  const summary = summarizeImportAccountUsage(rows, "Main Checking");

  assert.deepEqual(summary.defaultInheritedRowIds, ["row_2"]);
  assert.deepEqual(summary.exceptionRowIds, ["row_1"]);
  assert.equal(summary.allVisibleRowsShareOneAccountIdentity, true);
});

test("summarizeImportAccountUsage reports a shared account identity when all visible rows resolve to one account", () => {
  const rows = [
    createProcessedRow("row_1", "Main Checking"),
    createProcessedRow("row_2", "Main Checking"),
    createProcessedRow("row_3", "")
  ];

  const summary = summarizeImportAccountUsage(rows, "Main Checking");

  assert.equal(summary.allVisibleRowsShareOneAccountIdentity, true);
  assert.equal(summary.sharedAccountIdentity, "main checking");
});

test("summarizeImportAccountUsage keeps blank rows distinct from assigned rows when the import default is empty", () => {
  const rows = [
    createProcessedRow("row_1", ""),
    createProcessedRow("row_2", "Main Checking")
  ];

  const summary = summarizeImportAccountUsage(rows, "");

  assert.deepEqual(summary.defaultInheritedRowIds, []);
  assert.deepEqual(summary.exceptionRowIds, ["row_1", "row_2"]);
  assert.equal(summary.allVisibleRowsShareOneAccountIdentity, false);
  assert.equal(summary.sharedAccountIdentity, null);
});

test("collectRowsWithoutExplicitAccountOverride preserves row-level exception rows", () => {
  const rows = [
    createProcessedRow("row_1", "Main Checking"),
    createProcessedRow("row_2", "Travel Card", { account_name: "Travel Card" }),
    createProcessedRow("row_3", "Main Checking")
  ];

  assert.deepEqual(collectRowsWithoutExplicitAccountOverride(rows), ["row_1", "row_3"]);
});

test("resolveImportAccountSelectionId derives the import selector id from whole-import rows instead of a filtered slice", () => {
  const accounts = [
    createAccount({
      id: "acct_main",
      displayName: "Main Checking",
      displayIdentifier: "Main Checking (Bank A | Checking)"
    }),
    createAccount({
      id: "acct_travel",
      displayName: "Travel Card",
      displayIdentifier: "Travel Card (Bank B | Credit)"
    })
  ];
  const rows = [
    createProcessedRow("row_1", "Main Checking"),
    createProcessedRow("row_2", "Travel Card", { account_name: "Travel Card" }),
    createProcessedRow("row_3", "Main Checking")
  ];
  const filteredRows = [createProcessedRow("row_2", "Travel Card")];

  assert.equal(resolveImportAccountSelectionId(rows, accounts), "acct_main");
  assert.equal(resolveImportAccountSelectionId(filteredRows, accounts), "acct_travel");
});

test("buildImportAccountReviewState uses whole-import rows for the selector and inherited row ids", () => {
  const accounts = [
    createAccount({
      id: "acct_main",
      displayName: "Main Checking",
      displayIdentifier: "Main Checking (Bank A | Checking)"
    }),
    createAccount({
      id: "acct_travel",
      displayName: "Travel Card",
      displayIdentifier: "Travel Card (Bank B | Credit)"
    })
  ];
  const rows = [
    createProcessedRow("row_1", "Main Checking"),
    createProcessedRow("row_2", "Travel Card", { account_name: "Travel Card" }),
    createProcessedRow("row_3", "Main Checking")
  ];

  assert.deepEqual(buildImportAccountReviewState(rows, accounts), {
    selectedAccountId: "acct_main",
    defaultRowIds: ["row_1", "row_3"]
  });
});

test("buildImportAccountReviewState catches ambiguity that a first-page slice would miss", () => {
  const accounts = [
    createAccount({
      id: "acct_main",
      displayName: "Main Checking",
      displayIdentifier: "Main Checking (Bank A | Checking)"
    }),
    createAccount({
      id: "acct_travel",
      displayName: "Travel Card",
      displayIdentifier: "Travel Card (Bank B | Credit)"
    })
  ];
  const rows = Array.from({ length: 200 }, (_, index) => createProcessedRow(`row_${index + 1}`, "Main Checking"));
  rows.push(createProcessedRow("row_201", "Travel Card"));

  assert.deepEqual(buildImportAccountReviewState(rows, accounts), {
    selectedAccountId: "",
    defaultRowIds: rows.map((row) => row.rowId)
  });
});

test("ImportAccountSelector renders the inline import account chooser and omits the batch toolbar", () => {
  const markup = renderToStaticMarkup(
    createElement(ImportAccountSelector, {
      accountOptions: [
        { value: "acct_main", label: "Main Checking (Bank A | Checking)" },
        { value: "acct_travel", label: "Travel Card (Bank B | Credit)" }
      ],
      value: "acct_main",
      onChange: () => undefined,
      isApplying: false
    })
  );

  assert.match(markup, /Import into account/);
  assert.match(markup, /data-testid="import-account-selector"/);
  assert.match(markup, /data-testid="import-account-select"/);
  assert.doesNotMatch(markup, /data-testid="import-account-panel"/);
  assert.match(markup, /value="acct_main"/);
  assert.doesNotMatch(markup, /Select visible/);
  assert.doesNotMatch(markup, /Assign account/);
  assert.doesNotMatch(markup, /Assign to \d+ selected/);
});

test("ProcessedRowAccountSelect keeps the row-level account editor available for exceptions", () => {
  const markup = renderToStaticMarkup(
    createElement(ProcessedRowAccountSelect, {
      rowId: "row_1",
      accountOptions: [
        { value: "Main Checking", label: "Main Checking (Bank A | Checking)" }
      ],
      value: "Main Checking",
      onChange: () => undefined
    })
  );

  assert.match(markup, /aria-label="Account for row row_1"/);
  assert.match(markup, /data-testid="processed-account-row_1"/);
});

test("import account wiring keeps the derived selector id and row-level exception editor in the same render tree", () => {
  const accounts = [
    createAccount({
      id: "acct_main",
      displayName: "Main Checking",
      displayIdentifier: "Main Checking (Bank A | Checking)"
    }),
    createAccount({
      id: "acct_travel",
      displayName: "Travel Card",
      displayIdentifier: "Travel Card (Bank B | Credit)"
    })
  ];
  const rows = [
    createProcessedRow("row_1", "Main Checking"),
    createProcessedRow("row_2", "Travel Card", { account_name: "Travel Card" }),
    createProcessedRow("row_3", "Main Checking")
  ];
  const filteredRows = [createProcessedRow("row_2", "Travel Card")];
  const selectedAccountId = resolveImportAccountSelectionId(rows, accounts);
  const filteredSelectionId = resolveImportAccountSelectionId(filteredRows, accounts);
  const markup = renderToStaticMarkup(
    createElement(
      "div",
      null,
      createElement(ImportAccountSelector, {
        accountOptions: accounts.map((account) => ({
          value: account.id,
          label: account.displayIdentifier || account.displayName
        })),
        value: selectedAccountId,
        onChange: () => undefined,
        isApplying: false
      }),
      createElement(ProcessedRowAccountSelect, {
        rowId: "row_2",
        accountOptions: [
          { value: "Travel Card", label: "Travel Card (Bank B | Credit)" },
          { value: "Main Checking", label: "Main Checking (Bank A | Checking)" }
        ],
        value: "Travel Card",
        onChange: () => undefined
      })
    )
  );

  assert.equal(selectedAccountId, "acct_main");
  assert.equal(filteredSelectionId, "acct_travel");
  assert.match(markup, /data-testid="import-account-select"/);
  assert.match(markup, /data-testid="processed-account-row_2"/);
  assert.match(markup, /value="acct_main"/);
});

test("shouldShowImportIssues returns true only when issue counts or escalation flags are present", () => {
  assert.equal(
    shouldShowImportIssues({
      invalidRows: 0,
      duplicateRows: 0,
      lowDirectionConfidenceRows: 0,
      multipleAccountGroups: false,
      hasMissingAccount: false,
      hasDiscrepancy: false
    }),
    false
  );

  assert.equal(
    shouldShowImportIssues({
      invalidRows: 0,
      duplicateRows: 0,
      lowDirectionConfidenceRows: 0,
      multipleAccountGroups: true,
      hasMissingAccount: false,
      hasDiscrepancy: false
    }),
    true
  );
});

test("shouldShowReconciliationSummary only opens for account escalation scenarios", () => {
  assert.equal(
    shouldShowReconciliationSummary({
      multipleAccountGroups: false,
      hasMissingAccount: false,
      hasDiscrepancy: false
    }),
    false
  );

  assert.equal(
    shouldShowReconciliationSummary({
      multipleAccountGroups: false,
      hasMissingAccount: true,
      hasDiscrepancy: false
    }),
    true
  );
});

test("buildImportIssueVisibilitySummary keeps clean single-account imports quiet", () => {
  const summary = buildImportIssueVisibilitySummary(
    [createProcessedRow("row_1", "Main Checking")],
    createReconciliationResponse()
  );

  assert.deepEqual(summary, {
    invalidRows: 0,
    duplicateRows: 0,
    lowDirectionConfidenceRows: 0,
    multipleAccountGroups: false,
    hasMissingAccount: false,
    hasDiscrepancy: false
  });
  assert.equal(shouldShowImportIssues(summary), false);
  assert.equal(shouldShowReconciliationSummary(summary), false);
});

test("buildImportIssueVisibilitySummary escalates when reconciliation needs account or discrepancy review", () => {
  const rows = [
    {
      ...createProcessedRow("row_1", "Main Checking"),
      status: "invalid" as const
    },
    {
      ...createProcessedRow("row_2", "Main Checking"),
      status: "duplicate" as const
    },
    {
      ...createProcessedRow("row_3", "Travel Card"),
      normalized: {
        ...createProcessedRow("row_3", "Travel Card").normalized,
        needs_direction_review: true
      }
    }
  ];
  const summary = buildImportIssueVisibilitySummary(
    rows,
    createReconciliationResponse(
      {
        summary: {
          accountsTotal: 2,
          balancedAccounts: 0,
          needsReviewAccounts: 1,
          missingAccounts: 1,
          unresolvedRows: 3,
          importedNet: 50,
          existingWindowNet: 25,
          discrepancyAmount: 0,
          actionRequired: true
        }
      },
      [
        createReconciliationEntry({
          accountKey: "main",
          accountName: "Main Checking",
          lowDirectionConfidenceRows: 1,
          discrepancyAmount: 25
        }),
        createReconciliationEntry({
          accountKey: "travel",
          accountName: "Travel Card",
          accountId: null,
          status: "account_missing",
          lowDirectionConfidenceRows: 0,
          discrepancyAmount: -25
        })
      ]
    )
  );

  assert.deepEqual(summary, {
    invalidRows: 1,
    duplicateRows: 1,
    lowDirectionConfidenceRows: 1,
    multipleAccountGroups: true,
    hasMissingAccount: true,
    hasDiscrepancy: true
  });
  assert.equal(shouldShowImportIssues(summary), true);
  assert.equal(shouldShowReconciliationSummary(summary), true);
});

test("ImportIssuesSummaryPanel only renders when the import actually needs escalation", () => {
  const cleanMarkup = renderToStaticMarkup(
    createElement(ImportIssuesSummaryPanel, {
      summary: buildImportIssueVisibilitySummary(
        [createProcessedRow("row_1", "Main Checking")],
        createReconciliationResponse()
      )
    })
  );
  const issueMarkup = renderToStaticMarkup(
    createElement(ImportIssuesSummaryPanel, {
      summary: {
        invalidRows: 1,
        duplicateRows: 2,
        lowDirectionConfidenceRows: 3,
        multipleAccountGroups: true,
        hasMissingAccount: true,
        hasDiscrepancy: true
      }
    })
  );

  assert.equal(cleanMarkup, "");
  assert.match(issueMarkup, /Issues found/);
  assert.match(issueMarkup, /1 invalid rows/);
  assert.match(issueMarkup, /2 duplicate rows/);
  assert.match(issueMarkup, /3 rows need direction review/);
  assert.match(issueMarkup, /Multiple account groups detected/);
  assert.match(issueMarkup, /Missing account links/);
  assert.match(issueMarkup, /Reconciliation discrepancy detected/);
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

test("resolveImportAccountValue matches account display identifiers from import UI labels", () => {
  const selected = resolveImportAccountValue(
    [
      createAccount({
        id: "acct_1",
        displayName: "Hyatt",
        displayIdentifier: "Hyatt (Chase | Credit)",
        normalizedKey: "chase hyatt",
        sourceInstitution: "Chase",
        accountType: "credit"
      })
    ],
    "Hyatt (Chase | Credit)"
  );

  assert.equal(selected, "Hyatt");
});
