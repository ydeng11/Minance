import { loadStore, saveStore, addAuditEvent } from "./store.js";
import { parseCsv, inferMapping } from "./csv.js";
import { normalizeMerchant, categorizeTransaction, buildMerchantMemory } from "./categorization.js";
import { parseDate, toDecimal, nowIso, createId, stableHash, normalizeText, clamp } from "./utils.js";
import { requireAiFeature } from "./ai.js";
import {
  IMPORT_PROCESSED_EDITOR_ENABLED,
  IMPORT_PROCESSING_LOGS_ENABLED,
  IMPORT_DIRECTION_INFERENCE_ENABLED,
  IMPORT_DIRECTION_LLM_ENABLED
} from "./flags.js";
import { categorizeTransactionWithLlm } from "./llm/categorize.js";
import { inferImportDirectionWithLlm } from "./llm/import-direction.js";
import {
  buildDirectionInferenceSample,
  extractRowAmountAndDirection,
  getDefaultDirectionInference,
  inferDirectionFromSignedAmount,
  inferImportDirectionDeterministic,
  parseSignedAmount
} from "./import-direction.js";

const EDITABLE_ROW_FIELDS = [
  "transaction_date",
  "merchant_raw",
  "description",
  "amount",
  "direction",
  "category_final",
  "account_name",
  "memo"
];

function logImportProcessing(message, details = null) {
  if (!IMPORT_PROCESSING_LOGS_ENABLED) {
    return;
  }

  if (details) {
    console.log(`[import-processing] ${message}`, details);
    return;
  }

  console.log(`[import-processing] ${message}`);
}

function normalizeDirectionInference(value) {
  const fallback = getDefaultDirectionInference();
  if (!value || typeof value !== "object") {
    return fallback;
  }

  return {
    ...fallback,
    ...value,
    confidence: clamp(Number(value.confidence ?? fallback.confidence), 0, 1),
    warnings: Array.isArray(value.warnings)
      ? value.warnings.map((entry) => String(entry || "").trim()).filter(Boolean)
      : [],
    auxiliaryColumns: {
      ...fallback.auxiliaryColumns,
      ...(value.auxiliaryColumns || {})
    },
    llmDirectionInference: {
      attempted: Number(value?.llmDirectionInference?.attempted || 0),
      succeeded: Number(value?.llmDirectionInference?.succeeded || 0),
      failed: Number(value?.llmDirectionInference?.failed || 0),
      fallbackUsed: Number(value?.llmDirectionInference?.fallbackUsed || 0)
    }
  };
}

function combineWarnings(...warningGroups) {
  const merged = [];
  for (const warnings of warningGroups) {
    for (const warning of warnings || []) {
      const normalized = String(warning || "").trim();
      if (!normalized || merged.includes(normalized)) {
        continue;
      }
      merged.push(normalized);
    }
  }
  return merged;
}

function getMapped(row, mapping, key) {
  const sourceKey = mapping?.[key];
  if (!sourceKey) {
    return "";
  }
  return row[sourceKey] ?? "";
}

function computeFingerprint({ userId, accountName, merchantNormalized, amount, direction, transactionDate, memo }) {
  const signedAmount = direction === "credit" ? amount : -amount;
  return stableHash(
    [
      userId,
      normalizeText(accountName),
      merchantNormalized,
      Math.abs(signedAmount).toFixed(2),
      transactionDate,
      memo ? stableHash(memo) : ""
    ].join("|")
  );
}

function ensureAccount(store, userId, accountName) {
  const normalized = normalizeText(accountName || "Imported Account");
  let account = store.accounts.find((entry) => entry.userId === userId && entry.normalizedKey === normalized);

  if (!account) {
    account = {
      id: createId("acct"),
      userId,
      normalizedKey: normalized,
      displayName: accountName || "Imported Account",
      sourceInstitution: null,
      accountType: "checking",
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    store.accounts.push(account);
  }

  return account;
}

function summarizeProcessedRows(rows = []) {
  const totals = {
    all: rows.length,
    valid: 0,
    invalid: 0,
    duplicate: 0,
    excluded: 0,
    included: 0
  };

  for (const row of rows) {
    if (totals[row.status] != null) {
      totals[row.status] += 1;
    }
    if (row.include) {
      totals.included += 1;
    }
  }

  return totals;
}

function normalizeDirection(value, fallbackAmount = null, signConvention = "negative_is_debit") {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "debit" || normalized === "credit") {
    return normalized;
  }
  if (typeof fallbackAmount === "number") {
    return inferDirectionFromSignedAmount(fallbackAmount, signConvention);
  }
  return "debit";
}

