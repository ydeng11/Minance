# Transactions Multiselect Filters Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor the Transactions page so `Category`, `Account`, and `Type` are array-native multiselect filters with Explorer-style UI, repeated query params, and `OR`-within / `AND`-across filtering semantics.

**Architecture:** First convert transactions filter parsing and serialization to array-native state so the UI, URL, and request helpers share one contract. Then update the transactions API boundary and backend filtering to accept repeated params, and finally replace the Transactions native selects with a shared multiselect component extracted from Explorer so both surfaces stay visually and behaviorally aligned.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS, Node `node:test` via `tsx`, Playwright

---

### Task 1: Refactor Transactions filter state to array-native fields

**Files:**
- Modify: `apps/web/src/app/transactions/filters.ts`
- Modify: `apps/web/src/app/transactions/filters.test.ts`

**Step 1: Write the failing test**

Expand `apps/web/src/app/transactions/filters.test.ts` with coverage like:

```ts
test("parseTransactionsFilterState reads repeated category, account, and type params", () => {
  const parsed = parseTransactionsFilterState(
    new URLSearchParams(
      "category=Dining&category=Groceries&account=checking&account=travel-card&type=expense&type=transfer"
    )
  );

  assert.deepEqual(parsed.categories, ["Dining", "Groceries"]);
  assert.deepEqual(parsed.accounts, ["checking", "travel-card"]);
  assert.deepEqual(parsed.transactionTypes, ["expense", "transfer"]);
});

test("buildTransactionsFilterSearchParams writes repeated multiselect params", () => {
  const params = buildTransactionsFilterSearchParams({
    ...createDefaultTransactionsFilterState(),
    categories: ["Dining", "Groceries"],
    accounts: ["checking", "travel-card"],
    transactionTypes: ["expense", "transfer"]
  });

  assert.deepEqual(params.getAll("category"), ["Dining", "Groceries"]);
  assert.deepEqual(params.getAll("account"), ["checking", "travel-card"]);
  assert.deepEqual(params.getAll("type"), ["expense", "transfer"]);
});

test("toValidFilterState trims and deduplicates transactions multiselect values", () => {
  const validated = toValidFilterState({
    ...createDefaultTransactionsFilterState(),
    categories: [" Dining ", "Groceries", "Dining"],
    accounts: [" checking ", "travel-card", "checking"],
    transactionTypes: ["expense", "transfer", "expense"]
  });

  assert.deepEqual(validated.categories, ["Dining", "Groceries"]);
  assert.deepEqual(validated.accounts, ["checking", "travel-card"]);
  assert.deepEqual(validated.transactionTypes, ["expense", "transfer"]);
});
```

Also update the default-state expectations to remove scalar `category`, `account`, and `transactionType`.

**Step 2: Run test to verify it fails**

Run: `env NODE_ENV=test pnpm --filter @minance/web exec tsx --test src/app/transactions/filters.test.ts`

Expected: FAIL because the current state shape still exposes scalar fields and only reads one query value per filter.

**Step 3: Write minimal implementation**

Update `apps/web/src/app/transactions/filters.ts` so:
- `TransactionsFilterState` uses `categories`, `accounts`, and `transactionTypes`
- `TransactionsListApiParams` accepts arrays for `category`, `account`, and `transaction_type`
- parsing reads `searchParams.getAll(...)`
- URL building appends repeated params
- validation trims, drops empties, deduplicates, and validates transaction-type values
- the default unfiltered type state is `transactionTypes: []`

Implementation sketch:

```ts
function cleanStringList(values: string[]) {
  const seen = new Set<string>();
  const cleaned: string[] = [];

  for (const value of values.map((entry) => entry.trim()).filter(Boolean)) {
    if (seen.has(value)) {
      continue;
    }
    seen.add(value);
    cleaned.push(value);
  }

  return cleaned;
}
```

**Step 4: Run test to verify it passes**

Run: `env NODE_ENV=test pnpm --filter @minance/web exec tsx --test src/app/transactions/filters.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/app/transactions/filters.ts apps/web/src/app/transactions/filters.test.ts
git commit -m "refactor: make transactions filters array-native"
```

### Task 2: Update client transactions endpoint query building for repeated params

**Files:**
- Modify: `apps/web/src/lib/api/endpoints.ts`
- Modify: `apps/web/src/lib/api/endpoints.test.ts`

**Step 1: Write the failing test**

Add endpoint coverage like:

