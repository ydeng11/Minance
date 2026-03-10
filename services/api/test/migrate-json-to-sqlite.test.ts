import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { ensureSqliteFoundation, isSqliteCliAvailable } from "../src/sqlite-foundation.ts";
import { writeStoreCollectionsToSqlite } from "../src/sqlite-store-repository.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "../../..");

const SQLITE_MAX_BUFFER = 1024 * 1024 * 20;

function createTempPaths() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "minance-migrate-json-to-sqlite-"));
  return {
    dir,
    dbPath: path.join(dir, "migration.sqlite"),
    sourcePath: path.join(dir, "store.json"),
    schemaPath: path.resolve(__dirname, "../sql/schema.sql")
  };
}

function querySqliteJson(dbPath: string, sql: string) {
  const result = spawnSync("sqlite3", ["-json", dbPath, sql], {
    encoding: "utf8",
    maxBuffer: SQLITE_MAX_BUFFER
  });
  assert.equal(result.status, 0, result.stderr || result.error?.message || "sqlite3 query failed");
  const raw = String(result.stdout || "").trim();
  return raw ? JSON.parse(raw) : [];
}

test(
  "migrate-json-to-sqlite rewrites stale tables and defaults missing review flags",
  { skip: !isSqliteCliAvailable() },
  () => {
    const temp = createTempPaths();
    const now = "2026-03-07T00:00:00.000Z";

    const staleStore = {
      users: [
        {
          id: "user_stale",
          email: "stale@minance.local",
          createdAt: now,
          updatedAt: now
        }
      ],
      accounts: [
        {
          id: "acct_stale",
          userId: "user_stale",
          normalizedKey: "stale-checking",
          displayName: "Stale Checking",
          accountType: "checking",
          createdAt: now,
          updatedAt: now
        }
      ],
      transactions: [
        {
          id: "txn_stale",
          userId: "user_stale",
          accountId: "acct_stale",
          sourceType: "manual",
          transactionDate: "2026-02-01",
          merchantRaw: "Stale Merchant",
          merchantNormalized: "stale merchant",
          description: "stale row",
          amount: 1.25,
          currency: "USD",
          direction: "debit",
          categoryRaw: "Stale",
          categoryFinal: "Stale",
          dedupeFingerprint: "fp_stale",
          needs_category_review: false,
          createdAt: now,
          updatedAt: now
        }
      ]
    };

    const sourceStore = {
      users: [
        {
          id: "user_src",
          email: "source@minance.local",
          createdAt: now,
          updatedAt: now
        }
      ],
      accounts: [
        {
          id: "acct_src",
          userId: "user_src",
          normalizedKey: "source-checking",
          displayName: "Source Checking",
          accountType: "checking",
          createdAt: now,
          updatedAt: now
        }
      ],
      transactions: [
        {
          id: "txn_src",
          user_id: "user_src",
          account_id: "acct_src",
          account_key: "source-checking",
          source_type: "imported",
          transaction_date: "2026-02-15",
          post_date: "2026-02-15",
          merchant_raw: "Groceries",
          merchant_normalized: "groceries",
          description: "groceries",
          amount: 42.5,
          currency: "USD",
          direction: "debit",
          category_raw: "Groceries",
          category_final: "Groceries",
          category_strategy: "rule",
          dedupe_fingerprint: "fp_src",
          created_at: now,
          updated_at: now
        }
      ]
    };

    try {
      ensureSqliteFoundation({
        backend: "json",
        sqliteFile: temp.dbPath,
        schemaFile: temp.schemaPath,
        autoInit: true
      });
      writeStoreCollectionsToSqlite(staleStore, { dbPath: temp.dbPath });
      fs.writeFileSync(temp.sourcePath, JSON.stringify(sourceStore, null, 2));

      const result = spawnSync(
        "pnpm",
        ["migrate:sqlite", "--", "--source", temp.sourcePath, "--db", temp.dbPath],
        {
          cwd: ROOT_DIR,
          encoding: "utf8",
          maxBuffer: SQLITE_MAX_BUFFER
        }
      );

      assert.equal(
        result.status,
        0,
        `migration failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
      );

      const users = querySqliteJson(temp.dbPath, "SELECT id FROM users ORDER BY id;");
      const transactions = querySqliteJson(
        temp.dbPath,
        "SELECT id, user_id, needs_category_review FROM transactions ORDER BY id;"
      );

      assert.deepEqual(users, [{ id: "user_src" }]);
      assert.deepEqual(transactions, [
        { id: "txn_src", user_id: "user_src", needs_category_review: 0 }
      ]);
    } finally {
      fs.rmSync(temp.dir, { recursive: true, force: true });
    }
  }
);

test(
  "migrate-json-to-sqlite and validate:sqlite use the default JSON fixture successfully",
  { skip: !isSqliteCliAvailable() },
  () => {
    const temp = createTempPaths();

    try {
      const migrateResult = spawnSync("pnpm", ["migrate:sqlite", "--", "--db", temp.dbPath], {
        cwd: ROOT_DIR,
        encoding: "utf8",
        maxBuffer: SQLITE_MAX_BUFFER
      });
      assert.equal(
        migrateResult.status,
        0,
        `default fixture migration failed\nstdout:\n${migrateResult.stdout}\nstderr:\n${migrateResult.stderr}`
      );

      const validateResult = spawnSync("pnpm", ["validate:sqlite", "--", "--db", temp.dbPath], {
        cwd: ROOT_DIR,
        encoding: "utf8",
        maxBuffer: SQLITE_MAX_BUFFER
      });
      assert.equal(
        validateResult.status,
        0,
        `default fixture validation failed\nstdout:\n${validateResult.stdout}\nstderr:\n${validateResult.stderr}`
      );
    } finally {
      fs.rmSync(temp.dir, { recursive: true, force: true });
    }
  }
);