function normalizeStagedRow({
  row,
  mapping,
  userId,
  importId,
  rowIndex,
  overrides = {},
  directionInference = null
}) {
  const normalizedDirectionInference = normalizeDirectionInference(directionInference);
  const amountExtraction = extractRowAmountAndDirection({
    row,
    mapping,
    directionInference: normalizedDirectionInference
  });

  const source = {
    transaction_date: getMapped(row, mapping, "date"),
    merchant_raw: getMapped(row, mapping, "merchant") || getMapped(row, mapping, "description"),
    description: getMapped(row, mapping, "description") || getMapped(row, mapping, "merchant"),
    amount: amountExtraction.rawAmount,
    currency: String(getMapped(row, mapping, "currency") || "USD").trim().toUpperCase() || "USD",
    account_name: String(getMapped(row, mapping, "account") || "Imported Account").trim() || "Imported Account",
    category_raw: String(getMapped(row, mapping, "category_raw") || "").trim() || null,
    memo: String(getMapped(row, mapping, "memo") || "").trim() || null
  };

  const merged = {
    ...source,
    ...Object.fromEntries(
      Object.entries(overrides || {}).filter(([key]) => EDITABLE_ROW_FIELDS.includes(key) || key === "include")
    )
  };

  const transactionDate = parseDate(merged.transaction_date);
  const merchantRaw = String(merged.merchant_raw || merged.description || "").trim();
  const description = String(merged.description || merchantRaw).trim();

  let signedAmount = null;
  if (overrides.amount != null && overrides.amount !== "") {
    signedAmount = parseSignedAmount(overrides.amount);
  } else {
    signedAmount = amountExtraction.signedAmount;
  }

  let direction = "debit";
  let directionConfidence = normalizedDirectionInference.confidence;
  let directionStrategy = normalizedDirectionInference.strategy;

  const explicitDirection = String(merged.direction || "").trim().toLowerCase();
  if (explicitDirection === "debit" || explicitDirection === "credit") {
    direction = explicitDirection;
    directionConfidence = 1;
    directionStrategy = "manual_override";
  } else if (amountExtraction.directionFromColumns) {
    direction = amountExtraction.directionFromColumns;
    directionConfidence = Math.max(directionConfidence, 0.9);
    directionStrategy = "split_columns";
  } else {
    direction = normalizeDirection(explicitDirection, signedAmount, normalizedDirectionInference.signConvention);
  }

  const amount = signedAmount == null ? null : Math.abs(signedAmount);
  const currency = String(merged.currency || "USD").trim().toUpperCase() || "USD";
  const accountName = String(merged.account_name || "Imported Account").trim() || "Imported Account";
  const categoryRaw = merged.category_raw ? String(merged.category_raw).trim() : null;
  const memo = merged.memo ? String(merged.memo).trim() : null;
  const needsDirectionReview = directionConfidence < 0.6;

  const issues = [];
  if (!transactionDate) {
    issues.push("Invalid or missing transaction date");
  }
  if (!merchantRaw || merchantRaw.length < 2) {
    issues.push("Missing merchant/description");
  }
  if (amount == null || Number.isNaN(amount)) {
    issues.push("Invalid amount");
  }

  if (issues.length > 0) {
    return {
      ok: false,
      issues,
      source,
      normalized: {
        transaction_date: transactionDate,
        merchant_raw: merchantRaw,
        description,
        amount,
        direction,
        direction_confidence: directionConfidence,
        direction_strategy: directionStrategy,
        needs_direction_review: needsDirectionReview,
        currency,
        account_name: accountName,
        category_raw: categoryRaw,
        category_final: merged.category_final ? String(merged.category_final).trim() : null,
        memo,
        dedupe_fingerprint: null,
        merchant_normalized: merchantRaw ? normalizeMerchant(merchantRaw) : null
      }
    };
  }

  const merchantNormalized = normalizeMerchant(merchantRaw);
  const dedupeFingerprint = computeFingerprint({
    userId,
    accountName,
    merchantNormalized,
    amount,
    direction,
    transactionDate,
    memo
  });

  return {
    ok: true,
    issues,
    source,
    normalized: {
      import_id: importId,
      row_index: rowIndex,
      transaction_date: transactionDate,
      merchant_raw: merchantRaw,
      merchant_normalized: merchantNormalized,
      description,
      amount,
      direction,
      direction_confidence: directionConfidence,
      direction_strategy: directionStrategy,
      needs_direction_review: needsDirectionReview,
      currency,
      account_name: accountName,
      category_raw: categoryRaw,
      category_final: merged.category_final ? String(merged.category_final).trim() : null,
      memo,
      dedupe_fingerprint: dedupeFingerprint
    }
  };
}

