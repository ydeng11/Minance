# Transaction Model Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the mixed transaction model with a simpler model where account type lives on the account, category drives reporting behavior, transaction flow is `outflow/inflow`, and `net_spend` is derived from category rollups.

**Architecture:** Reuse the existing account, category, transaction, and analytics layers, but remove transaction-level `transaction_type` meaning. Category metadata becomes the single source of reporting truth via `rollup_behavior`, while transaction rows keep only positive `amount` plus explicit flow direction. UI and API contracts should stop exposing `Debit/Credit` and `transaction_type` as user-facing concepts.

**Tech Stack:** TypeScript, Next.js app router, Tailwind CSS, Node test runner (`pnpm tsx --test`), API service modules in `services/api`, SQLite schema in `services/api/sql/schema.sql`.

---

### Task 1: Lock the new behavior with failing tests

**Files:**
- Modify: `services/api/test/analytics.test.ts`
- Modify: `services/api/test/api-contract.test.ts`
- Modify: `services/api/test/transactions-normalization.test.ts`
- Modify: `apps/web/src/app/transactions/form.test.ts`

**Step 1: Add analytics tests for `net_spend`**

Add coverage for this behavior:

```ts
// spend + outflow => adds to spend
// spend + inflow => subtracts from spend
// transfer => excluded
expect(summary.totalSpend).toEqual(60);
```

Use a fixture set that includes:

- `Groceries` outflow `80`
- `Groceries` inflow `20`
- `Credit Card Payment` outflow `500`
- `Salary` inflow `3000`

Expected:

- `gross_spend = 80`
- `refunds = 20`
- `net_spend = 60`
- transfer excluded

**Step 2: Add API contract tests for the new shape**

Assert that:

- transactions return `amount` + `direction`
- transactions no longer require `transaction_type`
- category responses expose `rollup_behavior`

Example assertions:

```ts
assert.equal(tx.direction, "outflow");
assert.ok(!("transaction_type" in tx));
assert.equal(category.rollup_behavior, "spend");
```

**Step 3: Add form tests for the simplified modal**

Assert that:

- draft direction uses `outflow | inflow`
- validation no longer checks `transaction_type`
- category remains required
- displayed amount stays absolute

**Step 4: Run focused tests to confirm RED**

Run:

```bash
pnpm tsx --test services/api/test/analytics.test.ts services/api/test/api-contract.test.ts services/api/test/transactions-normalization.test.ts
pnpm tsx --test apps/web/src/app/transactions/form.test.ts
```

Expected:

- failures referencing stale `debit/credit`, `transaction_type`, or old spend math

**Step 5: Commit**

```bash
git add services/api/test/analytics.test.ts services/api/test/api-contract.test.ts services/api/test/transactions-normalization.test.ts apps/web/src/app/transactions/form.test.ts
git commit -m "test: lock transaction model behavior"
```

### Task 2: Move reporting meaning onto categories

**Files:**
- Modify: `services/api/sql/schema.sql`
- Modify: `services/api/src/categories.ts`
- Modify: `services/api/src/category-strategy.ts`
- Modify: `apps/web/src/lib/api/types.ts`
- Modify: `apps/web/src/app/categories/page.tsx`

**Step 1: Replace category `type` with `rollup_behavior` in the API layer**

Change the enum to:

```ts
const CATEGORY_ROLLUP_VALUES = new Set(["spend", "income", "transfer"]);
```

Normalize:

```ts
payload.rollup_behavior ?? payload.rollupBehavior ?? payload.type
```

This keeps input compatibility while making `rollup_behavior` canonical.

**Step 2: Persist `rollup_behavior` in stored category records**

Update category read/write helpers so category responses look like:

```ts
{
  name,
  coarseKey,
  rollup_behavior,
  budget
}
```

**Step 3: Update category defaults and strategy logic**

Map current default categories to the approved behavior:

- `Groceries` => `spend`
- `Salary` => `income`
- `Other Income` => `income`
- `Transfer` / `Credit Card Payments` => `transfer`

**Step 4: Update category-management UI**

Replace user-facing “Category type” copy with “Rollup behavior”.

The form and table should present:

- `Spend`
- `Income`
- `Transfer`

**Step 5: Run focused tests**

Run:

```bash
pnpm tsx --test services/api/test/api-contract.test.ts services/api/test/category-strategy.test.ts
```

Expected:

- PASS with category responses using `rollup_behavior`

**Step 6: Commit**

```bash
git add services/api/sql/schema.sql services/api/src/categories.ts services/api/src/category-strategy.ts apps/web/src/lib/api/types.ts apps/web/src/app/categories/page.tsx
git commit -m "feat: move transaction rollups onto categories"
```

### Task 3: Simplify transaction persistence and contracts

**Files:**
- Modify: `services/api/src/transactions.ts`
- Modify: `services/api/src/server.ts`
- Modify: `apps/web/src/lib/api/types.ts`
- Modify: `apps/web/src/lib/api/endpoints.ts`
- Modify: `apps/web/src/app/transactions/form.ts`
- Modify: `apps/web/src/app/transactions/page.tsx`
- Modify: `apps/web/src/app/transactions/filters.ts`
- Modify: `apps/web/src/app/transactions/filters.test.ts`

