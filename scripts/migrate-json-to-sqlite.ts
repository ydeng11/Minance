#!/usr/bin/env node
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import {
  STORE_TABLE_SPECS,
  parseArgs,
  resolvePathFromRoot,
  loadStoreFromPath,
  getRowsForSpec
} from "./sqlite-cutover-lib.ts";
import { ensureSqliteFoundation } from "../services/api/src/sqlite-foundation.ts";
import { writeStoreCollectionsToSqlite } from "../services/api/src/sqlite-store-repository.ts";

function printHelp() {
  console.log(`Usage: tsx scripts/migrate-json-to-sqlite.ts [--source <json>] [--db <sqlite>] [--schema <sql>]

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
  const sourceCounts = {};

  for (const spec of STORE_TABLE_SPECS) {
    const sourceRows = getRowsForSpec(store, spec);
    sourceCounts[spec.tableName] = sourceRows.length;
  }

  ensureSqliteFoundation({
    backend: "json",
    sqliteFile: dbPath,
    schemaFile: schemaPath,
    autoInit: true
  });
  writeStoreCollectionsToSqlite(store, { dbPath });

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