function buildProcessedRows(store, userId, importJob, mapping, previousProcessedRows = []) {
  const rows = store.importRowsRaw
    .filter((entry) => entry.importId === importJob.id)
    .sort((a, b) => a.rowIndex - b.rowIndex);

  const previousByRowIndex = new Map(previousProcessedRows.map((entry) => [entry.rowIndex, entry]));
  const directionInference = normalizeDirectionInference(importJob.directionInference);

  const userRules = store.categoryRules.filter((entry) => entry.userId === userId);
  const merchantMemory = buildMerchantMemory(store.transactions.filter((entry) => entry.user_id === userId));

  const existingFingerprints = new Set(
    store.transactions.filter((entry) => entry.user_id === userId).map((entry) => entry.dedupe_fingerprint)
  );
  const seenFingerprints = new Set(existingFingerprints);

  const processedRows = [];
  for (const rowEntry of rows) {
    const previous = previousByRowIndex.get(rowEntry.rowIndex) || null;
    const overrides = previous?.overrides || {};
    const staged = normalizeStagedRow({
      row: rowEntry.row,
      mapping,
      userId,
      importId: importJob.id,
      rowIndex: rowEntry.rowIndex,
      overrides,
      directionInference
    });

    const include =
      overrides.include != null
        ? Boolean(overrides.include)
        : previous?.include != null
          ? Boolean(previous.include)
          : staged.ok;

    let status = staged.ok ? "valid" : "invalid";
    const issues = [...staged.issues];

    if (staged.ok && seenFingerprints.has(staged.normalized.dedupe_fingerprint)) {
      status = "duplicate";
      issues.push("Potential duplicate row");
    }

    if (staged.ok && status === "valid") {
      seenFingerprints.add(staged.normalized.dedupe_fingerprint);
    }

    if (!include) {
      status = "excluded";
    }

    let categoryConfidence = 0;
    let categoryStrategy = null;
    let needsCategoryReview = false;

    if (staged.ok) {
      const txForCategorization = {
        merchant_normalized: staged.normalized.merchant_normalized,
        description: staged.normalized.description,
        memo: staged.normalized.memo,
        direction: staged.normalized.direction,
        category_raw: staged.normalized.category_raw
      };

      const deterministic = categorizeTransaction({
        transaction: txForCategorization,
        userRules,
        merchantMemory
      });

      if (staged.normalized.category_final) {
        categoryConfidence = 1;
        categoryStrategy = "import_override";
      } else {
        staged.normalized.category_final = deterministic.category;
        categoryConfidence = deterministic.confidence;
        categoryStrategy = deterministic.strategy;
      }

      needsCategoryReview = categoryConfidence < 0.6;
      logImportProcessing("staged_row_categorized", {
        importId: importJob.id,
        rowIndex: rowEntry.rowIndex,
        strategy: categoryStrategy,
        confidence: categoryConfidence,
        needsCategoryReview,
        directionStrategy: staged.normalized.direction_strategy,
        directionConfidence: staged.normalized.direction_confidence
      });
    }

    processedRows.push({
      rowId: previous?.rowId || createId("prow"),
      importId: importJob.id,
      rowIndex: rowEntry.rowIndex,
      include,
      status,
      issues,
      source: staged.source,
      normalized: {
        ...staged.normalized,
        category_confidence: categoryConfidence,
        category_strategy: categoryStrategy,
        needs_category_review: needsCategoryReview
      },
      overrides: { ...overrides, include },
      editedAt: previous?.editedAt || null,
      updatedAt: nowIso()
    });
  }

  return processedRows;
}

