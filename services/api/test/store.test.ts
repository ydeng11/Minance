import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import { DATA_FILE } from "../src/config.ts";
import { login, signup } from "../src/auth.ts";
import { refreshStoreCacheIfChanged, resetStoreForTests } from "../src/store.ts";

const EMPTY_STORE = {
  users: [],
  sessions: [],
  accounts: [],
  transactions: [],
  recurringRules: [],
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
  auditEvents: []
};

test("refreshStoreCacheIfChanged preserves external store writes across auth mutations", () => {
  resetStoreForTests(structuredClone(EMPTY_STORE));

  const email = "cache-seed@example.com";
  const password = "cachepass123";
  const created = signup(email, password);

  const onDiskBeforeSeed = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  onDiskBeforeSeed.transactions.push({
    id: "txn_external_seed",
    user_id: created.user.id,
    account_id: null,
    account_key: "seed_account",
    source_type: "legacy_api",
    source_file_id: null,
    transaction_date: "2026-01-01",
    post_date: null,
    merchant_raw: "Seed Merchant",
    merchant_normalized: "seed merchant",
    description: "Seed transaction",
    amount: 42,
    currency: "USD",
    direction: "debit",
    category_raw: null,
    category_final: "Uncategorized",
    category_coarse: "Other",
    category_emoji: "⚫",
    category_confidence: 1,
    category_strategy: "legacy_api_mapping",
    needs_category_review: false,
    memo: null,
    dedupe_fingerprint: "external-seed",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z"
  });
  fs.writeFileSync(DATA_FILE, JSON.stringify(onDiskBeforeSeed, null, 2));

  // Running API code refreshes the cache before handling each request.
  refreshStoreCacheIfChanged();

  // A later write from this process must not discard externally seeded rows.
  login(email, password);

  const after = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  assert.equal(
    after.transactions.some((entry: { id: string }) => entry.id === "txn_external_seed"),
    true
  );
});