```ts
test("transactionsApi.list appends repeated category, account, and type params", async () => {
  const { calls, request } = createRecorder();

  await transactionsApi.list(request, {
    range: "90d",
    category: ["Dining", "Groceries"],
    account: ["checking", "travel-card"],
    transaction_type: ["expense", "transfer"],
    category_view: "coarse"
  });

  assert.equal(
    calls[0].path,
    "/v1/transactions?range=90d&category=Dining&category=Groceries&account=checking&account=travel-card&transaction_type=expense&transaction_type=transfer&category_view=coarse"
  );
});
```

Keep the existing coverage for `needs_category_review`, `min_amount`, and `max_amount`.

**Step 2: Run test to verify it fails**

Run: `env NODE_ENV=test pnpm --filter @minance/web exec tsx --test src/lib/api/endpoints.test.ts`

Expected: FAIL because `transactionsApi.list` still types those params as scalars and current tests still encode single-value usage.

**Step 3: Write minimal implementation**

Update `apps/web/src/lib/api/endpoints.ts` so `transactionsApi.list` accepts:
- `category?: string[]`
- `account?: string[]`
- `transaction_type?: Array<"expense" | "income" | "transfer">`

Then update the existing transactions endpoint tests to assert the repeated query format.

Implementation sketch:

```ts
await transactionsApi.list(request, {
  category: ["Dining", "Groceries"],
  account: ["checking", "travel-card"],
  transaction_type: ["expense", "transfer"]
});
```

`buildQuery` already appends arrays, so no helper rewrite should be necessary.

**Step 4: Run test to verify it passes**

Run: `env NODE_ENV=test pnpm --filter @minance/web exec tsx --test src/lib/api/endpoints.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/lib/api/endpoints.ts apps/web/src/lib/api/endpoints.test.ts
git commit -m "refactor: support repeated transactions query params"
```

### Task 3: Make `/v1/transactions` and shared filters honor array semantics

**Files:**
- Modify: `services/api/src/server.ts`
- Modify: `services/api/src/transactionFilters.ts`
- Modify: `services/api/test/api-contract.test.ts`

**Step 1: Write the failing test**

Add API contract coverage like:

```ts
test("GET /v1/transactions applies OR within multiselects and AND across filter groups", async () => {
  const result = await apiRequest(
    context,
    "GET",
    "/v1/transactions?range=all&category=Dining&category=Groceries&account=checking&account=travel-card&transaction_type=expense&transaction_type=transfer",
    { token: accessToken, expectedStatus: 200 }
  );

  assert.equal(result.status, 200);
  assert.equal(Array.isArray(result.payload?.items), true);
});
```

Use fixtures or created transactions that prove:
- category array uses `OR`
- account array uses `OR`
- transaction type array uses `OR`
- combining groups uses `AND`

Also add a smaller contract assertion that repeated account params are accepted.

**Step 2: Run test to verify it fails**

Run: `pnpm exec tsx --test services/api/test/api-contract.test.ts --test-name-pattern "OR within multiselects|repeated account params"`

Expected: FAIL because `/v1/transactions` still reads `category`, `account`, and `transaction_type` with `searchParams.get(...)`, so only one value survives.

**Step 3: Write minimal implementation**

Update the backend so:
- `/v1/transactions` reads `searchParams.getAll("category")`
- `/v1/transactions` reads `searchParams.getAll("account")`
- `/v1/transactions` reads `searchParams.getAll("transaction_type")`
- `applySharedTransactionFilters` normalizes account filters into a deduplicated list
- account filtering matches when any selected account matches `account_key` or `account_id`
- empty arrays mean no constraint

Implementation sketch:

```ts
function normalizeFilterList(rawValue) {
  const values = Array.isArray(rawValue) ? rawValue : rawValue == null ? [] : [rawValue];
  const cleaned: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const normalized = String(value || "").trim();
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    cleaned.push(normalized);
  }

  return cleaned;
}
```

`filterUserTransactions` already supports category lists, so the main new backend work is the request parsing and repeated-account matching.

**Step 4: Run test to verify it passes**

Run: `pnpm exec tsx --test services/api/test/api-contract.test.ts --test-name-pattern "OR within multiselects|repeated account params"`

Expected: PASS

**Step 5: Commit**

```bash
git add services/api/src/server.ts services/api/src/transactionFilters.ts services/api/test/api-contract.test.ts
git commit -m "feat: add transactions multiselect filter semantics"
```

### Task 4: Replace Transactions selects with the shared multiselect UI

**Files:**
- Create: `apps/web/src/components/filters/MultiSelectField.tsx`
- Modify: `apps/web/src/app/explorer/components/ExplorerAdvancedFilters.tsx`
- Modify: `apps/web/src/app/transactions/page.tsx`
- Modify: `e2e/specs/transactions-category-view-filter.spec.ts`
- Create: `e2e/specs/transactions-multiselect-filters.spec.ts`