function rebuildProcessedRows(store, userId, importJob) {
  const previous = store.importRowsProcessed.filter((entry) => entry.importId === importJob.id);
  const next = buildProcessedRows(store, userId, importJob, importJob.mapping, previous);
  store.importRowsProcessed = store.importRowsProcessed
    .filter((entry) => entry.importId !== importJob.id)
    .concat(next);
  return next;
}

function processedRowsForImport(store, importId) {
  return store.importRowsProcessed
    .filter((entry) => entry.importId === importId)
    .sort((a, b) => a.rowIndex - b.rowIndex);
}

function parsedCsvFromRawRows(importJob, rawRows) {
  return {
    delimiter: importJob.delimiter,
    hasHeader: importJob.hasHeader,
    headers: importJob.headers,
    rows: rawRows
      .slice()
      .sort((a, b) => a.rowIndex - b.rowIndex)
      .map((entry) => ({ rowIndex: entry.rowIndex, row: entry.row }))
  };
}

function llmDirectionStats() {
  return {
    attempted: 0,
    succeeded: 0,
    failed: 0,
    fallbackUsed: 0
  };
}

async function computeDirectionInference({ userId, parsedCsv, mapping, auxiliaryColumns }) {
  if (!IMPORT_DIRECTION_INFERENCE_ENABLED) {
    return {
      directionInference: {
        ...getDefaultDirectionInference(),
        strategy: "disabled",
        warnings: ["Direction inference disabled by feature flag"],
        llmDirectionInference: llmDirectionStats()
      },
      llmDirectionInference: llmDirectionStats()
    };
  }

  const deterministic = inferImportDirectionDeterministic({
    parsedCsv,
    mapping,
    auxiliaryColumns
  });

  const llmStats = llmDirectionStats();
  let directionInference = {
    ...deterministic,
    llmDirectionInference: llmStats
  };

  logImportProcessing("direction_inference_deterministic", {
    strategy: directionInference.strategy,
    amountMode: directionInference.amountMode,
    signConvention: directionInference.signConvention,
    confidence: directionInference.confidence,
    scoreByConvention: directionInference.scoreByConvention || null
  });

  if (
    IMPORT_DIRECTION_LLM_ENABLED
    && directionInference.amountMode === "single_amount"
    && directionInference.confidence < 0.7
  ) {
    llmStats.attempted += 1;

    const sample = buildDirectionInferenceSample({
      parsedCsv,
      mapping,
      directionInference
    });

    logImportProcessing("direction_inference_llm_attempted", {
      confidence: directionInference.confidence,
      signConvention: directionInference.signConvention
    });

    const llmResult = await inferImportDirectionWithLlm({
      userId,
      sample,
      deterministicInference: directionInference
    });

    if (llmResult.ok) {
      llmStats.succeeded += 1;
      directionInference = {
        ...directionInference,
        amountMode: llmResult.amountMode,
        signConvention: llmResult.signConvention,
        strategy: "llm_model",
        confidence: clamp(Math.max(directionInference.confidence, llmResult.confidence_internal), 0, 1),
        warnings: combineWarnings(directionInference.warnings, llmResult.warnings),
        llm: {
          provider: llmResult.provider,
          model: llmResult.model,
          reason_short: llmResult.reason_short
        },
        llmDirectionInference: llmStats
      };

      logImportProcessing("direction_inference_llm_succeeded", {
        amountMode: directionInference.amountMode,
        signConvention: directionInference.signConvention,
        confidence: directionInference.confidence,
        provider: llmResult.provider,
        model: llmResult.model
      });
    } else {
      llmStats.failed += 1;
      llmStats.fallbackUsed += 1;
      directionInference = {
        ...directionInference,
        strategy: "deterministic_fallback",
        warnings: combineWarnings(
          directionInference.warnings,
          [`LLM direction inference failed: ${llmResult.reason || "unknown"}`]
        ),
        llmDirectionInference: llmStats
      };

      logImportProcessing("direction_inference_llm_failed", {
        reason: llmResult.reason || "unknown",
        fallbackSignConvention: directionInference.signConvention,
        fallbackConfidence: directionInference.confidence
      });
    }
  }

  if (directionInference.confidence < 0.6) {
    directionInference.warnings = combineWarnings(
      directionInference.warnings,
      ["Low confidence direction inference. Rows will be flagged for review."]
    );
  }

  directionInference.llmDirectionInference = llmStats;

  return {
    directionInference,
    llmDirectionInference: llmStats
  };
}

