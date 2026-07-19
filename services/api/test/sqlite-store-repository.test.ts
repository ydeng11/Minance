import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import test from "node:test";
import assert from "node:assert/strict";

import { ensureSqliteFoundation, isSqliteCliAvailable } from "../src/sqlite-foundation.ts";
import {
  readStoreCollectionsFromSqlite,
  writeRowsToSqlite,
  writeStoreCollectionsToSqlite
} from "../src/sqlite-store-repository.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createTempPaths() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "minance-sqlite-store-repo-"));
  return {
    dir,
    dbPath: path.join(dir, "repo.sqlite"),
    schemaPath: path.resolve(__dirname, "../sql/schema.sql")
  };
}

function sqliteQueryJson(dbPath, sql) {
  const result = spawnSync("sqlite3", ["-json", dbPath, sql], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 5
  });
  if (result.status !== 0 || result.error) {
    throw new Error(result.error?.message || result.stderr || "sqlite3 query failed");
  }
  const raw = String(result.stdout || "").trim();
  return raw ? JSON.parse(raw) : [];
}

test("sqlite store repository round-trips payload collections", { skip: !isSqliteCliAvailable() }, () => {
  const temp = createTempPaths();
  const now = "2026-03-01T00:00:00.000Z";
  const sampleStore = {
    users: [
      {
        id: "usr_1",
        email: "repo@minance.local",
        passwordHash: "hash_1",
        passwordSalt: "salt_1",
        createdAt: now,
        updatedAt: now
      }
    ],
    sessions: [
      {
        id: "ses_1",
        userId: "usr_1",
        accessToken: "access_token_1",
        refreshToken: "refresh_token_1",
        accessExpiresAt: now,
        refreshExpiresAt: now,
        createdAt: now,
        updatedAt: now
      }
    ],
    accounts: [
      {
        id: "acct_1",
        userId: "usr_1",
        normalizedKey: "sample-bank:checking",
        displayName: "Checking",
        sourceInstitution: "Sample Bank",
        accountType: "depository",
        createdAt: now,
        updatedAt: now
      }
    ],
    transactions: [
      {
        id: "txn_1",
        userId: "usr_1",
        accountId: "acct_1",
        sourceType: "manual",
        transactionDate: "2026-02-15",
        merchantRaw: "Cafe Place",
        merchantNormalized: "cafe place",
        description: "Coffee",
        amount: 7.45,
        currency: "USD",
        direction: "outflow",
        categoryRaw: "Dining",
        categoryFinal: "Dining",
        categoryCoarse: "extra",
        dedupeFingerprint: "txn_1",
        createdAt: now,
        updatedAt: now
      }
    ],
    categories: [
      {
        id: "cat_1",
        userId: "usr_1",
        name: "Dining",
        isSystem: false,
        createdAt: now,
        updatedAt: now
      }
    ],
    categoryStrategies: [
      {
        id: "strat_1",
        userId: "usr_1",
        coarseCategories: [{ key: "extra", name: "Extra", emoji: "sparkles" }],
        granularCategories: [{ name: "Dining", coarseKey: "extra", emoji: "fork" }],
        createdAt: now,
        updatedAt: now
      }
    ],
    categoryRules: [
      {
        id: "rule_1",
        userId: "usr_1",
        type: "contains",
        pattern: "cafe",
        category: "Dining",
        priority: 70,
        createdAt: now,
        updatedAt: now
      }
    ],
    imports: [],
    importRowsRaw: [],
    importRowsProcessed: [],
    importRowDiagnostics: [],
    aiProviderCredentials: [
      {
        id: "cred_1",
        userId: "usr_1",
        provider: "openai",
        label: "Primary",
        encrypted: { key: "redacted" },
        maskedKey: "***1234",
        status: "active",
        createdAt: now,
        updatedAt: now
      }
    ],
    aiProviderPreferences: [
      {
        userId: "usr_1",
        defaultProvider: "openai",
        defaultModel: "gpt-5-mini",
        failoverProviders: ["anthropic"],
        featureOverrides: {},
        updatedAt: now
      }
    ],
    assistantQueries: [],
    savedViews: [
      {
        id: "view_1",
        userId: "usr_1",
        name: "Recent Spend",
        filters: { range: "30d" },
        layout: { cards: ["kpis"] },
        createdAt: now,
        updatedAt: now
      }
    ],
    auditEvents: [
      {
        id: "audit_1",
        userId: "usr_1",
        action: "test.write",
        details: { ok: true },
        createdAt: now
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

    writeStoreCollectionsToSqlite(sampleStore, { dbPath: temp.dbPath });
    const loaded = readStoreCollectionsFromSqlite({ dbPath: temp.dbPath });

    assert.equal(loaded.users.length, 1);
    assert.equal(loaded.users[0].email, "repo@minance.local");
    assert.equal(loaded.sessions[0].refreshToken, "refresh_token_1");
    assert.equal(loaded.accounts[0].normalizedKey, "sample-bank:checking");
    assert.equal(loaded.transactions[0].amount, 7.45);
    assert.equal(loaded.categories[0].name, "Dining");
    assert.equal(loaded.categoryRules[0].pattern, "cafe");
    assert.equal(loaded.aiProviderPreferences[0].defaultModel, "gpt-5-mini");
    assert.deepEqual(loaded.savedViews[0].filters, { range: "30d" });
    assert.equal(loaded.auditEvents[0].action, "test.write");
  } finally {
    fs.rmSync(temp.dir, { recursive: true, force: true });
  }
});

test("sqlite store repository upserts targeted rows without rewriting tables", { skip: !isSqliteCliAvailable() }, () => {
  const temp = createTempPaths();
  const now = "2026-03-01T00:00:00.000Z";
  const sampleStore = {
    users: [{ id: "usr_rows", email: "rows@minance.local", createdAt: now, updatedAt: now }],
    accounts: [
      {
        id: "acct_rows",
        userId: "usr_rows",
        normalizedKey: "rows-bank:checking",
        displayName: "Rows Checking",
        createdAt: now,
        updatedAt: now
      }
    ],
    transactions: [
      {
        id: "txn_rows_1",
        user_id: "usr_rows",
        account_id: "acct_rows",
        account_key: "rows-bank:checking",
        source_type: "manual",
        transaction_date: "2026-03-01",
        merchant_raw: "Rows Cafe",
        merchant_normalized: "rows cafe",
        description: "Original coffee",
        amount: 8.25,
        currency: "USD",
        direction: "outflow",
        category_final: "Dining",
        transaction_type: "expense",
        created_at: now,
        updated_at: now
      },
      {
        id: "txn_rows_2",
        user_id: "usr_rows",
        account_id: "acct_rows",
        account_key: "rows-bank:checking",
        source_type: "manual",
        transaction_date: "2026-03-02",
        merchant_raw: "Rows Market",
        merchant_normalized: "rows market",
        description: "Untouched groceries",
        amount: 42.5,
        currency: "USD",
        direction: "outflow",
        category_final: "Groceries",
        transaction_type: "expense",
        created_at: now,
        updated_at: now
      }
    ],
    auditEvents: [
      {
        id: "audit_rows_1",
        userId: "usr_rows",
        action: "seed",
        details: { ok: true },
        createdAt: now
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

    writeStoreCollectionsToSqlite(sampleStore, { dbPath: temp.dbPath });
    writeRowsToSqlite(
      [
        {
          tableName: "transactions",
          row: {
            ...sampleStore.transactions[0],
            description: "Updated transfer",
            amount: 12.75,
            category_final: "Transfer",
            transaction_type: "transfer",
            updated_at: "2026-03-02T00:00:00.000Z"
          }
        },
        {
          tableName: "audit_events",
          row: {
            id: "audit_rows_2",
            userId: "usr_rows",
            action: "transaction.update",
            details: { transactionId: "txn_rows_1" },
            createdAt: "2026-03-02T00:00:00.000Z"
          }
        }
      ],
      { dbPath: temp.dbPath }
    );

    const loaded = readStoreCollectionsFromSqlite({ dbPath: temp.dbPath });
    assert.equal(loaded.transactions.length, 2);
    assert.equal(loaded.auditEvents.length, 2);
    assert.equal(loaded.transactions.find((entry) => entry.id === "txn_rows_1")?.transaction_type, "transfer");
    assert.equal(loaded.transactions.find((entry) => entry.id === "txn_rows_2")?.description, "Untouched groceries");

    const [projectedTransaction] = sqliteQueryJson(
      temp.dbPath,
      "SELECT description, amount, category_final, payload_json FROM transactions WHERE id = 'txn_rows_1';"
    );
    assert.equal(projectedTransaction.description, "Updated transfer");
    assert.equal(projectedTransaction.amount, 12.75);
    assert.equal(projectedTransaction.category_final, "Transfer");
    assert.equal(JSON.parse(projectedTransaction.payload_json).transaction_type, "transfer");

    const [projectedAudit] = sqliteQueryJson(
      temp.dbPath,
      "SELECT action, details_json, payload_json FROM audit_events WHERE id = 'audit_rows_2';"
    );
    assert.equal(projectedAudit.action, "transaction.update");
    assert.deepEqual(JSON.parse(projectedAudit.details_json), { transactionId: "txn_rows_1" });
    assert.deepEqual(JSON.parse(projectedAudit.payload_json).details, { transactionId: "txn_rows_1" });
  } finally {
    fs.rmSync(temp.dir, { recursive: true, force: true });
  }
});

test(
  "sqlite store repository reads large transaction tables without exhausting the sqlite3 buffer",
  { skip: !isSqliteCliAvailable() },
  () => {
    const temp = createTempPaths();
    const now = "2026-03-01T00:00:00.000Z";
    const oversizedMemo = "x".repeat(4096);
    const transactionCount = 6000;
    const sampleStore = {
      users: [
        {
          id: "usr_buffer",
          email: "buffer@minance.local",
          passwordHash: "hash_buffer",
          passwordSalt: "salt_buffer",
          createdAt: now,
          updatedAt: now
        }
      ],
      sessions: [],
      accounts: [
        {
          id: "acct_buffer",
          userId: "usr_buffer",
          normalizedKey: "buffer-bank:checking",
          displayName: "Checking",
          sourceInstitution: "Buffer Bank",
          accountType: "depository",
          createdAt: now,
          updatedAt: now
        }
      ],
      transactions: Array.from({ length: transactionCount }, (_, index) => ({
        id: `txn_buffer_${index}`,
        userId: "usr_buffer",
        accountId: "acct_buffer",
        sourceType: "manual",
        transactionDate: "2026-02-15",
        merchantRaw: `Merchant ${index}`,
        merchantNormalized: `merchant ${index}`,
        description: "Oversized regression transaction",
        amount: index + 0.01,
        currency: "USD",
        direction: "outflow",
        categoryRaw: "Dining",
        categoryFinal: "Dining",
        categoryCoarse: "extra",
        memo: oversizedMemo,
        dedupeFingerprint: `txn_buffer_${index}`,
        createdAt: now,
        updatedAt: now
      })),
      categories: [],
      categoryStrategies: [],
      categoryRules: [],
      imports: [],
      importRowsRaw: [],
      importRowsProcessed: [],
      importRowDiagnostics: [],
      aiProviderCredentials: [],
      aiProviderPreferences: [],
      assistantQueries: [],
      savedViews: [],
      auditEvents: []
    };

    try {
      ensureSqliteFoundation({
        backend: "json",
        sqliteFile: temp.dbPath,
        schemaFile: temp.schemaPath,
        autoInit: true
      });

      writeStoreCollectionsToSqlite(sampleStore, { dbPath: temp.dbPath });
      const loaded = readStoreCollectionsFromSqlite({ dbPath: temp.dbPath });

      assert.equal(loaded.transactions.length, transactionCount);
      assert.equal(loaded.transactions[0].memo, oversizedMemo);
      assert.equal(loaded.transactions.at(-1)?.id, `txn_buffer_${transactionCount - 1}`);
    } finally {
      fs.rmSync(temp.dir, { recursive: true, force: true });
    }
  }
);
