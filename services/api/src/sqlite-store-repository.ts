import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { SQLITE_FILE } from "./config.ts";
import { STORE_TABLE_SPECS, getRowsForSpec } from "../../../scripts/sqlite-cutover-lib.ts";

const SQLITE_MAX_BUFFER = 1024 * 1024 * 20;
const SQLITE_READ_BATCH_SIZE = 1000;
const SQLITE_BUSY_TIMEOUT_MS = 5_000;
const STORE_TABLE_SPECS_BY_TABLE = new Map(STORE_TABLE_SPECS.map((spec) => [spec.tableName, spec]));

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
  return spawnSync("sqlite3", ["-bail", "-cmd", `.timeout ${SQLITE_BUSY_TIMEOUT_MS}`, ...args], {
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

function isSqliteBufferError(error) {
  return error instanceof Error && error.message.includes("ENOBUFS");
}

function readPayloadRowsInBatches(dbPath, tableName) {
  const rows = [];
  let lastRowId = 0;
  let batchSize = SQLITE_READ_BATCH_SIZE;

  while (true) {
    try {
      const batch = sqliteQueryJson(
        dbPath,
        `SELECT rowid AS __rowid__, payload_json
         FROM ${tableName}
         WHERE rowid > ${lastRowId}
         ORDER BY rowid
         LIMIT ${batchSize};`
      );

      if (batch.length === 0) {
        break;
      }

      for (const row of batch) {
        const parsedRowId = Number(row.__rowid__);
        if (Number.isFinite(parsedRowId)) {
          lastRowId = parsedRowId;
        }
        rows.push({ payload_json: row.payload_json });
      }

      batchSize = SQLITE_READ_BATCH_SIZE;
    } catch (error) {
      if (isSqliteBufferError(error) && batchSize > 1) {
        batchSize = Math.max(1, Math.floor(batchSize / 2));
        continue;
      }
      throw error;
    }
  }

  return rows;
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

function quoteColumn(column) {
  return `"${column}"`;
}

function columnList(columns) {
  return columns.map(quoteColumn).join(", ");
}

function insertStatement(tableName, mapped) {
  const columns = Object.keys(mapped);
  const values = columns.map((column) => sqlLiteral(mapped[column])).join(", ");
  return `INSERT INTO ${tableName}(${columnList(columns)}) VALUES (${values});`;
}

function upsertStatement(spec, mapped) {
  const columns = Object.keys(mapped);
  const values = columns.map((column) => sqlLiteral(mapped[column])).join(", ");
  const insertSql = `INSERT INTO ${spec.tableName}(${columnList(columns)}) VALUES (${values})`;
  const conflictColumns = columnList(spec.keyColumns);
  const updateColumns = columns.filter((column) => !spec.keyColumns.includes(column));

  if (updateColumns.length === 0) {
    return `${insertSql} ON CONFLICT(${conflictColumns}) DO NOTHING;`;
  }

  const assignments = updateColumns
    .map((column) => `${quoteColumn(column)} = excluded.${quoteColumn(column)}`)
    .join(", ");
  return `${insertSql} ON CONFLICT(${conflictColumns}) DO UPDATE SET ${assignments};`;
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
    const rows = readPayloadRowsInBatches(dbPath, spec.tableName);
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

/**
 * Write only a single table's data to SQLite (DELETE + INSERT for that table only).
 * Avoids rewriting the entire database for targeted hot-path mutations.
 */
export function writeTableToSqlite(store, spec, options = {}) {
  const dbPath = resolveDbPath(options);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const lines = [
    "PRAGMA foreign_keys = ON;",
    "BEGIN IMMEDIATE TRANSACTION;"
  ];

  lines.push(`DELETE FROM ${spec.tableName};`);
  const rows = getRowsForSpec(store, spec);
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const mapped = spec.mapRow(row || {});
    const ensured = withRequiredColumns(spec, mapped, row, index);
    lines.push(insertStatement(spec.tableName, ensured));
  }

  lines.push("COMMIT;");
  runSqlScript(dbPath, lines.join("\n"));
}

export function writeRowsToSqlite(rowWrites, options = {}) {
  if (!Array.isArray(rowWrites) || rowWrites.length === 0) {
    return;
  }

  const preparedWrites = rowWrites.map((write, index) => {
    const spec = STORE_TABLE_SPECS_BY_TABLE.get(write?.tableName);
    if (!spec) {
      throw new Error(`Unknown SQLite table for targeted write: ${write?.tableName || "unknown"}`);
    }
    const row = write.row || {};
    const sqliteRow = withRequiredColumns(spec, spec.mapRow(row), row, index);
    return { spec, sqliteRow };
  });

  const dbPath = resolveDbPath(options);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const lines = [
    "PRAGMA foreign_keys = ON;",
    "BEGIN IMMEDIATE TRANSACTION;"
  ];

  for (const { spec, sqliteRow } of preparedWrites) {
    lines.push(upsertStatement(spec, sqliteRow));
  }

  lines.push("COMMIT;");
  runSqlScript(dbPath, lines.join("\n"));
}

/**
 * Execute arbitrary SQL against the SQLite database.
 * Used for maintenance operations like VACUUM or PRAGMA changes.
 */
export function executeSqlOnSqlite(sql, options = {}) {
  const dbPath = resolveDbPath(options);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  runSqlScript(dbPath, sql);
}