export async function createImportJob({ userId, fileName, csvText }) {
  const parsed = parseCsv(csvText);

  let aiEnabled = true;
  try {
    requireAiFeature(userId, "import_mapping");
  } catch {
    aiEnabled = false;
  }

  const inferred = inferMapping(parsed, aiEnabled);
  const { directionInference } = await computeDirectionInference({
    userId,
    parsedCsv: parsed,
    mapping: inferred.mapping,
    auxiliaryColumns: inferred.auxiliary
  });

  const store = loadStore();
  const now = nowIso();
  const allWarnings = combineWarnings(inferred.warnings, directionInference.warnings);

  const importJob = {
    id: createId("imp"),
    userId,
    fileName: fileName || `import-${Date.now()}.csv`,
    status: allWarnings.length > 0 ? "needs_review" : "processing",
    createdAt: now,
    updatedAt: now,
    rowCount: parsed.rows.length,
    delimiter: parsed.delimiter,
    hasHeader: parsed.hasHeader,
    headers: parsed.headers,
    mapping: inferred.mapping,
    mappingConfidence: inferred.confidenceByField,
    mappingAverageConfidence: inferred.averageConfidence,
    warnings: allWarnings,
    aiSuggested: aiEnabled,
    directionInference,
    commitSummary: null
  };

  store.imports.push(importJob);
  for (const row of parsed.rows) {
    store.importRowsRaw.push({
      id: createId("raw"),
      importId: importJob.id,
      rowIndex: row.rowIndex,
      row: row.row,
      createdAt: now
    });
  }

  if (IMPORT_PROCESSED_EDITOR_ENABLED) {
    const processed = buildProcessedRows(store, userId, importJob, importJob.mapping, []);
    store.importRowsProcessed.push(...processed);
  }

  saveStore(store);
  addAuditEvent(userId, "import.created", {
    importId: importJob.id,
    rowCount: parsed.rows.length,
    directionInference: {
      amountMode: directionInference.amountMode,
      signConvention: directionInference.signConvention,
      strategy: directionInference.strategy,
      confidence: directionInference.confidence
    }
  });

  return {
    importJob,
    previewRows: parsed.rows.slice(0, 25),
    processedSummary: summarizeProcessedRows(processedRowsForImport(store, importJob.id))
  };
}

export function getImportById(userId, importId) {
  const store = loadStore();
  const importJob = store.imports.find((entry) => entry.id === importId && entry.userId === userId);
  if (!importJob) {
    throw new Error("Import not found");
  }

  const previewRows = store.importRowsRaw
    .filter((entry) => entry.importId === importId)
    .slice(0, 25)
    .map((entry) => ({ rowIndex: entry.rowIndex, row: entry.row }));

  const diagnostics = store.importRowDiagnostics
    .filter((entry) => entry.importId === importId)
    .map((entry) => ({ rowIndex: entry.rowIndex, type: entry.type, message: entry.message }));

  const processedRows = processedRowsForImport(store, importId);

  return {
    importJob: {
      ...importJob,
      directionInference: normalizeDirectionInference(importJob.directionInference)
    },
    previewRows,
    diagnostics,
    processedPreview: processedRows.slice(0, 25),
    processedSummary: summarizeProcessedRows(processedRows)
  };
}

