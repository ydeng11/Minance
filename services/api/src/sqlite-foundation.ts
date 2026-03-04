import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

import {
  DATA_FILE,
  STORE_BACKEND,
  SQLITE_AUTO_INIT,
  SQLITE_FILE,
  SQLITE_SCHEMA_FILE
} from "./config.ts";

const SQLITE_MAX_BUFFER = 1024 * 1024 * 20;

function toBoolean(value, fallback) {
  if (value == null) {
    return fallback;
  }
  if (typeof value === "boolean") {
    return value;
  }
  const normalized = String(value).trim().toLowerCase();
  if (normalized === "true") {
    return true;
  }
  if (normalized === "false") {
    return false;
  }
  return fallback;
}

function sqlLiteral(value) {
  if (value == null) {
    return "NULL";
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqliteExec(args, options = {}) {
  return spawnSync("sqlite3", args, {
    encoding: "utf8",
    maxBuffer: SQLITE_MAX_BUFFER,
    ...(options || {})
  });
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

function runSqlScript(dbPath, sql) {
  const result = sqliteExec([dbPath], { input: sql });
  if (result.status !== 0 || result.error) {
    const reason = result.error?.message || result.stderr || "sqlite3 command failed";
    throw new Error(String(reason).trim());
  }
}

function schemaVersion(schemaSql) {
  const digest = createHash("sha256").update(schemaSql).digest("hex").slice(0, 16);
  return `sqlite-foundation:${digest}`;
}

export function isSqliteCliAvailable() {
  const result = sqliteExec(["--version"]);
  return result.status === 0 && !result.error;
}

function gatherFoundationStatus(overrides = {}) {
  const backend = overrides.backend || STORE_BACKEND;
  const sqliteFile = overrides.sqliteFile || SQLITE_FILE;
  const schemaFile = overrides.schemaFile || SQLITE_SCHEMA_FILE;
  const dataFile = overrides.dataFile || DATA_FILE;
  const autoInit = toBoolean(overrides.autoInit, SQLITE_AUTO_INIT);
  const initialize = toBoolean(overrides.initialize, autoInit);

  const status = {
    backend,
    jsonFilePath: dataFile,
    sqliteFilePath: sqliteFile,
    sqliteSchemaPath: schemaFile,
    autoInit,
    initializeAttempted: false,
    sqliteCliAvailable: false,
    schemaFileExists: fs.existsSync(schemaFile),
    sqliteFileExists: fs.existsSync(sqliteFile),
    schemaVersion: null,
    migrationsApplied: 0,
    ready: false,
    lastError: null
  };

  status.sqliteCliAvailable = isSqliteCliAvailable();
  if (!status.sqliteCliAvailable) {
    status.lastError = "sqlite3 CLI is not available on PATH";
  }

  if (!status.schemaFileExists && !status.lastError) {
    status.lastError = `SQLite schema file is missing: ${schemaFile}`;
  }

  if (initialize && status.sqliteCliAvailable && status.schemaFileExists) {
    status.initializeAttempted = true;
    try {
      fs.mkdirSync(path.dirname(sqliteFile), { recursive: true });
      const schemaSql = fs.readFileSync(schemaFile, "utf8");
      const version = schemaVersion(schemaSql);

      runSqlScript(sqliteFile, `PRAGMA foreign_keys = ON;\n${schemaSql}`);
      runSqlScript(
        sqliteFile,
        `INSERT INTO schema_migrations(version, applied_at) VALUES(${sqlLiteral(version)}, ${sqlLiteral(
          new Date().toISOString()
        )}) ON CONFLICT(version) DO NOTHING;`
      );
      status.schemaVersion = version;
    } catch (error) {
      status.lastError = error instanceof Error ? error.message : String(error);
    }
  }

  status.sqliteFileExists = fs.existsSync(sqliteFile);

  if (status.sqliteCliAvailable && status.sqliteFileExists) {
    try {
      const migrationTable = sqliteQueryJson(
        sqliteFile,
        "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations';"
      );
      if (migrationTable.length > 0) {
        const countRows = sqliteQueryJson(sqliteFile, "SELECT COUNT(*) AS count FROM schema_migrations;");
        const latestRows = sqliteQueryJson(
          sqliteFile,
          "SELECT version FROM schema_migrations ORDER BY applied_at DESC, version DESC LIMIT 1;"
        );

        status.migrationsApplied = Number(countRows[0]?.count || 0);
        if (!status.schemaVersion) {
          status.schemaVersion = latestRows[0]?.version || null;
        }
      }
    } catch (error) {
      status.lastError = error instanceof Error ? error.message : String(error);
    }
  }

  status.ready =
    status.sqliteCliAvailable &&
    status.schemaFileExists &&
    status.sqliteFileExists &&
    status.migrationsApplied >= 1;

  return status;
}

export function getSqliteFoundationStatus(overrides = {}) {
  return gatherFoundationStatus({ ...overrides, initialize: false });
}

export function ensureSqliteFoundation(overrides = {}) {
  const autoInit = toBoolean(overrides.autoInit, SQLITE_AUTO_INIT);
  const status = gatherFoundationStatus({
    ...overrides,
    autoInit,
    initialize: overrides.initialize == null ? autoInit : overrides.initialize
  });

  if (status.backend === "sqlite" && !status.ready) {
    const reason = status.lastError || "SQLite schema is not initialized";
    throw new Error(`MINANCE_STORE_BACKEND=sqlite requires a ready SQLite foundation: ${reason}`);
  }

  return status;
}
