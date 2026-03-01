import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const ROOT_DIR = path.resolve(__dirname, "..");

export const STORE_TABLE_SPECS = [
  {
    storeKey: "users",
    tableName: "users",
    keyColumns: ["id"],
    sampleKey: { source: "id", table: "id" },
    mapRow: (row) => ({
      id: row.id ?? null,
      email: row.email ?? null,
      password_hash: row.passwordHash ?? null,
      password_salt: row.passwordSalt ?? null,
      created_at: row.createdAt ?? null,
      updated_at: row.updatedAt ?? null,
      payload_json: JSON.stringify(row ?? {})
    })
  },
  {
    storeKey: "sessions",
    tableName: "sessions",
    keyColumns: ["id"],
    sampleKey: { source: "id", table: "id" },
    mapRow: (row) => ({
      id: row.id ?? null,
      user_id: row.userId ?? row.user_id ?? null,
      access_token: row.accessToken ?? null,
      refresh_token: row.refreshToken ?? null,
      access_expires_at: row.accessExpiresAt ?? null,
      refresh_expires_at: row.refreshExpiresAt ?? null,
      created_at: row.createdAt ?? null,
      updated_at: row.updatedAt ?? null,
      payload_json: JSON.stringify(row ?? {})
    })
  },
  {
    storeKey: "accounts",
    tableName: "accounts",
    keyColumns: ["id"],
    sampleKey: { source: "id", table: "id" },
    mapRow: (row) => ({
      id: row.id ?? null,
      user_id: row.userId ?? row.user_id ?? null,
      normalized_key: row.normalizedKey ?? row.normalized_key ?? null,
      display_name: row.displayName ?? row.display_name ?? null,
      source_institution: row.sourceInstitution ?? row.source_institution ?? null,
      account_type: row.accountType ?? row.account_type ?? null,
      created_at: row.createdAt ?? row.created_at ?? null,
      updated_at: row.updatedAt ?? row.updated_at ?? null,
      payload_json: JSON.stringify(row ?? {})
    })
  },
  {
    storeKey: "transactions",
    tableName: "transactions",
    keyColumns: ["id"],
    sampleKey: { source: "id", table: "id" },
    mapRow: (row) => ({
      id: row.id ?? null,
      user_id: row.user_id ?? row.userId ?? null,
      account_id: row.account_id ?? row.accountId ?? null,
      account_key: row.account_key ?? row.accountKey ?? null,
      source_type: row.source_type ?? row.sourceType ?? null,
      source_file_id: row.source_file_id ?? row.sourceFileId ?? null,
      transaction_date: row.transaction_date ?? row.transactionDate ?? null,
      post_date: row.post_date ?? row.postDate ?? null,
      merchant_raw: row.merchant_raw ?? row.merchantRaw ?? null,
      merchant_normalized: row.merchant_normalized ?? row.merchantNormalized ?? null,
      description: row.description ?? null,
      amount: toFiniteNumber(row.amount),
      currency: row.currency ?? null,
      direction: row.direction ?? null,
      category_raw: row.category_raw ?? row.categoryRaw ?? null,
      category_final: row.category_final ?? row.categoryFinal ?? null,
      category_coarse: row.category_coarse ?? row.categoryCoarse ?? null,
      category_emoji: row.category_emoji ?? row.categoryEmoji ?? null,
      category_confidence: toFiniteNumber(row.category_confidence ?? row.categoryConfidence),
      category_strategy: row.category_strategy ?? row.categoryStrategy ?? null,
      needs_category_review: toNullableBooleanInt(
        row.needs_category_review ?? row.needsCategoryReview
      ),
      memo: row.memo ?? null,
      dedupe_fingerprint: row.dedupe_fingerprint ?? row.dedupeFingerprint ?? null,
      created_at: row.created_at ?? row.createdAt ?? null,
      updated_at: row.updated_at ?? row.updatedAt ?? null,
      payload_json: JSON.stringify(row ?? {})
    })
  },
  {
    storeKey: "categories",
    tableName: "categories",
    keyColumns: ["id"],
    sampleKey: { source: "id", table: "id" },
    mapRow: (row) => ({
      id: row.id ?? null,
      user_id: row.userId ?? row.user_id ?? null,
      name: row.name ?? null,
      is_system: toNullableBooleanInt(row.isSystem ?? row.is_system),
      created_at: row.createdAt ?? row.created_at ?? null,
      updated_at: row.updatedAt ?? row.updated_at ?? null,
      payload_json: JSON.stringify(row ?? {})
    })
  },
  {
    storeKey: "categoryStrategies",
    tableName: "category_strategies",
    keyColumns: ["id"],
    sampleKey: { source: "id", table: "id" },
    mapRow: (row) => ({
      id: row.id ?? null,
      user_id: row.userId ?? row.user_id ?? null,
      source_url: row.sourceUrl ?? row.source_url ?? null,
      version: row.version ?? null,
      coarse_categories_json: toJsonOrNull(row.coarseCategories ?? row.coarse_categories),
      granular_categories_json: toJsonOrNull(row.granularCategories ?? row.granular_categories),
      created_at: row.createdAt ?? row.created_at ?? null,
      updated_at: row.updatedAt ?? row.updated_at ?? null,
      payload_json: JSON.stringify(row ?? {})
    })
  },
  {
    storeKey: "categoryRules",
    tableName: "category_rules",
    keyColumns: ["id"],
    sampleKey: { source: "id", table: "id" },
    mapRow: (row) => ({
      id: row.id ?? null,
      user_id: row.userId ?? row.user_id ?? null,
      type: row.type ?? null,
      pattern: row.pattern ?? null,
      category: row.category ?? null,
      priority: toFiniteInt(row.priority),
      created_at: row.createdAt ?? row.created_at ?? null,
      updated_at: row.updatedAt ?? row.updated_at ?? null,
      generated_from_corrections: toNullableBooleanInt(
        row.generatedFromCorrections ?? row.generated_from_corrections
      ),
      payload_json: JSON.stringify(row ?? {})
    })
  },
  {
    storeKey: "imports",
    tableName: "imports",
    keyColumns: ["id"],
    sampleKey: { source: "id", table: "id" },
    mapRow: (row) => ({
      id: row.id ?? null,
      user_id: row.userId ?? row.user_id ?? null,
      file_name: row.fileName ?? row.file_name ?? null,
      status: row.status ?? null,
      created_at: row.createdAt ?? row.created_at ?? null,
      updated_at: row.updatedAt ?? row.updated_at ?? null,
      row_count: toFiniteInt(row.rowCount ?? row.row_count),
      delimiter: row.delimiter ?? null,
      has_header: toNullableBooleanInt(row.hasHeader ?? row.has_header),
      headers_json: toJsonOrNull(row.headers),
      mapping_json: toJsonOrNull(row.mapping),
      mapping_confidence: toFiniteNumber(row.mappingConfidence ?? row.mapping_confidence),
      mapping_average_confidence: toFiniteNumber(
        row.mappingAverageConfidence ?? row.mapping_average_confidence
      ),
      warnings_json: toJsonOrNull(row.warnings),
      ai_suggested: toNullableBooleanInt(row.aiSuggested ?? row.ai_suggested),
      direction_inference_json: toJsonOrNull(row.directionInference ?? row.direction_inference),
      commit_summary_json: toJsonOrNull(row.commitSummary ?? row.commit_summary),
      payload_json: JSON.stringify(row ?? {})
    })
  },
  {
    storeKey: "importRowsRaw",
    tableName: "import_rows_raw",
    keyColumns: ["id"],
    sampleKey: { source: "id", table: "id" },
    mapRow: (row) => ({
      id: row.id ?? null,
      import_id: row.importId ?? row.import_id ?? null,
      row_index: toFiniteInt(row.rowIndex ?? row.row_index),
      row_json: toJsonOrNull(row.row),
      created_at: row.createdAt ?? row.created_at ?? null,
      payload_json: JSON.stringify(row ?? {})
    })
  },
  {
    storeKey: "importRowsProcessed",
    tableName: "import_rows_processed",
    keyColumns: ["row_id"],
    sampleKey: { source: "rowId", table: "row_id" },
    mapRow: (row) => ({
      row_id: row.rowId ?? row.row_id ?? null,
      import_id: row.importId ?? row.import_id ?? null,
      row_index: toFiniteInt(row.rowIndex ?? row.row_index),
      include: toNullableBooleanInt(row.include),
      status: row.status ?? null,
      issues_json: toJsonOrNull(row.issues),
      source_json: toJsonOrNull(row.source),
      normalized_json: toJsonOrNull(row.normalized),
      overrides_json: toJsonOrNull(row.overrides),
      edited_at: row.editedAt ?? row.edited_at ?? null,
      updated_at: row.updatedAt ?? row.updated_at ?? null,
      payload_json: JSON.stringify(row ?? {})
    })
  },
  {
    storeKey: "importRowDiagnostics",
    tableName: "import_row_diagnostics",
    keyColumns: ["id"],
    sampleKey: { source: "id", table: "id" },
    mapRow: (row) => ({
      id: row.id ?? null,
      import_id: row.importId ?? row.import_id ?? null,
      row_index: toFiniteInt(row.rowIndex ?? row.row_index),
      type: row.type ?? null,
      message: row.message ?? null,
      created_at: row.createdAt ?? row.created_at ?? null,
      payload_json: JSON.stringify(row ?? {})
    })
  },
  {
    storeKey: "aiProviderCredentials",
    tableName: "ai_provider_credentials",
    keyColumns: ["id"],
    sampleKey: { source: "id", table: "id" },
    mapRow: (row) => ({
      id: row.id ?? null,
      user_id: row.userId ?? row.user_id ?? null,
      provider: row.provider ?? null,
      label: row.label ?? null,
      encrypted_json: toJsonOrNull(row.encrypted),
      masked_key: row.maskedKey ?? row.masked_key ?? null,
      status: row.status ?? null,
      created_at: row.createdAt ?? row.created_at ?? null,
      updated_at: row.updatedAt ?? row.updated_at ?? null,
      last_validated_at: row.lastValidatedAt ?? row.last_validated_at ?? null,
      payload_json: JSON.stringify(row ?? {})
    })
  },
  {
    storeKey: "aiProviderPreferences",
    tableName: "ai_provider_preferences",
    keyColumns: ["user_id"],
    sampleKey: { source: "userId", table: "user_id" },
    mapRow: (row) => ({
      user_id: row.userId ?? row.user_id ?? null,
      default_provider: row.defaultProvider ?? row.default_provider ?? null,
      default_model: row.defaultModel ?? row.default_model ?? null,
      failover_providers_json: toJsonOrNull(row.failoverProviders ?? row.failover_providers),
      feature_overrides_json: toJsonOrNull(row.featureOverrides ?? row.feature_overrides),
      updated_at: row.updatedAt ?? row.updated_at ?? null,
      payload_json: JSON.stringify(row ?? {})
    })
  },
  {
    storeKey: "assistantQueries",
    tableName: "assistant_queries",
    keyColumns: ["id"],
    sampleKey: { source: "id", table: "id" },
    mapRow: (row) => ({
      id: row.id ?? null,
      user_id: row.userId ?? row.user_id ?? null,
      question: row.question ?? null,
      plan_json: toJsonOrNull(row.plan),
      result_json: toJsonOrNull(row.result),
      created_at: row.createdAt ?? row.created_at ?? null,
      payload_json: JSON.stringify(row ?? {})
    })
  },
  {
    storeKey: "savedViews",
    tableName: "saved_views",
    keyColumns: ["id"],
    sampleKey: { source: "id", table: "id" },
    mapRow: (row) => ({
      id: row.id ?? null,
      user_id: row.userId ?? row.user_id ?? null,
      name: row.name ?? null,
      filters_json: toJsonOrNull(row.filters),
      layout_json: toJsonOrNull(row.layout),
      created_at: row.createdAt ?? row.created_at ?? null,
      updated_at: row.updatedAt ?? row.updated_at ?? null,
      payload_json: JSON.stringify(row ?? {})
    })
  },
  {
    storeKey: "migrationRuns",
    tableName: "migration_runs",
    keyColumns: ["id"],
    sampleKey: { source: "id", table: "id" },
    mapRow: (row) => ({
      id: row.id ?? null,
      user_id: row.userId ?? row.user_id ?? null,
      status: row.status ?? null,
      sqlite_path: row.sqlitePath ?? row.sqlite_path ?? null,
      created_at: row.createdAt ?? row.created_at ?? null,
      updated_at: row.updatedAt ?? row.updated_at ?? null,
      report_json: toJsonOrNull(row.report),
      payload_json: JSON.stringify(row ?? {})
    })
  },
  {
    storeKey: "auditEvents",
    tableName: "audit_events",
    keyColumns: ["id"],
    sampleKey: { source: "id", table: "id" },
    mapRow: (row) => ({
      id: row.id ?? null,
      user_id: row.userId ?? row.user_id ?? null,
      action: row.action ?? null,
      details_json: toJsonOrNull(row.details),
      created_at: row.createdAt ?? row.created_at ?? null,
      payload_json: JSON.stringify(row ?? {})
    })
  }
];