export function listImportProcessedRows(userId, importId, options = {}) {
  const store = loadStore();
  const importJob = store.imports.find((entry) => entry.id === importId && entry.userId === userId);
  if (!importJob) {
    throw new Error("Import not found");
  }

  const offset = Math.max(0, Number(options.offset || 0));
  const limit = Math.max(1, Math.min(500, Number(options.limit || 100)));
  const status = options.status ? String(options.status) : null;

  let rows = processedRowsForImport(store, importId);
  if (status) {
    rows = rows.filter((entry) => entry.status === status);
  }

  return {
    total: rows.length,
    offset,
    limit,
    items: rows.slice(offset, offset + limit),
    summary: summarizeProcessedRows(processedRowsForImport(store, importId))
  };
}

export function updateImportProcessedRow(userId, importId, rowId, payload = {}) {
  const store = loadStore();
  const importJob = store.imports.find((entry) => entry.id === importId && entry.userId === userId);
  if (!importJob) {
    throw new Error("Import not found");
  }

  const target = store.importRowsProcessed.find((entry) => entry.importId === importId && entry.rowId === rowId);
  if (!target) {
    throw new Error("Processed row not found");
  }

  const updates = {};
  for (const field of EDITABLE_ROW_FIELDS) {
    if (Object.hasOwn(payload, field)) {
      updates[field] = payload[field];
    }
  }
  if (Object.hasOwn(payload, "include")) {
    updates.include = Boolean(payload.include);
  }

  target.overrides = {
    ...(target.overrides || {}),
    ...updates
  };
  target.editedAt = nowIso();

  const rebuilt = rebuildProcessedRows(store, userId, importJob);
  importJob.updatedAt = nowIso();
  saveStore(store);
  addAuditEvent(userId, "import.processed_row.updated", { importId, rowId });

  const updated = rebuilt.find((entry) => entry.rowId === rowId) || null;
  return {
    row: updated,
    summary: summarizeProcessedRows(rebuilt)
  };
}

export async function reprocessImportRows(userId, importId) {
  const store = loadStore();
  const importJob = store.imports.find((entry) => entry.id === importId && entry.userId === userId);
  if (!importJob) {
    throw new Error("Import not found");
  }

  const rawRows = store.importRowsRaw.filter((entry) => entry.importId === importId);
  const parsedCsv = parsedCsvFromRawRows(importJob, rawRows);
  const inferred = inferMapping(parsedCsv, importJob.aiSuggested);
  const { directionInference } = await computeDirectionInference({
    userId,
    parsedCsv,
    mapping: importJob.mapping,
    auxiliaryColumns: inferred.auxiliary
  });

  importJob.directionInference = directionInference;
  importJob.warnings = combineWarnings(
    (importJob.warnings || []).filter((warning) => !String(warning).toLowerCase().includes("direction")),
    directionInference.warnings
  );

  const rebuilt = rebuildProcessedRows(store, userId, importJob);
  importJob.updatedAt = nowIso();
  saveStore(store);
  addAuditEvent(userId, "import.reprocessed", { importId });

  return {
    total: rebuilt.length,
    summary: summarizeProcessedRows(rebuilt)
  };
}

export async function updateImportMapping(userId, importId, mapping) {
  const store = loadStore();
  const importJob = store.imports.find((entry) => entry.id === importId && entry.userId === userId);
  if (!importJob) {
    throw new Error("Import not found");
  }

  const required = ["date", "merchant", "amount"];
  for (const key of required) {
    if (!mapping?.[key]) {
      throw new Error(`Required mapping missing: ${key}`);
    }
  }

  const rawRows = store.importRowsRaw.filter((entry) => entry.importId === importId);
  const parsedCsv = parsedCsvFromRawRows(importJob, rawRows);
  const inferred = inferMapping(parsedCsv, importJob.aiSuggested);

  const { directionInference } = await computeDirectionInference({
    userId,
    parsedCsv,
    mapping,
    auxiliaryColumns: inferred.auxiliary
  });

  importJob.mapping = mapping;
  importJob.updatedAt = nowIso();
  importJob.status = "processing";
  importJob.warnings = combineWarnings(directionInference.warnings);
  importJob.directionInference = directionInference;

  if (IMPORT_PROCESSED_EDITOR_ENABLED) {
    rebuildProcessedRows(store, userId, importJob);
  }

  saveStore(store);
  addAuditEvent(userId, "import.mapping.updated", { importId });

  return importJob;
}

