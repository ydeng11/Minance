import test from "node:test";
import assert from "node:assert/strict";

import { loadStore, resetStoreForTests } from "../../src/store.ts";
import { repairLegacyAccountIdentityDrift } from "../../src/migrations/account-identity-repair.ts";
import { stableHash } from "../../src/utils.ts";

const BASE_STORE = {
  users: [{ id: "user_1", email: "user@example.com", createdAt: "2026-01-01", updatedAt: "2026-01-01" }],
  sessions: [],
  accounts: [],
  transactions: [],
  recurringRules: [],
  recurringSuggestions: [],
  dismissedRecurringSuggestions: [],
  investmentHoldings: [],
  investmentSnapshots: [],
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
  migrationRuns: [],
  auditEvents: [],
  userRecurringScanState: [],
  scanRunState: {
    is_running: false,
    last_run_at: null,
    last_run_status: null,
    last_run_duration_ms: null
  }
};

test("repairLegacyAccountIdentityDrift merges drift duplicates without rewriting the survivor key", () => {
  resetStoreForTests({
    ...structuredClone(BASE_STORE),
    accounts: [
      {
        id: "acct_survivor",
        userId: "user_1",
        normalizedKey: "chase hyatt",
        displayName: "Hyatt",
        sourceInstitution: "CHASE",
        accountType: "credit",
        currency: "USD",
        initialBalance: 0,
        status: "active",
        includeInCharts: true,
        version: 1,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z"
      },
      {
        id: "acct_duplicate",
        userId: "user_1",
        normalizedKey: "hyatt",
        displayName: "Hyatt",
        sourceInstitution: null,
        accountType: "checking",
        currency: "USD",
        initialBalance: 0,
        status: "active",
        includeInCharts: true,
        version: 1,
        createdAt: "2026-02-01T00:00:00.000Z",
        updatedAt: "2026-02-01T00:00:00.000Z"
      }
    ],
    transactions: [
      {
        id: "txn_duplicate",
        user_id: "user_1",
        account_id: "acct_duplicate",
        account_key: "hyatt",
        source_type: "imported",
        source_file_id: "imp_1",
        transaction_date: "2026-01-15",
        post_date: null,
        merchant_raw: "Payment",
        merchant_normalized: "payment",
        description: "Payment",
        amount: 149.4,
        currency: "USD",
        direction: "outflow",
        category_raw: null,
        category_final: "Uncategorized",
        category_confidence: 1,
        category_strategy: "manual",
        needs_category_review: false,
        review_status: "reviewed",
        tags: [],
        recurring_rule_id: null,
        memo: null,
        dedupe_fingerprint: stableHash(["user_1", "hyatt", "payment", "149.40", "2026-01-15", ""].join("|")),
        deleted_at: null,
        deleted_reason: null,
        deleted_by: null,
        created_at: "2026-01-15T00:00:00.000Z",
        updated_at: "2026-01-15T00:00:00.000Z"
      }
    ]
  });

  const firstRun = repairLegacyAccountIdentityDrift();
  assert.equal(firstRun.duplicateGroupsRepaired, 1);

  const storeAfterFirstRun = loadStore();
  assert.equal(storeAfterFirstRun.accounts.length, 1);
  assert.equal(storeAfterFirstRun.accounts[0]?.id, "acct_survivor");
  assert.equal(storeAfterFirstRun.accounts[0]?.normalizedKey, "chase hyatt");
  assert.equal(storeAfterFirstRun.accounts[0]?.sourceInstitution, "CHASE");
  assert.equal(storeAfterFirstRun.transactions[0]?.account_id, "acct_survivor");
  assert.equal(storeAfterFirstRun.transactions[0]?.account_key, "chase hyatt");
  assert.equal(
    storeAfterFirstRun.transactions[0]?.dedupe_fingerprint,
    stableHash(["user_1", "chase hyatt", "payment", "149.40", "2026-01-15", ""].join("|"))
  );
  assert.equal(
    storeAfterFirstRun.auditEvents.filter((entry) => entry.action === "account.identity.repaired").length,
    1
  );

  const secondRun = repairLegacyAccountIdentityDrift();
  assert.equal(secondRun.duplicateGroupsRepaired, 0);

  const storeAfterSecondRun = loadStore();
  assert.equal(storeAfterSecondRun.accounts.length, 1);
  assert.equal(
    storeAfterSecondRun.auditEvents.filter((entry) => entry.action === "account.identity.repaired").length,
    1
  );
});

