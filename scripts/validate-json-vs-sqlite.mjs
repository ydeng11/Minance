#!/usr/bin/env node
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import {
  STORE_TABLE_SPECS,
  parseArgs,
  resolvePathFromRoot,
  loadStoreFromPath,
  getRowsForSpec,
  stableStringify
} from "./sqlite-cutover-lib.mjs";

function printHelp() {
  console.log(`Usage: node scripts/validate-json-vs-sqlite.mjs [--source <json>] [--db <sqlite>] [--sample-size <n>] [--fail-fast <true|false>]

Options:
  --source       Source JSON store path (default: MINANCE_DATA_FILE or services/api/data/store.json)
  --db           SQLite file path to validate (default: MINANCE_SQLITE_FILE or services/api/data/minance.sqlite)
  --sample-size  Number of deterministic sample rows per table (default: 10)
  --fail-fast    Stop at first mismatch (default: true)
  --help         Show this help message
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

function sqlLiteral(value) {
  if (value == null) {
    return "NULL";
  }
  const text = String(value);
  return `'${text.replace(/'/g, "''")}'`;
}

function sortedRows(rows, keys) {
  return [...rows].sort((left, right) => {
    for (const key of keys) {
      const a = String(left[key] ?? "");
      const b = String(right[key] ?? "");
      if (a < b) {
        return -1;
      }
      if (a > b) {
        return 1;
      }
    }
    return 0;
  });
}

function buildTransactionDirectionAgg(rows) {
  const byKey = new Map();
  for (const row of rows) {
    const userId = row.user_id ?? row.userId ?? "";
    const direction = row.direction ?? "";
    const amount = Number(row.amount || 0);
    const key = `${userId}|${direction}`;
    const existing = byKey.get(key) || {
      user_id: userId,
      direction,
      count: 0,
      total_amount: 0
    };
    existing.count += 1;
    existing.total_amount += Number.isFinite(amount) ? amount : 0;
    byKey.set(key, existing);
  }

  return sortedRows(
    [...byKey.values()].map((entry) => ({
      ...entry,
      total_amount: Number(entry.total_amount.toFixed(2))
    })),
    ["user_id", "direction"]
  );
}

function buildTransactionDateBounds(rows) {
  const byUser = new Map();
  for (const row of rows) {
    const userId = row.user_id ?? row.userId ?? "";
    const date = row.transaction_date ?? row.transactionDate ?? null;
    const existing = byUser.get(userId) || {
      user_id: userId,
      min_date: null,
      max_date: null,
      count: 0
    };
    existing.count += 1;
    if (date) {
      if (!existing.min_date || date < existing.min_date) {
        existing.min_date = date;
      }
      if (!existing.max_date || date > existing.max_date) {
        existing.max_date = date;
      }
    }
    byUser.set(userId, existing);
  }

  return sortedRows([...byUser.values()], ["user_id"]);
}

