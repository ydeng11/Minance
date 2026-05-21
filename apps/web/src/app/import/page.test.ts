import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ApiError } from "../../lib/api/client";
import { getRequestFeedbackMessage } from "../../lib/feedback/requestFeedback";
import { importWorkflowReducer, initialImportWorkflowState } from "../../lib/import/reducer";
import { ProcessedRecordsToolbar } from "./ProcessedRecordsToolbar";

const importPageSource = readFileSync(join(process.cwd(), "src/app/import/page.tsx"), "utf8");

const IMPORT_JOB = {
  id: "imp_1",
  userId: "user_1",
  fileName: "transactions.csv",
  status: "processing",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  rowCount: 5,
  delimiter: ",",
  hasHeader: true,
  headers: ["date", "amount", "merchant"],
  mapping: { date: "date", amount: "amount", merchant: "merchant" },
  mappingConfidence: {},
  mappingAverageConfidence: 0.9,
  warnings: [],
  aiSuggested: true,
  commitSummary: null
} as const;

const PROCESSED_SUMMARY = {
  all: 5,
  valid: 5,
  invalid: 0,
  duplicate: 0,
  excluded: 0,
  included: 5
} as const;

test("processed records toolbar omits the manual reprocess action", () => {
  const markup = renderToStaticMarkup(
    createElement(ProcessedRecordsToolbar, {
      statusFilter: "",
      onStatusFilterChange: () => undefined
    })
  );

  assert.match(markup, /data-testid="processed-status-filter"/);
  assert.doesNotMatch(markup, />Reprocess</);
});

test("request feedback falls back to import-specific recovery copy for unknown errors", () => {
  const fallback = "Import analysis couldn't finish. Nothing changed. Check the file format and try again.";

  assert.equal(getRequestFeedbackMessage(new Error("boom"), fallback), fallback);
});

test("request feedback appends remediation when ApiError exposes next-step guidance", () => {
  const error = new ApiError("Mapping couldn't be saved.", 422, {
    error: {
      message: "Mapping couldn't be saved.",
      details: {
        remediation: "Review required columns and try again."
      }
    }
  });

  assert.equal(
    getRequestFeedbackMessage(error, "unused fallback"),
    "Mapping couldn't be saved. Review required columns and try again."
  );
});

test("import workflow reducer clears routine success notices after analyze and commit", () => {
  const analyzed = importWorkflowReducer(initialImportWorkflowState, {
    type: "analyze_succeeded",
    importJob: IMPORT_JOB,
    details: {
      importJob: IMPORT_JOB,
      previewRows: [],
      diagnostics: [],
      processedPreview: [],
      processedSummary: PROCESSED_SUMMARY
    },
    processedRows: {
      total: 5,
      offset: 0,
      limit: 100,
      items: [],
      summary: PROCESSED_SUMMARY
    }
  });

  assert.equal(analyzed.notice, null);

  const committed = importWorkflowReducer(analyzed, {
    type: "commit_succeeded",
    result: {
      importId: "imp_1",
      status: "completed",
      summary: {
        scanned: 5,
        imported: 5,
        duplicatesSkipped: 0,
        invalidRows: 0,
        excludedRows: 0,
        lowConfidenceRows: 0,
        llmCategorization: {
          attempted: 1,
          succeeded: 1,
          failed: 0,
          fallbackUsed: 0
        },
        processedTotals: PROCESSED_SUMMARY,
        dateBounds: {
          start: "2026-01-01",
          end: "2026-01-05"
        }
      },
      dateBounds: {
        start: "2026-01-01",
        end: "2026-01-05"
      },
      processedTotals: PROCESSED_SUMMARY
    }
  });

  assert.equal(committed.notice, null);
});

test("import page exposes dedicated mobile card containers for processed rows and reconciliation", () => {
  assert.match(importPageSource, /processed-mobile-cards/);
  assert.match(importPageSource, /reconciliation-mobile-cards/);
  assert.match(importPageSource, /processed-mobile-cards"\>\s*\{renderProcessedRowsMobileCards\(state\.processedRows\)\}\s*<\/div>\s*<div\s+className="mt-3 hidden overflow-auto lg:block"/s);
  assert.match(importPageSource, /reconciliation-mobile-cards"\>\s*\{renderReconciliationMobileCards\(\)\}\s*<\/div>\s*<div className="mt-3 hidden overflow-auto lg:block"/s);
  assert.doesNotMatch(importPageSource, /hidden overflow-auto md:block/);
});

test("import action icons are decorative when text labels carry the action", () => {
  assert.match(importPageSource, /<UploadCloud className="h-4 w-4" aria-hidden="true" \/>/);
  assert.match(importPageSource, /<Save className="h-4 w-4" aria-hidden="true" \/>/);
  assert.match(importPageSource, /<Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" \/>/);
  assert.match(importPageSource, /<RefreshCcw className="h-3\.5 w-3\.5" aria-hidden="true" \/>/);
});

test("import account assignment uses the bulk processed row update endpoint", () => {
  assert.match(importPageSource, /api\.imports\.updateProcessedRows\(currentImportId,\s*\{\s*rowIds,/s);
  assert.doesNotMatch(
    importPageSource,
    /rowIds\.map\(\(rowId\) => api\.imports\.updateProcessedRow\(currentImportId, rowId, \{ account_name: account\.displayName \}\)\)/
  );
});

test("import account assignment updates every processed row so the table matches the selector", () => {
  assert.match(importPageSource, /const rowIds = allProcessedRows\.map\(\(row\) => row\.rowId\);/);
  assert.doesNotMatch(
    importPageSource,
    /const didApply = importDefaultRowIds\.length > 0\s*\?\s*await applyAccountToRows\(importDefaultRowIds, selectedAccount\.id\)/s
  );
});
