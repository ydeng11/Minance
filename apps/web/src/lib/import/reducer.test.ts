import test from "node:test";
import assert from "node:assert/strict";
import { importWorkflowReducer, initialImportWorkflowState } from "./reducer";

test("import workflow reducer handles analyze and commit transitions", () => {
  const start = importWorkflowReducer(initialImportWorkflowState, {
    type: "file_selected",
    fileName: "transactions.csv"
  });

  assert.equal(start.selectedFileName, "transactions.csv");

  const analyzing = importWorkflowReducer(start, { type: "analyze_started" });
  assert.equal(analyzing.isAnalyzing, true);

  const analyzed = importWorkflowReducer(analyzing, {
    type: "analyze_succeeded",
    importJob: {
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
    },
    details: {
      importJob: {
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
      },
      previewRows: [],
      diagnostics: [],
      processedPreview: [],
      processedSummary: {
        all: 5,
        valid: 5,
        invalid: 0,
        duplicate: 0,
        excluded: 0,
        included: 5
      }
    },
    processedRows: {
      total: 5,
      offset: 0,
      limit: 100,
      items: [],
      summary: {
        all: 5,
        valid: 5,
        invalid: 0,
        duplicate: 0,
        excluded: 0,
        included: 5
      }
    }
  });

  assert.equal(analyzed.isAnalyzing, false);
  assert.equal(analyzed.notice, "Import analyzed.");

  const committing = importWorkflowReducer(analyzed, { type: "commit_started" });
  assert.equal(committing.isCommitting, true);

  const committed = importWorkflowReducer(committing, {
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
        processedTotals: {
          all: 5,
          valid: 5,
          invalid: 0,
          duplicate: 0,
          excluded: 0,
          included: 5
        },
        dateBounds: {
          start: "2026-01-01",
          end: "2026-01-05"
        }
      },
      dateBounds: {
        start: "2026-01-01",
        end: "2026-01-05"
      },
      processedTotals: {
        all: 5,
        valid: 5,
        invalid: 0,
        duplicate: 0,
        excluded: 0,
        included: 5
      }
    }
  });

  assert.equal(committed.isCommitting, false);
  assert.equal(committed.notice, "Import committed.");
  assert.equal(committed.commitResult?.importId, "imp_1");
});