test("repairLegacyAccountIdentityDrift skips same-name accounts that differ only by institution", () => {
  resetStoreForTests({
    ...structuredClone(BASE_STORE),
    accounts: [
      {
        id: "acct_chase",
        userId: "user_1",
        normalizedKey: "chase checking",
        displayName: "Checking",
        sourceInstitution: "CHASE",
        accountType: "checking",
        currency: "USD",
        initialBalance: 0,
        status: "active",
        includeInCharts: true,
        version: 1,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z"
      },
      {
        id: "acct_ally",
        userId: "user_1",
        normalizedKey: "ally checking",
        displayName: "Checking",
        sourceInstitution: "ALLY",
        accountType: "checking",
        currency: "USD",
        initialBalance: 0,
        status: "active",
        includeInCharts: true,
        version: 1,
        createdAt: "2026-02-01T00:00:00.000Z",
        updatedAt: "2026-02-01T00:00:00.000Z"
      }
    ],
    transactions: [
      {
        id: "txn_chase",
        user_id: "user_1",
        account_id: "acct_chase",
        account_key: "chase checking",
        source_type: "imported",
        source_file_id: "imp_1",
        transaction_date: "2026-01-15",
        post_date: null,
        merchant_raw: "Store A",
        merchant_normalized: "store a",
        description: "Store A",
        amount: 25,
        currency: "USD",
        direction: "outflow",
        category_raw: null,
        category_final: "Uncategorized",
        category_confidence: 1,
        category_strategy: "manual",
        needs_category_review: false,
        review_status: "reviewed",
        tags: [],
        recurring_rule_id: null,
        memo: null,
        dedupe_fingerprint: stableHash(["user_1", "chase checking", "store a", "25.00", "2026-01-15", ""].join("|")),
        deleted_at: null,
        deleted_reason: null,
        deleted_by: null,
        created_at: "2026-01-15T00:00:00.000Z",
        updated_at: "2026-01-15T00:00:00.000Z"
      },
      {
        id: "txn_ally",
        user_id: "user_1",
        account_id: "acct_ally",
        account_key: "ally checking",
        source_type: "imported",
        source_file_id: "imp_2",
        transaction_date: "2026-01-16",
        post_date: null,
        merchant_raw: "Store B",
        merchant_normalized: "store b",
        description: "Store B",
        amount: 40,
        currency: "USD",
        direction: "outflow",
        category_raw: null,
        category_final: "Uncategorized",
        category_confidence: 1,
        category_strategy: "manual",
        needs_category_review: false,
        review_status: "reviewed",
        tags: [],
        recurring_rule_id: null,
        memo: null,
        dedupe_fingerprint: stableHash(["user_1", "ally checking", "store b", "40.00", "2026-01-16", ""].join("|")),
        deleted_at: null,
        deleted_reason: null,
        deleted_by: null,
        created_at: "2026-01-16T00:00:00.000Z",
        updated_at: "2026-01-16T00:00:00.000Z"
      }
    ]
  });

  const result = repairLegacyAccountIdentityDrift();
  assert.equal(result.duplicateGroupsRepaired, 0);

  const storeAfterRun = loadStore();
  assert.equal(storeAfterRun.accounts.length, 2);
  assert.deepEqual(
    new Set(storeAfterRun.transactions.map((entry) => entry.account_id)),
    new Set(["acct_chase", "acct_ally"])
  );
  assert.equal(
    storeAfterRun.auditEvents.filter((entry) => entry.action === "account.identity.repaired").length,
    0
  );
});
