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
const TSX_BIN = path.resolve(ROOT_DIR, "apps/web/node_modules/.bin/tsx");

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

function runTsxScript(args: string[], options: { env?: NodeJS.ProcessEnv } = {}) {
  return spawnSync(TSX_BIN, args, {
    cwd: ROOT_DIR,
    encoding: "utf8",
    env: {
      ...process.env,
      ...options.env
    },
    maxBuffer: SQLITE_MAX_BUFFER
  });
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

      const result = runTsxScript([
        "scripts/migrate-json-to-sqlite.ts",
        "--source",
        temp.sourcePath,
        "--db",
        temp.dbPath
      ]);

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
  "migrate-json-to-sqlite and validate:sqlite support the committed fixture when passed explicitly",
  { skip: !isSqliteCliAvailable() },
  () => {
    const temp = createTempPaths();
    const fixturePath = path.resolve(ROOT_DIR, "services/api/test/fixtures/deterministic-financial-store.json");

    try {
      const migrateResult = runTsxScript([
        "scripts/migrate-json-to-sqlite.ts",
        "--source",
        fixturePath,
        "--db",
        temp.dbPath
      ]);
      assert.equal(
        migrateResult.status,
        0,
        `explicit fixture migration failed\nstdout:\n${migrateResult.stdout}\nstderr:\n${migrateResult.stderr}`
      );

      assert.deepEqual(querySqliteJson(temp.dbPath, "SELECT id FROM recurring_rules ORDER BY id;"), [
        { id: "rr_fixture_energy" },
        { id: "rr_fixture_groceries" },
        { id: "rr_fixture_insurance" },
        { id: "rr_fixture_payroll" },
        { id: "rr_fixture_rent" },
        { id: "rr_fixture_streaming" }
      ]);
      assert.equal(
        querySqliteJson(temp.dbPath, "SELECT COUNT(*) AS count FROM investment_holdings;")[0]?.count,
        2
      );
      assert.equal(
        querySqliteJson(temp.dbPath, "SELECT COUNT(*) AS count FROM investment_snapshots;")[0]?.count,
        19
      );

      const validateResult = runTsxScript([
        "scripts/validate-json-vs-sqlite.ts",
        "--source",
        fixturePath,
        "--db",
        temp.dbPath
      ]);
      assert.equal(
        validateResult.status,
        0,
        `explicit fixture validation failed\nstdout:\n${validateResult.stdout}\nstderr:\n${validateResult.stderr}`
      );
    } finally {
      fs.rmSync(temp.dir, { recursive: true, force: true });
    }
  }
);

test(
  "migrate-json-to-sqlite and validate:sqlite default to the live JSON store path",
  { skip: !isSqliteCliAvailable() },
  () => {
    const temp = createTempPaths();
    const liveStorePath = path.resolve(ROOT_DIR, "services/api/data/store.json");
    const existingLiveStore = fs.existsSync(liveStorePath) ? fs.readFileSync(liveStorePath, "utf8") : null;
    const liveStore = {
      users: [
        {
          id: "user_live_default",
          email: "live-default@minance.local",
          createdAt: "2026-03-07T00:00:00.000Z",
          updatedAt: "2026-03-07T00:00:00.000Z"
        }
      ],
      accounts: [],
      transactions: [],
      categories: [],
      imports: [],
      rules: [],
      settings: [],
      auditEvents: []
    };

    try {
      fs.mkdirSync(path.dirname(liveStorePath), { recursive: true });
      fs.writeFileSync(liveStorePath, JSON.stringify(liveStore, null, 2));

      const migrateResult = runTsxScript(["scripts/migrate-json-to-sqlite.ts", "--db", temp.dbPath], {
        env: {
          MINANCE_DATA_FILE: "",
          MINANCE_SQLITE_FILE: temp.dbPath
        }
      });
      assert.equal(
        migrateResult.status,
        0,
        `live-store migration failed\nstdout:\n${migrateResult.stdout}\nstderr:\n${migrateResult.stderr}`
      );

      const users = querySqliteJson(temp.dbPath, "SELECT id FROM users ORDER BY id;");
      assert.deepEqual(users, [{ id: "user_live_default" }]);

      const validateResult = runTsxScript(["scripts/validate-json-vs-sqlite.ts", "--db", temp.dbPath], {
        env: {
          MINANCE_DATA_FILE: "",
          MINANCE_SQLITE_FILE: temp.dbPath
        }
      });
      assert.equal(
        validateResult.status,
        0,
        `live-store validation failed\nstdout:\n${validateResult.stdout}\nstderr:\n${validateResult.stderr}`
      );

      const stdout = String(validateResult.stdout || "");
      const jsonStart = stdout.indexOf("{");
      assert.notEqual(jsonStart, -1, `validate:sqlite output did not contain JSON:\n${stdout}`);

      const summary = JSON.parse(stdout.slice(jsonStart));
      assert.equal(summary.sourcePath, liveStorePath);
    } finally {
      if (existingLiveStore == null) {
        fs.rmSync(liveStorePath, { force: true });
      } else {
        fs.writeFileSync(liveStorePath, existingLiveStore);
      }
      fs.rmSync(temp.dir, { recursive: true, force: true });
    }
  }
);
