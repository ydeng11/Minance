# Legacy SQLite Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a direct legacy-SQLite-to-new-SQLite migration script that preserves duplicate source rows, replaces previously migrated financial data on rerun, and writes transaction-model-aligned data for accounts, categories, and transactions.

**Architecture:** Reuse and tighten `services/api/src/migration.ts` as the single migration core, then expose it through a dedicated CLI script. Because the current backend still has legacy `debit/credit` and category `type` assumptions, add a small compatibility layer in transaction, analytics, and category normalization so migrated `outflow/inflow` plus `rollupBehavior` data is readable immediately.

**Tech Stack:** TypeScript, Node test runner (`pnpm tsx --test`), `sqlite3` CLI, store abstraction in `services/api/src`, SQLite schema in `services/api/sql/schema.sql`.

---

### Task 1: Lock The Mapping Rules With Failing Unit Tests

**Files:**
- Create: `services/api/test/migration.test.ts`
- Modify: `services/api/src/migration.ts`

**Step 1: Write the failing test**

Create focused tests for pure migration helpers:

```ts
test("inferMigratedAccountType prefers account naming over broken legacy account_type", () => {
  assert.equal(inferMigratedAccountType({ bankName: "BANK_OF_AMERICA", accountName: "Peach's Checking" }), "checking");
  assert.equal(inferMigratedAccountType({ bankName: "BANK_OF_AMERICA", accountName: "Peach's Saving" }), "savings");
  assert.equal(inferMigratedAccountType({ bankName: "PAYPAL", accountName: "Peach's Balance" }), "cash");
  assert.equal(inferMigratedAccountType({ bankName: "CHASE", accountName: "CashRewards" }), "credit_card");
});

test("inferFlowDirectionFromLegacyAmount uses legacy sign and always stores positive amount", () => {
  assert.equal(inferFlowDirectionFromLegacyAmount(291), "outflow");
  assert.equal(inferFlowDirectionFromLegacyAmount(-2571.03), "inflow");
  assert.equal(toCanonicalMigrationAmount(-2571.03), 2571.03);
});

test("resolveCanonicalRollupBehavior maps legacy categories to approved rollup behavior", () => {
  assert.equal(resolveCanonicalRollupBehavior("Groceries"), "spend");
  assert.equal(resolveCanonicalRollupBehavior("Salary"), "income");
  assert.equal(resolveCanonicalRollupBehavior("Credit Card Payments"), "transfer");
});

test("buildLegacyRowFingerprint preserves duplicate content rows by using transaction identity", () => {
  assert.equal(buildLegacyRowFingerprint(172), "legacy-sqlite:172");
  assert.equal(buildLegacyRowFingerprint(173), "legacy-sqlite:173");
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
pnpm tsx --test services/api/test/migration.test.ts
```

Expected:

- FAIL because the migration helpers are not exported or still return legacy-oriented values

**Step 3: Write minimal implementation**

In `services/api/src/migration.ts`, add exported pure helpers used by the migration runner:

```ts
export function inferMigratedAccountType({ bankName, accountName }) {
  const normalized = normalizeText(`${bankName || ""} ${accountName || ""}`);
  if (normalized.includes("checking")) return "checking";
  if (normalized.includes("saving")) return "savings";
  if (normalized.includes("paypal") && normalized.includes("balance")) return "cash";
  if (normalized.includes("broker") || normalized.includes("fidelity") || normalized.includes("investment")) return "investment";
  if (normalized.includes("loan")) return "loan";
  return "credit_card";
}

export function inferFlowDirectionFromLegacyAmount(amount) {
  return Number(amount) > 0 ? "outflow" : "inflow";
}

export function toCanonicalMigrationAmount(amount) {
  return Math.abs(Number(amount));
}

export function buildLegacyRowFingerprint(transactionId) {
  return `legacy-sqlite:${String(transactionId)}`;
}
```

Use a fixed category-to-rollup map for the canonical category set approved in the design doc.

**Step 4: Run test to verify it passes**

Run:

```bash
pnpm tsx --test services/api/test/migration.test.ts
```

Expected:

- PASS

**Step 5: Commit**

```bash
git add services/api/test/migration.test.ts services/api/src/migration.ts
git commit -m "test: lock legacy migration mapping rules"
```

### Task 2: Lock Replace Semantics And Duplicate Preservation End-To-End

**Files:**
- Create: `services/api/test/migration-cli.test.ts`
- Modify: `services/api/src/migration.ts`

**Step 1: Write the failing test**

Create an integration test that:

- builds a temporary legacy backup SQLite database with:
  - a mislabeled checking account
  - two duplicate-content transaction rows with different `transaction_id`
  - canonical category mappings
- runs the migration twice against a temporary target SQLite file
- asserts:
  - both duplicate rows are present after the first run
  - rerunning does not append a second full copy
  - migrated rows use positive `amount`
  - migrated rows store `direction` as `outflow` / `inflow`
  - categories persist `rollupBehavior`

Example skeleton:

```ts
test("legacy sqlite migration preserves duplicates and replaces prior migrated data on rerun", { skip: !isSqliteCliAvailable() }, () => {
  const temp = createTempMigrationPaths();
  seedLegacyBackup(temp.sourceDb);

  runMigrationCli(temp.sourceDb, temp.targetDb, "legacy@example.com");
  runMigrationCli(temp.sourceDb, temp.targetDb, "legacy@example.com");

  const txns = queryJson(temp.targetDb, "SELECT payload_json FROM transactions ORDER BY id;");
  const parsed = txns.map((row) => JSON.parse(String(row.payload_json)));

  assert.equal(parsed.length, 3);
  assert.equal(parsed.filter((entry) => entry.description === "MTA ride").length, 2);
  assert.deepEqual(parsed.map((entry) => entry.amount), [2.9, 2.9, 3200]);
  assert.deepEqual(parsed.map((entry) => entry.direction), ["outflow", "outflow", "inflow"]);
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
pnpm tsx --test services/api/test/migration-cli.test.ts
```

Expected:

- FAIL because the CLI does not exist yet or the migration runner still dedupes by content and appends on rerun

**Step 3: Write minimal implementation**

In `services/api/src/migration.ts`, rework `runLegacyMigration` to:

- initialize the target SQLite foundation before writes
- resolve or create the target user
- remove only the target user’s migrated financial data before import
- read source rows with `sqlite3 -json`
- preserve every legacy transaction row
- set transaction fingerprint from `transaction_id`
- store category `rollupBehavior` and derived legacy `type` during the transition
- wrap the user-data replacement and import in one transactional write

Use this shape for migrated transactions:

```ts
store.transactions.push({
  id: createId("txn"),
  user_id: userId,
  account_id: accountId,
  account_key: accountKey,
  source_type: "legacy_sqlite",
  source_file_id: runId,
  transaction_date: transactionDate,
  post_date: postDate,
  merchant_raw: description,
  merchant_normalized: normalizeMerchant(description),
  description,
  amount: toCanonicalMigrationAmount(rawAmount),
  currency: "USD",
  direction: inferFlowDirectionFromLegacyAmount(rawAmount),
  flowDirection: inferFlowDirectionFromLegacyAmount(rawAmount),
  category_raw: rawCategory,
  category_final: mappedCategory,
  dedupe_fingerprint: buildLegacyRowFingerprint(legacyTransactionId),
  payloadVersion: "legacy-sqlite-v1"
});
```

**Step 4: Run test to verify it passes**

Run:

```bash
pnpm tsx --test services/api/test/migration.test.ts services/api/test/migration-cli.test.ts
```

Expected:

- PASS

**Step 5: Commit**

```bash
git add services/api/test/migration-cli.test.ts services/api/src/migration.ts
git commit -m "feat: preserve duplicates in legacy sqlite migration"
```

### Task 3: Add The Dedicated CLI Script

**Files:**
- Create: `scripts/migrate-legacy-sqlite.ts`
- Modify: `package.json`
- Modify: `services/api/src/migration.ts`

**Step 1: Write the failing test**

Extend `services/api/test/migration-cli.test.ts` with CLI-specific behavior:

```ts
test("legacy sqlite cli prints usage when --help is passed", { skip: !isSqliteCliAvailable() }, () => {
  const result = spawnSync("tsx", ["scripts/migrate-legacy-sqlite.ts", "--help"], {
    cwd: ROOT_DIR,
    encoding: "utf8"
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Usage: tsx scripts\\/migrate-legacy-sqlite\\.ts/);
});
```

Also add a failing assertion for the JSON summary shape:

```ts
assert.equal(summary.ok, true);
assert.equal(summary.loader, "legacy-sqlite");
assert.equal(typeof summary.transactionsImported, "number");
```

**Step 2: Run test to verify it fails**

Run:

```bash
pnpm tsx --test services/api/test/migration-cli.test.ts
```

Expected:

- FAIL because the script and summary contract are missing

**Step 3: Write minimal implementation**

Add `scripts/migrate-legacy-sqlite.ts`:

```ts
#!/usr/bin/env node
import process from "node:process";
import { runLegacyMigrationCli } from "../services/api/src/migration.ts";

const result = await runLegacyMigrationCli(process.argv.slice(2));
console.log(JSON.stringify({ ok: true, loader: "legacy-sqlite", ...result }, null, 2));
```

Support:

- `--source <path>`
- `--target <path>`
- `--schema <path>`
- `--user-email <email>`
- `--help`

Add a root package shortcut:

```json
"migrate:legacy-sqlite": "tsx scripts/migrate-legacy-sqlite.ts"
```

**Step 4: Run test to verify it passes**

Run:

```bash
pnpm tsx --test services/api/test/migration-cli.test.ts
```

Expected:

- PASS

**Step 5: Commit**

```bash
git add scripts/migrate-legacy-sqlite.ts package.json services/api/src/migration.ts services/api/test/migration-cli.test.ts
git commit -m "feat: add legacy sqlite migration cli"
```

### Task 4: Add Compatibility For `outflow/inflow` And `rollupBehavior`

