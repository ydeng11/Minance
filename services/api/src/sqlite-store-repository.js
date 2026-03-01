import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { SQLITE_FILE } from "./config.js";
import { STORE_TABLE_SPECS, getRowsForSpec } from "../../../scripts/sqlite-cutover-lib.mjs";

const SQLITE_MAX_BUFFER = 1024 * 1024 * 20;

function sqlLiteral(value) {
  if (value == null) {
    return "NULL";
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "NULL";
  }
  if (typeof value === "boolean") {
    return value ? "1" : "0";
  }
  const serialized = typeof value === "object" ? JSON.stringify(value) : String(value);
  return `'${serialized.replace(/'/g, "''")}'`;
}

function sqliteExec(args, options = {}) {
  return spawnSync("sqlite3", args, {
    encoding: "utf8",
    maxBuffer: SQLITE_MAX_BUFFER,
    ...(options || {})
  });
}

function runSqlScript(dbPath, sql) {
  const result = sqliteExec([dbPath], { input: sql });
  if (result.status !== 0 || result.error) {
    const reason = result.error?.message || result.stderr || "sqlite3 command failed";
    throw new Error(String(reason).trim());
  }
}

function sqliteQueryJson(dbPath, sql) {
  const result = sqliteExec(["-json", dbPath, sql]);
  if (result.status !== 0 || result.error) {
    const reason = result.error?.message || result.stderr || "sqlite3 JSON query failed";
    throw new Error(String(reason).trim());
  }

  const raw = String(result.stdout || "").trim();
  if (!raw) {
    return [];
  }

  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

function resolveDbPath(options = {}) {
  return options.dbPath || SQLITE_FILE;
}

function parsePayloadRow(row, tableName) {
  try {
    const parsed = JSON.parse(String(row.payload_json || "null"));
    if (parsed == null) {
      return {};
    }
    if (typeof parsed === "object") {
      return parsed;
    }
    return { value: parsed };
  } catch (error) {
    throw new Error(
      `Failed to parse payload_json for table ${tableName}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

function insertStatement(tableName, mapped) {
  const columns = Object.keys(mapped);
  const quotedColumns = columns.map((column) => `"${column}"`).join(", ");
  const values = columns.map((column) => sqlLiteral(mapped[column])).join(", ");
  return `INSERT INTO ${tableName}(${quotedColumns}) VALUES (${values});`;
}

function ensureText(value, fallback) {
  if (value == null || value === "") {
    return fallback;
  }
  return String(value);
}

function ensureInteger(value, fallback = 0) {
  if (value == null || value === "") {
    return fallback;
  }
  const numeric = Number.parseInt(String(value), 10);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function withRequiredColumns(spec, mapped, row, rowIndex) {
  const ensured = { ...(mapped || {}) };
  ensured.payload_json = ensured.payload_json ?? JSON.stringify(row || {});

  if (spec.tableName === "users") {
    ensured.id = ensureText(ensured.id, `user_${rowIndex}`);
    ensured.email = ensureText(ensured.email, `${ensured.id}@minance.local`);
  } else if (spec.tableName === "sessions") {
    ensured.id = ensureText(ensured.id, `session_${rowIndex}`);
    ensured.user_id = ensureText(ensured.user_id, "unknown_user");
  } else if (spec.tableName === "accounts") {
    ensured.id = ensureText(ensured.id, `account_${rowIndex}`);
    ensured.user_id = ensureText(ensured.user_id, "unknown_user");
  } else if (spec.tableName === "transactions") {
    ensured.id = ensureText(ensured.id, `txn_${rowIndex}`);
    ensured.user_id = ensureText(ensured.user_id, "unknown_user");
    ensured.needs_category_review = ensureInteger(ensured.needs_category_review, 0);
  } else if (spec.tableName === "categories") {
    ensured.id = ensureText(ensured.id, `category_${rowIndex}`);
    ensured.user_id = ensureText(ensured.user_id, "unknown_user");
    ensured.name = ensureText(ensured.name, "Uncategorized");
  } else if (spec.tableName === "category_strategies") {
    ensured.id = ensureText(ensured.id, `strategy_${rowIndex}`);
    ensured.user_id = ensureText(ensured.user_id, "unknown_user");
  } else if (spec.tableName === "category_rules") {
    ensured.id = ensureText(ensured.id, `rule_${rowIndex}`);
    ensured.user_id = ensureText(ensured.user_id, "unknown_user");
  } else if (spec.tableName === "imports") {
    ensured.id = ensureText(ensured.id, `import_${rowIndex}`);
    ensured.user_id = ensureText(ensured.user_id, "unknown_user");
  } else if (spec.tableName === "import_rows_raw") {
    ensured.id = ensureText(ensured.id, `raw_row_${rowIndex}`);
    ensured.import_id = ensureText(ensured.import_id, "unknown_import");
    ensured.row_index = ensureInteger(ensured.row_index, rowIndex);
  } else if (spec.tableName === "import_rows_processed") {
    ensured.row_id = ensureText(ensured.row_id, `processed_row_${rowIndex}`);
    ensured.import_id = ensureText(ensured.import_id, "unknown_import");
    ensured.row_index = ensureInteger(ensured.row_index, rowIndex);
  } else if (spec.tableName === "import_row_diagnostics") {
    ensured.id = ensureText(ensured.id, `diag_${rowIndex}`);
    ensured.import_id = ensureText(ensured.import_id, "unknown_import");
  } else if (spec.tableName === "ai_provider_credentials") {
    ensured.id = ensureText(ensured.id, `cred_${rowIndex}`);
    ensured.user_id = ensureText(ensured.user_id, "unknown_user");
    ensured.provider = ensureText(ensured.provider, "openai");
  } else if (spec.tableName === "ai_provider_preferences") {
    ensured.user_id = ensureText(ensured.user_id, "unknown_user");
  } else if (spec.tableName === "assistant_queries") {
    ensured.id = ensureText(ensured.id, `assistant_query_${rowIndex}`);
    ensured.user_id = ensureText(ensured.user_id, "unknown_user");
  } else if (spec.tableName === "saved_views") {
    ensured.id = ensureText(ensured.id, `saved_view_${rowIndex}`);
    ensured.user_id = ensureText(ensured.user_id, "unknown_user");
  } else if (spec.tableName === "migration_runs") {
    ensured.id = ensureText(ensured.id, `migration_${rowIndex}`);
    ensured.user_id = ensureText(ensured.user_id, "unknown_user");
  } else if (spec.tableName === "audit_events") {
    ensured.id = ensureText(ensured.id, `audit_${rowIndex}`);
    ensured.user_id = ensureText(ensured.user_id, "unknown_user");
    ensured.action = ensureText(ensured.action, "unknown_action");
  }

  return ensured;
}

export function readStoreCollectionsFromSqlite(options = {}) {
  const dbPath = resolveDbPath(options);
  const result = {};

  for (const spec of STORE_TABLE_SPECS) {
    const rows = sqliteQueryJson(
      dbPath,
      `SELECT payload_json FROM ${spec.tableName} ORDER BY rowid;`
    );
    result[spec.storeKey] = rows.map((row) => parsePayloadRow(row, spec.tableName));
  }

  return result;
}

export function writeStoreCollectionsToSqlite(store, options = {}) {
  const dbPath = resolveDbPath(options);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const lines = [
    "PRAGMA foreign_keys = ON;",
    "BEGIN IMMEDIATE TRANSACTION;"
  ];

  for (const spec of STORE_TABLE_SPECS) {
    lines.push(`DELETE FROM ${spec.tableName};`);
    const rows = getRowsForSpec(store, spec);
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const mapped = spec.mapRow(row || {});
      const ensured = withRequiredColumns(spec, mapped, row, index);
      lines.push(insertStatement(spec.tableName, ensured));
    }
  }

  lines.push("COMMIT;");
  runSqlScript(dbPath, lines.join("\n"));
}