export function parseArgs(argv) {
  const parsed = {};
  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      continue;
    }

    const key = token.slice(2);
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      parsed[key] = next;
      index += 1;
      continue;
    }
    parsed[key] = true;
  }
  return parsed;
}

export function resolvePathFromRoot(candidate, fallbackRelativePath) {
  const raw = candidate || fallbackRelativePath;
  if (!raw) {
    throw new Error("Path is required");
  }
  return path.isAbsolute(raw) ? raw : path.join(ROOT_DIR, raw);
}

export function loadStoreFromPath(sourcePath) {
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Source JSON store not found: ${sourcePath}`);
  }
  const raw = fs.readFileSync(sourcePath, "utf8");
  const parsed = JSON.parse(raw);
  return parsed && typeof parsed === "object" ? parsed : {};
}

export function getRowsForSpec(store, spec) {
  const rows = store?.[spec.storeKey];
  return Array.isArray(rows) ? rows : [];
}

export function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const keys = Object.keys(value).sort();
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function toJsonOrNull(value) {
  if (value == null) {
    return null;
  }
  return JSON.stringify(value);
}

function toNullableBooleanInt(value) {
  if (value == null) {
    return null;
  }
  return value ? 1 : 0;
}

function toFiniteNumber(value) {
  if (value == null || value === "") {
    return null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function toFiniteInt(value) {
  if (value == null || value === "") {
    return null;
  }
  const numeric = Number.parseInt(String(value), 10);
  return Number.isFinite(numeric) ? numeric : null;
}