**Files:**
- Modify: `services/api/src/transactions.ts`
- Modify: `services/api/src/analytics.ts`
- Modify: `services/api/src/categories.ts`
- Modify: `services/api/test/transactions-normalization.test.ts`
- Modify: `services/api/test/analytics.test.ts`
- Modify: `services/api/test/api-contract.test.ts`

**Step 1: Write the failing test**

Add focused tests for the migrated data shape:

```ts
test("listTransactions preserves positive amounts for outflow and inflow rows", () => {
  resetStoreForTests({
    ...BASE_STORE,
    transactions: [
      { id: "txn_1", user_id: "user_1", amount: 120.45, direction: "outflow", category_final: "Groceries" },
      { id: "txn_2", user_id: "user_1", amount: 2000, direction: "inflow", category_final: "Salary" }
    ]
  });

  const listed = listTransactions("user_1", { range: "all", limit: 50, offset: 0 });
  assert.equal(listed.items[0].amount > 0, true);
});

test("overview treats outflow as spend and inflow as income/refund", () => {
  // spend outflow + salary inflow
});

test("category responses expose rollupBehavior while preserving transitional type", () => {
  assert.equal(category.rollupBehavior, "transfer");
  assert.equal(category.type, "transfer");
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
pnpm tsx --test services/api/test/transactions-normalization.test.ts services/api/test/analytics.test.ts services/api/test/api-contract.test.ts
```

Expected:

- FAIL because current normalization only understands `debit/credit` and category responses do not surface `rollupBehavior`

**Step 3: Write minimal implementation**

Update the backend compatibility layer:

```ts
function normalizeFlowDirection(rawDirection, rawAmount) {
  const value = String(rawDirection || "").trim().toLowerCase();
  if (value === "outflow" || value === "debit") return "outflow";
  if (value === "inflow" || value === "credit") return "inflow";
  return Number(rawAmount) < 0 ? "outflow" : "inflow";
}
```

Use that normalized direction in:

- transaction listing
- analytics spend/income math
- any transaction contract serialization

In `services/api/src/categories.ts`, surface:

```ts
rollupBehavior: category.rollupBehavior ?? deriveRollupBehaviorFromType(category.type),
type: category.type ?? deriveLegacyTypeFromRollupBehavior(category.rollupBehavior)
```

This keeps the migrated data aligned with the approved model while avoiding a larger refactor in this task.

**Step 4: Run test to verify it passes**

Run:

```bash
pnpm tsx --test services/api/test/migration.test.ts services/api/test/migration-cli.test.ts services/api/test/transactions-normalization.test.ts services/api/test/analytics.test.ts services/api/test/api-contract.test.ts
```

Expected:

- PASS

**Step 5: Commit**

```bash
git add services/api/src/transactions.ts services/api/src/analytics.ts services/api/src/categories.ts services/api/test/transactions-normalization.test.ts services/api/test/analytics.test.ts services/api/test/api-contract.test.ts
git commit -m "feat: support transaction-model migration data"
```

### Task 5: Verify Against The Real Backup And Finish Cleanly

**Files:**
- Modify: `services/api/test/migration-cli.test.ts`

**Step 1: Add a smoke test or guarded verification helper for the real backup**

Add a guarded integration path that can run against the checked-in backup DB when `sqlite3` is available:

```ts
test("real backup migrates with stable counts", { skip: !isSqliteCliAvailable() }, () => {
  const summary = runMigrationAgainstRealBackup();
  assert.equal(summary.transactionsImported, 2510);
  assert.equal(summary.duplicateTransactionsSkipped, 0);
});
```

If you prefer not to keep the full-count assertion in CI, keep it as a local-only helper and use the same command manually in Step 2.

**Step 2: Run targeted verification**

Run:

```bash
pnpm tsx --test services/api/test/migration.test.ts services/api/test/migration-cli.test.ts services/api/test/transactions-normalization.test.ts services/api/test/analytics.test.ts services/api/test/api-contract.test.ts
```

Then run a real-backup smoke command:

```bash
MINANCE_STORE_BACKEND=sqlite MINANCE_SQLITE_FILE=/tmp/minance-legacy-migrate.sqlite tsx scripts/migrate-legacy-sqlite.ts --source backup_2026-02-26_00-00-03.db --target /tmp/minance-legacy-migrate.sqlite --user-email legacy@example.com
```

Expected:

- tests PASS
- CLI exits `0`
- JSON summary reports `transactionsImported: 2510`
- JSON summary reports `duplicateTransactionsSkipped: 0`

**Step 3: Inspect the target DB**

Run:

```bash
sqlite3 -json /tmp/minance-legacy-migrate.sqlite "SELECT COUNT(*) AS tx_count FROM transactions; SELECT COUNT(*) AS category_count FROM categories;"
```

Expected:

- transaction count matches the summary
- category rows match the canonical imported set

**Step 4: Commit**

```bash
git add services/api/test/migration-cli.test.ts
git commit -m "test: verify legacy sqlite migration against backup"
```
