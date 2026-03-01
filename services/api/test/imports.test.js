import test from "node:test";
import assert from "node:assert/strict";

import { resetStoreForTests, ensureDefaultCategoriesForUser } from "../src/store.js";
import {
  createImportJob,
  listImportProcessedRows,
  updateImportProcessedRow,
  reprocessImportRows,
  commitImport
} from "../src/imports.js";

const EMPTY_STORE = {
  users: [{ id: "user_1", email: "user@example.com", createdAt: "2026-01-01", updatedAt: "2026-01-01" }],
  sessions: [],
  accounts: [],
  transactions: [],
  categories: [],
  categoryRules: [],
  imports: [],
  importRowsRaw: [],
  importRowsProcessed: [],
  importRowDiagnostics: [],
  aiProviderCredentials: [],
  aiProviderPreferences: [],
  assistantQueries: [],
  savedViews: [],
  migrationRuns: [],
  auditEvents: []
};

test("processed import rows can be edited, reprocessed, and committed", async () => {
  resetStoreForTests(structuredClone(EMPTY_STORE));
  ensureDefaultCategoriesForUser("user_1");

  const csvText = [
    "date,merchant,description,amount,account",
    "2025-01-01,Coffee Shop,Coffee Shop,-5.25,Checking",
    "2025-01-02,Payroll,Payroll Deposit,2000.00,Checking"
  ].join("\n");

  const created = await createImportJob({
    userId: "user_1",
    fileName: "test.csv",
    csvText
  });

  assert.equal(created.importJob.rowCount, 2);
  assert.equal(created.processedSummary.all, 2);

  const listed = listImportProcessedRows("user_1", created.importJob.id, {});
  assert.equal(listed.total, 2);
  assert.equal(typeof created.importJob.directionInference?.confidence, "number");
  assert.equal(typeof listed.items[0].normalized.direction_confidence, "number");
  assert.equal(typeof listed.items[0].normalized.needs_direction_review, "boolean");

  const first = listed.items[0];
  const updated = updateImportProcessedRow("user_1", created.importJob.id, first.rowId, {
    include: false,
    memo: "skip row"
  });
  assert.equal(updated.row.include, false);

  const reprocessed = await reprocessImportRows("user_1", created.importJob.id);
  assert.equal(reprocessed.total, 2);
  assert.equal(reprocessed.summary.excluded, 1);

  const committed = await commitImport("user_1", created.importJob.id);
  assert.equal(committed.summary.scanned, 2);
  assert.equal(committed.summary.imported, 1);
  assert.equal(committed.summary.excludedRows, 1);
  assert.equal(typeof committed.summary.lowDirectionConfidenceRows, "number");
  assert.equal(typeof committed.summary.llmDirectionInference?.attempted, "number");
  assert.equal(committed.status, "completed");
  assert.equal(Boolean(committed.dateBounds.start), true);
  assert.equal(Boolean(committed.dateBounds.end), true);
});

test("ambiguous sign files use one LLM fallback attempt and continue with review flags", async () => {
  resetStoreForTests(structuredClone(EMPTY_STORE));
  ensureDefaultCategoriesForUser("user_1");

  const csvText = [
    "date,merchant,description,amount,account",
    "2025-01-01,Alpha,Alpha row,10,Checking",
    "2025-01-02,Beta,Beta row,-10,Checking",
    "2025-01-03,Gamma,Gamma row,20,Checking",
    "2025-01-04,Delta,Delta row,-20,Checking"
  ].join("\n");

  const created = await createImportJob({
    userId: "user_1",
    fileName: "ambiguous.csv",
    csvText
  });

  assert.equal(created.importJob.directionInference.llmDirectionInference.attempted, 1);
  assert.equal(created.importJob.directionInference.llmDirectionInference.succeeded, 0);
  assert.equal(created.importJob.directionInference.llmDirectionInference.failed, 1);
  assert.equal(created.importJob.directionInference.llmDirectionInference.fallbackUsed, 1);
  assert.equal(created.importJob.directionInference.strategy, "deterministic_fallback");
  assert.ok(created.importJob.directionInference.warnings.some((warning) => warning.includes("LLM direction inference failed")));

  const committed = await commitImport("user_1", created.importJob.id);
  assert.equal(committed.summary.scanned, 4);
  assert.equal(committed.summary.imported, 4);
  assert.ok(committed.summary.lowDirectionConfidenceRows >= 1);
  assert.equal(committed.summary.llmDirectionInference.attempted, 1);
  assert.equal(committed.status, "needs_review");
});