**Step 1: Make `direction` mean `outflow | inflow`**

Replace legacy transaction-level meanings with:

```ts
type FlowDirection = "outflow" | "inflow";
```

Normalize imported or stored variants into the new enum:

```ts
if (rawDirection === "debit") return "outflow";
if (rawDirection === "credit") return "inflow";
```

**Step 2: Remove `transaction_type` from transaction normalization and API output**

Delete transaction-type inference from `services/api/src/transactions.ts`.

A normalized transaction should look like:

```ts
{
  amount: Math.abs(rawAmount),
  direction,
  category_final,
}
```

No stored or returned `transaction_type`.

**Step 3: Remove `transaction_type` from filters and transaction forms**

Delete:

- filter parsing/serialization for `transaction_type`
- modal select for transaction type
- validation branches tied to transaction type

Keep:

- amount
- direction
- category
- account
- memo
- tags

**Step 4: Rename user-facing copy**

Where the UI exposes the direction field directly, show:

- `Outflow`
- `Inflow`

Do not show:

- `Debit`
- `Credit`

**Step 5: Run focused tests**

Run:

```bash
pnpm tsx --test services/api/test/api-contract.test.ts services/api/test/transactions-normalization.test.ts
pnpm tsx --test apps/web/src/app/transactions/form.test.ts apps/web/src/app/transactions/filters.test.ts
```

Expected:

- PASS with no transaction-type requirements remaining

**Step 6: Commit**

```bash
git add services/api/src/transactions.ts services/api/src/server.ts apps/web/src/lib/api/types.ts apps/web/src/lib/api/endpoints.ts apps/web/src/app/transactions/form.ts apps/web/src/app/transactions/page.tsx apps/web/src/app/transactions/filters.ts apps/web/src/app/transactions/filters.test.ts
git commit -m "feat: simplify transaction model contracts"
```

### Task 4: Rework analytics and imports around flow plus category rollups

**Files:**
- Modify: `services/api/src/analytics.ts`
- Modify: `services/api/src/imports.ts`
- Modify: `services/api/src/categorization.ts`
- Modify: `services/api/src/ofx-qfx.ts`
- Modify: `apps/web/src/app/import/page.tsx`
- Modify: `apps/web/src/lib/api/types.ts`

**Step 1: Calculate spend from category behavior, not direction alone**

Replace logic like:

```ts
txn.direction === "debit"
```

with logic like:

```ts
txn.rollup_behavior === "spend" && txn.direction === "outflow"
```

and:

```ts
txn.rollup_behavior === "spend" && txn.direction === "inflow"
```

for refunds.

**Step 2: Add explicit refund subtraction to overview math**

Implement:

```ts
const grossSpend = ...
const refunds = ...
const netSpend = grossSpend - refunds;
```

Use `netSpend` as the main user-facing spend metric.

**Step 3: Keep imports sign-tolerant but normalize to canonical flow**

Import code should still accept inconsistent source signs and source wording, but commit canonical rows as:

```ts
amount: Math.abs(parsedAmount),
direction: "outflow" | "inflow"
```

**Step 4: Keep default categorization aligned with rollups**

Examples:

- inflow uncategorized fallback should prefer an income category
- payment / transfer categories should resolve to `transfer`

**Step 5: Run focused tests**

Run:

```bash
pnpm tsx --test services/api/test/analytics.test.ts services/api/test/imports.test.ts services/api/test/ofx-qfx.test.ts services/api/test/categorization.test.ts
```

Expected:

- PASS with transfers excluded and refunds reducing spend

**Step 6: Commit**

```bash
git add services/api/src/analytics.ts services/api/src/imports.ts services/api/src/categorization.ts services/api/src/ofx-qfx.ts apps/web/src/app/import/page.tsx apps/web/src/lib/api/types.ts
git commit -m "feat: align analytics and imports with flow model"
```

### Task 5: Final verification and cleanup

**Files:**
- Verify all files touched above

**Step 1: Run service tests**

Run:

```bash
pnpm tsx --test services/api/test/**/*.test.ts
```

Expected:

- PASS

**Step 2: Run frontend transaction tests**

Run:

```bash
cd apps/web && pnpm tsx --test src/app/transactions/form.test.ts src/app/transactions/filters.test.ts
```

Expected:

- PASS

**Step 3: Build the web app**

Run:

```bash
pnpm --filter @minance/web build
```

Expected:

- successful production build

**Step 4: Review for stale terminology**

Search for old semantics:

```bash
rg -n "transaction_type|Debit|Credit|debit|credit" services/api/src apps/web/src
```

Expected:

- remaining matches only where legacy import parsing still needs compatibility handling

**Step 5: Commit**

```bash
git add .
git commit -m "chore: finish transaction model refactor"
```