function buildCategoryCounts(rows) {
  const byUser = new Map();
  for (const row of rows) {
    const userId = row.userId ?? row.user_id ?? "";
    byUser.set(userId, (byUser.get(userId) || 0) + 1);
  }
  return sortedRows(
    [...byUser.entries()].map(([user_id, count]) => ({ user_id, count })),
    ["user_id"]
  );
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  const sourcePath = resolvePathFromRoot(args.source || process.env.MINANCE_DATA_FILE, "services/api/data/store.json");
  const dbPath = resolvePathFromRoot(args.db || process.env.MINANCE_SQLITE_FILE, "services/api/data/minance.sqlite");
  const sampleSize = Math.max(1, Number.parseInt(String(args["sample-size"] || "10"), 10));
  const failFast = String(args["fail-fast"] ?? "true").toLowerCase() !== "false";

  if (!fs.existsSync(dbPath)) {
    throw new Error(`SQLite file not found: ${dbPath}`);
  }

  ensureSqliteCliAvailable();
  const store = loadStoreFromPath(sourcePath);

  const errors = [];
  const summary = {
    sourcePath,
    dbPath,
    checks: {
      tableCounts: [],
      duplicates: {},
      aggregates: {},
      samples: []
    }
  };

  const recordError = (message) => {
    errors.push(message);
    if (failFast) {
      throw new Error(message);
    }
  };

  for (const spec of STORE_TABLE_SPECS) {
    const sourceRows = getRowsForSpec(store, spec);
    const countRows = queryJson(dbPath, `SELECT COUNT(*) AS count FROM ${spec.tableName};`);
    const sqliteCount = Number(countRows[0]?.count || 0);
    const sourceCount = sourceRows.length;
    const matches = sqliteCount === sourceCount;
    summary.checks.tableCounts.push({
      table: spec.tableName,
      sourceRows: sourceCount,
      sqliteRows: sqliteCount,
      countsMatch: matches
    });
    if (!matches) {
      recordError(
        `Table count mismatch for ${spec.tableName}: source=${sourceCount}, sqlite=${sqliteCount}`
      );
    }
  }

  const duplicateEmails = queryJson(
    dbPath,
    "SELECT email, COUNT(*) AS count FROM users GROUP BY email HAVING COUNT(*) > 1;"
  );
  const duplicateFingerprints = queryJson(
    dbPath,
    "SELECT user_id, dedupe_fingerprint, COUNT(*) AS count FROM transactions WHERE dedupe_fingerprint IS NOT NULL AND dedupe_fingerprint <> '' GROUP BY user_id, dedupe_fingerprint HAVING COUNT(*) > 1;"
  );
  summary.checks.duplicates = {
    duplicateEmails,
    duplicateTransactionFingerprints: duplicateFingerprints
  };
  if (duplicateEmails.length > 0) {
    recordError(`Duplicate emails detected in SQLite: ${duplicateEmails.length}`);
  }
  if (duplicateFingerprints.length > 0) {
    recordError(
      `Duplicate transaction dedupe fingerprints detected in SQLite: ${duplicateFingerprints.length}`
    );
  }

  const transactionsSpec = STORE_TABLE_SPECS.find((spec) => spec.tableName === "transactions");
  const categoriesSpec = STORE_TABLE_SPECS.find((spec) => spec.tableName === "categories");
  if (!transactionsSpec || !categoriesSpec) {
    throw new Error("Required table specs for transactions/categories are missing.");
  }

  const sourceTransactionRows = getRowsForSpec(store, transactionsSpec);
  const sourceCategoryRows = getRowsForSpec(store, categoriesSpec);

  const sourceDirectionAgg = buildTransactionDirectionAgg(sourceTransactionRows);
  const sqliteDirectionAgg = sortedRows(
    queryJson(
      dbPath,
      "SELECT user_id, direction, COUNT(*) AS count, ROUND(COALESCE(SUM(amount), 0), 2) AS total_amount FROM transactions GROUP BY user_id, direction ORDER BY user_id, direction;"
    ).map((entry) => ({
      user_id: entry.user_id ?? "",
      direction: entry.direction ?? "",
      count: Number(entry.count || 0),
      total_amount: Number(Number(entry.total_amount || 0).toFixed(2))
    })),
    ["user_id", "direction"]
  );

  const sourceDateBounds = buildTransactionDateBounds(sourceTransactionRows);
  const sqliteDateBounds = sortedRows(
    queryJson(
      dbPath,
      "SELECT user_id, MIN(transaction_date) AS min_date, MAX(transaction_date) AS max_date, COUNT(*) AS count FROM transactions GROUP BY user_id ORDER BY user_id;"
    ).map((entry) => ({
      user_id: entry.user_id ?? "",
      min_date: entry.min_date ?? null,
      max_date: entry.max_date ?? null,
      count: Number(entry.count || 0)
    })),
    ["user_id"]
  );

  const sourceCategoryCounts = buildCategoryCounts(sourceCategoryRows);
  const sqliteCategoryCounts = sortedRows(
    queryJson(
      dbPath,
      "SELECT user_id, COUNT(*) AS count FROM categories GROUP BY user_id ORDER BY user_id;"
    ).map((entry) => ({
      user_id: entry.user_id ?? "",
      count: Number(entry.count || 0)
    })),
    ["user_id"]
  );

  summary.checks.aggregates = {
    transactionDirection: {
      source: sourceDirectionAgg,
      sqlite: sqliteDirectionAgg,
      matches: stableStringify(sourceDirectionAgg) === stableStringify(sqliteDirectionAgg)
    },
    transactionDateBounds: {
      source: sourceDateBounds,
      sqlite: sqliteDateBounds,
      matches: stableStringify(sourceDateBounds) === stableStringify(sqliteDateBounds)
    },
    categoryCounts: {
      source: sourceCategoryCounts,
      sqlite: sqliteCategoryCounts,
      matches: stableStringify(sourceCategoryCounts) === stableStringify(sqliteCategoryCounts)
    }
  };

  if (!summary.checks.aggregates.transactionDirection.matches) {
    recordError("Transaction direction aggregate mismatch between JSON and SQLite.");
  }
  if (!summary.checks.aggregates.transactionDateBounds.matches) {
    recordError("Transaction date-bounds aggregate mismatch between JSON and SQLite.");
  }
  if (!summary.checks.aggregates.categoryCounts.matches) {
    recordError("Category count aggregate mismatch between JSON and SQLite.");
  }

  for (const spec of STORE_TABLE_SPECS) {
    if (!spec.sampleKey) {
      continue;
    }

    const sourceRows = getRowsForSpec(store, spec);
    if (sourceRows.length === 0) {
      continue;
    }

    const sourceByKey = new Map();
    for (const row of sourceRows) {
      const keyValue = row?.[spec.sampleKey.source];
      if (keyValue == null || keyValue === "") {
        continue;
      }
      sourceByKey.set(String(keyValue), row);
    }

    const keys = [...sourceByKey.keys()].sort().slice(0, sampleSize);
    if (keys.length === 0) {
      continue;
    }

    const inClause = keys.map((key) => sqlLiteral(key)).join(", ");
    const sqliteRows = queryJson(
      dbPath,
      `SELECT ${spec.sampleKey.table} AS sample_key, payload_json FROM ${spec.tableName} WHERE ${spec.sampleKey.table} IN (${inClause}) ORDER BY ${spec.sampleKey.table};`
    );

    const sqliteByKey = new Map(
      sqliteRows.map((row) => [String(row.sample_key), row.payload_json || "{}"])
    );

    let mismatches = 0;
    for (const key of keys) {
      if (!sqliteByKey.has(key)) {
        mismatches += 1;
        recordError(`Sample row missing in SQLite for ${spec.tableName} key=${key}`);
        continue;
      }

      const sourceRow = sourceByKey.get(key);
      const sourceStable = stableStringify(sourceRow);
      const sqliteStable = stableStringify(JSON.parse(sqliteByKey.get(key)));
      if (sourceStable !== sqliteStable) {
        mismatches += 1;
        recordError(`Payload mismatch for ${spec.tableName} key=${key}`);
      }
    }

    summary.checks.samples.push({
      table: spec.tableName,
      sampleCount: keys.length,
      mismatches,
      matches: mismatches === 0
    });
  }

  if (errors.length > 0) {
    console.error("Validation failed.");
    console.error(JSON.stringify({ errors, summary }, null, 2));
    process.exitCode = 1;
    return;
  }

  console.log("Validation succeeded.");
  console.log(JSON.stringify(summary, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