**Step 1: Write the failing test**

Add a new Playwright spec that:
- opens Transactions
- selects multiple categories
- selects multiple accounts
- selects multiple types
- applies filters
- asserts the URL contains repeated `category`, `account`, and `type` params
- asserts the ledger remains scoped to matching rows

Also update `e2e/specs/transactions-category-view-filter.spec.ts` so it verifies the new multiselect trigger state instead of a native `<select>`, and confirms switching `Category View` clears all selected categories.

Implementation sketch for the new test:

```ts
await page.getByTestId("txn-category-filter-trigger").click();
await page.getByRole("option", { name: "Dining" }).click();
await page.getByRole("option", { name: "Groceries" }).click();
await page.getByTestId("txn-account-filter-trigger").click();
await page.getByRole("option", { name: /Checking/i }).click();
await page.getByRole("option", { name: /Travel Card/i }).click();
await applyTransactionsFilters(page);
await expect(page).toHaveURL(/category=Dining/);
await expect(page).toHaveURL(/category=Groceries/);
```

**Step 2: Run test to verify it fails**

Run: `env NODE_ENV=test pnpm exec playwright test e2e/specs/transactions-category-view-filter.spec.ts e2e/specs/transactions-multiselect-filters.spec.ts`

Expected: FAIL because the Transactions page still renders native selects and does not expose multiselect triggers.

**Step 3: Write minimal implementation**

Implement the shared UI and wire it into Transactions:
- extract Explorer’s `MultiSelectField` into `apps/web/src/components/filters/MultiSelectField.tsx`
- preserve Explorer test ids and behavior while migrating it to the shared component
- replace the Transactions native `Category`, `Account`, and `Type` selects with the shared multiselect
- use array state updates for all three filters
- clear `categories` whenever `categoryView` changes
- prune selected categories and accounts when available options change
- keep the existing `Apply filters` and `Clear` flow, with page reset behavior unchanged

Implementation sketch:

```tsx
<MultiSelectField
  label="Category"
  selectedValues={filters.categories}
  options={categoryFilterOptions.map((value) => ({ value, label: value }))}
  onChange={(categories) => updateFilters((previous) => ({ ...previous, categories }))}
  emptyLabel="All categories"
  testId="txn-category-filter"
  searchable
/>
```

For `Type`, pass options for `expense`, `income`, and `transfer` without search.

**Step 4: Run test to verify it passes**

Run: `env NODE_ENV=test pnpm exec playwright test e2e/specs/transactions-category-view-filter.spec.ts e2e/specs/transactions-multiselect-filters.spec.ts`

Expected: PASS

Then run regression checks:
- `env NODE_ENV=test pnpm exec playwright test e2e/specs/transactions-ledger-header-controls.spec.ts --grep "filter by amount bar"`
- `env NODE_ENV=test pnpm exec playwright test e2e/specs/explorer-upgrade.spec.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/components/filters/MultiSelectField.tsx apps/web/src/app/explorer/components/ExplorerAdvancedFilters.tsx apps/web/src/app/transactions/page.tsx e2e/specs/transactions-category-view-filter.spec.ts e2e/specs/transactions-multiselect-filters.spec.ts
git commit -m "feat: add transactions multiselect filter controls"
```

### Task 5: Run focused end-to-end verification before handoff

**Files:**
- Modify: none

**Step 1: Run the focused verification suite**

Run:

```bash
env NODE_ENV=test pnpm --filter @minance/web exec tsx --test src/app/transactions/filters.test.ts
env NODE_ENV=test pnpm --filter @minance/web exec tsx --test src/lib/api/endpoints.test.ts
pnpm exec tsx --test services/api/test/api-contract.test.ts --test-name-pattern "OR within multiselects|repeated account params"
env NODE_ENV=test pnpm exec playwright test e2e/specs/transactions-category-view-filter.spec.ts e2e/specs/transactions-multiselect-filters.spec.ts
env NODE_ENV=test pnpm exec playwright test e2e/specs/transactions-ledger-header-controls.spec.ts --grep "filter by amount bar"
env NODE_ENV=test pnpm exec playwright test e2e/specs/explorer-upgrade.spec.ts
```

Expected: PASS on all targeted checks.

**Step 2: Inspect git status**

Run: `git status --short`

Expected: clean working tree

**Step 3: Commit if verification required follow-up fixes**

If any verification-only fixes were needed:

```bash
git add <updated files>
git commit -m "fix: tighten transactions multiselect regressions"
```

Otherwise, no additional commit is needed.