function buildDateBounds(transactions = []) {
  const dates = transactions.map((entry) => entry.transaction_date).filter(Boolean).sort((a, b) => a.localeCompare(b));
  if (!dates.length) {
    return { start: null, end: null };
  }
  return {
    start: dates[0],
    end: dates[dates.length - 1]
  };
}

function isEligibleProcessedRow(row) {
  return row.include === true && row.status === "valid";
}

export async function commitImport(userId, importId) {
  const store = loadStore();
  const importJob = store.imports.find((entry) => entry.id === importId && entry.userId === userId);
  if (!importJob) {
    throw new Error("Import not found");
  }

  if (IMPORT_PROCESSED_EDITOR_ENABLED && processedRowsForImport(store, importId).length === 0) {
    rebuildProcessedRows(store, userId, importJob);
  }

  const processedRows = processedRowsForImport(store, importId);
  const rows = processedRows.length
    ? processedRows
    : buildProcessedRows(store, userId, importJob, importJob.mapping, []);

  if (!processedRows.length && rows.length) {
    store.importRowsProcessed.push(...rows);
  }

  const userRules = store.categoryRules.filter((entry) => entry.userId === userId);
  const merchantMemory = buildMerchantMemory(store.transactions.filter((entry) => entry.user_id === userId));
  const existingFingerprints = new Set(
    store.transactions.filter((entry) => entry.user_id === userId).map((entry) => entry.dedupe_fingerprint)
  );

  store.importRowDiagnostics = store.importRowDiagnostics.filter((entry) => entry.importId !== importId);

  const normalizedDirectionInference = normalizeDirectionInference(importJob.directionInference);

  const summary = {
    scanned: rows.length,
    imported: 0,
    duplicatesSkipped: 0,
    invalidRows: 0,
    excludedRows: 0,
    lowConfidenceRows: 0,
    lowDirectionConfidenceRows: 0,
    llmCategorization: {
      attempted: 0,
      succeeded: 0,
      failed: 0,
      fallbackUsed: 0
    },
    llmDirectionInference: {
      ...normalizedDirectionInference.llmDirectionInference
    },
    processedTotals: summarizeProcessedRows(rows),
    dateBounds: { start: null, end: null }
  };

  const importedTransactions = [];

  logImportProcessing("commit_started", {
    importId,
    userId,
    scannedRows: rows.length,
    directionInference: {
      amountMode: normalizedDirectionInference.amountMode,
      signConvention: normalizedDirectionInference.signConvention,
      strategy: normalizedDirectionInference.strategy,
      confidence: normalizedDirectionInference.confidence
    }
  });

  for (const rowEntry of rows) {
    if (!rowEntry.include) {
      summary.excludedRows += 1;
      continue;
    }

    if (rowEntry.status === "duplicate") {
      summary.duplicatesSkipped += 1;
      store.importRowDiagnostics.push({
        id: createId("diag"),
        importId,
        rowIndex: rowEntry.rowIndex,
        type: "duplicate",
        message: "Potential duplicate skipped",
        createdAt: nowIso()
      });
      continue;
    }

    if (rowEntry.status !== "valid") {
      summary.invalidRows += 1;
      for (const message of rowEntry.issues || ["Invalid row"]) {
        store.importRowDiagnostics.push({
          id: createId("diag"),
          importId,
          rowIndex: rowEntry.rowIndex,
          type: "validation",
          message,
          createdAt: nowIso()
        });
      }
      continue;
    }

    const normalized = rowEntry.normalized;
    const signedAmount = normalized.direction === "debit" ? -normalized.amount : normalized.amount;
    if (existingFingerprints.has(normalized.dedupe_fingerprint)) {
      summary.duplicatesSkipped += 1;
      continue;
    }

    const account = ensureAccount(store, userId, normalized.account_name);

    const tx = {
      id: createId("txn"),
      user_id: userId,
      account_id: account.id,
      account_key: account.normalizedKey,
      source_type: "imported",
      source_file_id: importId,
      transaction_date: normalized.transaction_date,
      post_date: null,
      merchant_raw: normalized.merchant_raw,
      merchant_normalized: normalized.merchant_normalized,
      description: normalized.description,
      amount: normalized.amount,
      currency: normalized.currency,
      direction: normalized.direction,
      category_raw: normalized.category_raw,
      category_final: normalized.category_final || "Uncategorized",
      category_confidence: Number(normalized.category_confidence || 0),
      category_strategy: normalized.category_strategy || null,
      needs_category_review: false,
      memo: normalized.memo,
      dedupe_fingerprint: normalized.dedupe_fingerprint,
      created_at: nowIso(),
      updated_at: nowIso()
    };

    if (!normalized.category_final) {
      const deterministic = categorizeTransaction({
        transaction: tx,
        userRules,
        merchantMemory
      });

      tx.category_final = deterministic.category;
      tx.category_confidence = deterministic.confidence;
      tx.category_strategy = deterministic.strategy;

      // Model stage comes after rule and merchant memory stages.
      if (!["rule_exact", "rule_contains", "rule_regex", "merchant_memory"].includes(deterministic.strategy)) {
        logImportProcessing("llm_categorization_attempted", {
          importId,
          rowIndex: rowEntry.rowIndex,
          merchant: tx.merchant_normalized,
          deterministicStrategy: deterministic.strategy
        });
        summary.llmCategorization.attempted += 1;
        const llmResult = await categorizeTransactionWithLlm({
          userId,
          transaction: tx,
          userRules
        });

        if (llmResult.ok) {
          tx.category_final = llmResult.category;
          tx.category_confidence = llmResult.confidence_internal;
          tx.category_strategy = "llm_model";
          summary.llmCategorization.succeeded += 1;
          logImportProcessing("llm_categorization_succeeded", {
            importId,
            rowIndex: rowEntry.rowIndex,
            merchant: tx.merchant_normalized,
            category: tx.category_final,
            confidence: tx.category_confidence
          });
        } else {
          summary.llmCategorization.failed += 1;
          summary.llmCategorization.fallbackUsed += 1;
          logImportProcessing("llm_categorization_failed", {
            importId,
            rowIndex: rowEntry.rowIndex,
            merchant: tx.merchant_normalized,
            reason: llmResult.reason || "unknown",
            fallbackStrategy: deterministic.strategy
          });
        }
      }
    } else {
      tx.category_confidence = 1;
      tx.category_strategy = "import_override";
    }

    tx.needs_category_review = tx.category_confidence < 0.6;
    if (tx.needs_category_review) {
      summary.lowConfidenceRows += 1;
    }

    if (normalized.needs_direction_review) {
      summary.lowDirectionConfidenceRows += 1;
      store.importRowDiagnostics.push({
        id: createId("diag"),
        importId,
        rowIndex: rowEntry.rowIndex,
        type: "direction_confidence",
        message: `Direction confidence low (${Number(normalized.direction_confidence || 0).toFixed(2)})`,
        createdAt: nowIso()
      });
    }

    existingFingerprints.add(tx.dedupe_fingerprint);
    merchantMemory[tx.merchant_normalized] = tx.category_final;
    store.transactions.push(tx);
    importedTransactions.push(tx);
    summary.imported += 1;

    // Keep signed amount reference available if needed in future diagnostics.
    void signedAmount;
  }

  summary.dateBounds = buildDateBounds(importedTransactions);

  logImportProcessing("commit_finished", {
    importId,
    status: summary.lowConfidenceRows > 0 || summary.lowDirectionConfidenceRows > 0 ? "needs_review" : "completed",
    imported: summary.imported,
    duplicatesSkipped: summary.duplicatesSkipped,
    invalidRows: summary.invalidRows,
    excludedRows: summary.excludedRows,
    lowDirectionConfidenceRows: summary.lowDirectionConfidenceRows,
    llmCategorization: summary.llmCategorization,
    llmDirectionInference: summary.llmDirectionInference
  });

  importJob.commitSummary = summary;
  importJob.updatedAt = nowIso();
  importJob.status = summary.lowConfidenceRows > 0 || summary.lowDirectionConfidenceRows > 0 ? "needs_review" : "completed";

  saveStore(store);
  addAuditEvent(userId, "import.committed", { importId, summary });

  return {
    importId,
    status: importJob.status,
    summary,
    dateBounds: summary.dateBounds,
    processedTotals: summary.processedTotals
  };
}
