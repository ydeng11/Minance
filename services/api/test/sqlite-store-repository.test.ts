import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

import { ensureSqliteFoundation, isSqliteCliAvailable } from "../src/sqlite-foundation.ts";
import {
  readStoreCollectionsFromSqlite,
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
        direction: "debit",
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
    migrationRuns: [],
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
