#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  STORE_TABLE_SPECS,
  parseArgs,
  resolvePathFromRoot,
  loadStoreFromPath,
  getRowsForSpec
} from "./sqlite-cutover-lib.mjs";

function printHelp() {
  console.log(`Usage: node scripts/migrate-json-to-sqlite.mjs [--source <json>] [--db <sqlite>] [--schema <sql>]

Options:
  --source   Source JSON store path (default: MINANCE_DATA_FILE or services/api/data/store.json)
  --db       Target SQLite file path (default: MINANCE_SQLITE_FILE or services/api/data/minance.sqlite)
  --schema   SQLite schema SQL file (default: MINANCE_SQLITE_SCHEMA_FILE or services/api/sql/schema.sql)
  --help     Show this help message
`);
}

function ensureSqliteCliAvailable() {
  const result = spawnSync("sqlite3", ["--version"], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error("sqlite3 CLI is required but not available on PATH.");
  }
}

function runSqlite(dbPath, sql) {
  const result = spawnSync("sqlite3", [dbPath], {
    input: sql,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 20
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || "sqlite3 command failed");
  }
}

function queryJson(dbPath, sql) {
  const result = spawnSync("sqlite3", ["-json", dbPath, sql], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 20
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || "sqlite3 JSON query failed");
  }
  const raw = result.stdout.trim();
  if (!raw) {
    return [];
  }
  return JSON.parse(raw);
}

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
  const text = String(value);
  return `'${text.replace(/'/g, "''")}'`;
}

function buildUpsertSql(tableName, keyColumns, mappedRow) {
  const columns = Object.keys(mappedRow);
  const valueSql = columns.map((column) => sqlLiteral(mappedRow[column]));
  const updateColumns = columns.filter((column) => !keyColumns.includes(column));

  const updateClause = updateColumns.length
    ? `DO UPDATE SET ${updateColumns.map((column) => `${column}=excluded.${column}`).join(", ")}`
    : "DO NOTHING";

  return `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${valueSql.join(", ")}) ON CONFLICT(${keyColumns.join(", ")}) ${updateClause};`;
}

function uniqueKey(keyColumns, mappedRow) {
  return keyColumns.map((column) => String(mappedRow[column])).join("|");
}

function ensureKeyColumnsPresent(spec, mappedRow, rowIndex) {
  for (const keyColumn of spec.keyColumns) {
    const value = mappedRow[keyColumn];
    if (value == null || String(value).trim() === "") {
      throw new Error(
        `Missing key column "${keyColumn}" for ${spec.tableName} row at source index ${rowIndex}.`
      );
    }
  }
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  const sourcePath = resolvePathFromRoot(args.source || process.env.MINANCE_DATA_FILE, "services/api/data/store.json");
  const dbPath = resolvePathFromRoot(args.db || process.env.MINANCE_SQLITE_FILE, "services/api/data/minance.sqlite");
  const schemaPath = resolvePathFromRoot(
    args.schema || process.env.MINANCE_SQLITE_SCHEMA_FILE,
    "services/api/sql/schema.sql"
  );

  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema SQL file not found: ${schemaPath}`);
  }

  ensureSqliteCliAvailable();

  const store = loadStoreFromPath(sourcePath);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const schemaSql = fs.readFileSync(schemaPath, "utf8");
  runSqlite(dbPath, schemaSql);

  const statements = ["PRAGMA foreign_keys = ON;", "BEGIN IMMEDIATE;"];
  const sourceCounts = {};

  for (const spec of STORE_TABLE_SPECS) {
    const sourceRows = getRowsForSpec(store, spec);
    sourceCounts[spec.tableName] = sourceRows.length;

    const seenKeys = new Set();
    for (let rowIndex = 0; rowIndex < sourceRows.length; rowIndex += 1) {
      const sourceRow = sourceRows[rowIndex];
      const mappedRow = spec.mapRow(sourceRow || {});

      ensureKeyColumnsPresent(spec, mappedRow, rowIndex);
      const dedupeKey = uniqueKey(spec.keyColumns, mappedRow);
      if (seenKeys.has(dedupeKey)) {
        throw new Error(
          `Duplicate key in source data for ${spec.tableName}: ${dedupeKey}. Aborting to avoid silent collapse.`
        );
      }
      seenKeys.add(dedupeKey);
      statements.push(buildUpsertSql(spec.tableName, spec.keyColumns, mappedRow));
    }
  }

  statements.push("COMMIT;");
  runSqlite(dbPath, statements.join("\n"));

  const tableSummary = [];
  let mismatchDetected = false;
  for (const spec of STORE_TABLE_SPECS) {
    const rows = queryJson(dbPath, `SELECT COUNT(*) AS count FROM ${spec.tableName};`);
    const sqliteCount = Number(rows[0]?.count || 0);
    const sourceCount = sourceCounts[spec.tableName] || 0;
    const countsMatch = sqliteCount === sourceCount;
    if (!countsMatch) {
      mismatchDetected = true;
    }
    tableSummary.push({
      table: spec.tableName,
      sourceRows: sourceCount,
      sqliteRows: sqliteCount,
      countsMatch
    });
  }

  const migrationSummary = {
    sourcePath,
    dbPath,
    schemaPath,
    tableSummary
  };

  if (mismatchDetected) {
    console.error("Migration completed with count mismatches:");
    console.error(JSON.stringify(migrationSummary, null, 2));
    process.exitCode = 1;
    return;
  }

  console.log("Migration completed successfully.");
  console.log(JSON.stringify(migrationSummary, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
