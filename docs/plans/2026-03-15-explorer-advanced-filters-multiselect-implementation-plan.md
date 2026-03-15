# Explorer Advanced Filters Multiselect Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor Explorer advanced filters so category and transaction type are true multi-select filters, the amount control uses the transactions-style amount bar, and tag input offers autosuggestions from Explorer metadata.

**Architecture:** Make Explorer filter state, URL parsing, analytics request handling, and backend filtering array-native for `categories` and `transactionTypes`. Add first-class Explorer metadata for `amountBounds` and `availableTags`, extract the existing transactions amount bar into a reusable TSX control, then rebuild the advanced-filters modal and surrounding Explorer page logic around the new contract.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS, Node `node:test` via `tsx`, Playwright

---

### Task 1: Refactor Explorer filter state to array-native category and transaction-type fields

**Files:**
- Modify: `apps/web/src/app/explorer/filters.ts`
- Modify: `apps/web/src/app/explorer/filters.test.ts`

**Step 1: Write the failing test**

Expand `apps/web/src/app/explorer/filters.test.ts` with coverage like:

```ts
test("parseExplorerFilterState reads repeated category and type params into arrays", () => {
  const state = parseExplorerFilterState(
    new URLSearchParams("category=Food&category=Travel&type=expense&type=transfer")
  );

  assert.deepEqual(state.categories, ["Food", "Travel"]);
  assert.deepEqual(state.transactionTypes, ["expense", "transfer"]);
});

test("buildExplorerFilterSearchParams writes repeated category and type params", () => {
  const params = buildExplorerFilterSearchParams({
    ...createDefaultExplorerFilterState(),
    categories: ["Food", "Travel"],
    transactionTypes: ["expense", "transfer"]
  });

  assert.deepEqual(params.getAll("category"), ["Food", "Travel"]);
  assert.deepEqual(params.getAll("type"), ["expense", "transfer"]);
});

test("toValidExplorerFilterState trims and deduplicates array filters", () => {
  const state = toValidExplorerFilterState({
    ...createDefaultExplorerFilterState(),
    categories: [" Food ", "Travel", "Food"],
    transactionTypes: ["expense", "transfer", "expense"]
  });

  assert.deepEqual(state.categories, ["Food", "Travel"]);
  assert.deepEqual(state.transactionTypes, ["expense", "transfer"]);
});
```

**Step 2: Run test to verify it fails**

Run: `env NODE_ENV=test pnpm --filter @minance/web exec tsx --test src/app/explorer/filters.test.ts`

Expected: FAIL because the state still exposes scalar `category` and `transactionType` fields.

**Step 3: Write minimal implementation**

Update `apps/web/src/app/explorer/filters.ts` so:
- `ExplorerFilterState` uses `categories: string[]` and `transactionTypes: ExplorerTransactionType[]`
- parsing reads `searchParams.getAll(...)`
- search-param builders append repeated keys
- validation trims, filters empties, deduplicates, and validates allowed transaction types
- analytics param helpers return arrays for category and transaction type

Implementation sketch:

```ts
function cleanStringList(values: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values.map((entry) => entry.trim()).filter(Boolean)) {
    if (!seen.has(value)) {
      seen.add(value);
      out.push(value);
    }
  }
  return out;
}
```

**Step 4: Run test to verify it passes**

Run: `env NODE_ENV=test pnpm --filter @minance/web exec tsx --test src/app/explorer/filters.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/app/explorer/filters.ts apps/web/src/app/explorer/filters.test.ts
git commit -m "refactor: make explorer filters array-native"
```

### Task 2: Update client API types and query building for repeated Explorer params and metadata

**Files:**
- Modify: `apps/web/src/lib/api/types.ts`
- Modify: `apps/web/src/lib/api/endpoints.ts`
- Modify: `apps/web/src/lib/api/endpoints.test.ts`

**Step 1: Write the failing test**

Add endpoint coverage like:

```ts
test("analyticsApi.explorer builds repeated category and type params", async () => {
  const paths: string[] = [];
  const request = async <T>(path: string) => {
    paths.push(path);
    return {} as T;
  };

  await analyticsApi.explorer(request, {
    category_view: "granular",
    category: ["Food", "Travel"],
    transaction_type: ["expense", "transfer"]
  });

  assert.equal(
    paths[0],
    "/v1/analytics/explorer?category_view=granular&category=Food&category=Travel&transaction_type=expense&transaction_type=transfer"
  );
});
```

Also add type assertions or a runtime fixture expectation that Explorer metadata includes `availableTags`.

**Step 2: Run test to verify it fails**

Run: `env NODE_ENV=test pnpm --filter @minance/web exec tsx --test src/lib/api/endpoints.test.ts`

Expected: FAIL because `buildQuery` overwrites repeated keys and Explorer params still expect scalars.

**Step 3: Write minimal implementation**

Update client API typing and query building so:
- `analyticsApi.explorer` accepts `category?: string[]` and `transaction_type?: Array<"expense" | "income" | "transfer">`
- `ExplorerAnalyticsResponse["meta"]` includes `availableTags: string[]`
- query building appends repeated keys for array values instead of calling `set`

Implementation sketch:

```ts
function appendQueryValue(query: URLSearchParams, key: string, value: QueryValue) {
  if (Array.isArray(value)) {
    for (const item of value) {
      if (item !== null && item !== undefined && item !== "") {
        query.append(key, String(item));
      }
    }
    return;
  }
  ...
}
```

**Step 4: Run test to verify it passes**

Run: `env NODE_ENV=test pnpm --filter @minance/web exec tsx --test src/lib/api/endpoints.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/lib/api/types.ts apps/web/src/lib/api/endpoints.ts apps/web/src/lib/api/endpoints.test.ts
git commit -m "refactor: support repeated explorer query params"
```

### Task 3: Make Explorer analytics and shared transaction filters honor array semantics

**Files:**
- Modify: `services/api/src/server.ts`
- Modify: `services/api/src/analytics.ts`
- Modify: `services/api/src/transactionFilters.ts`
- Modify: `services/api/test/api-contract.test.ts`

**Step 1: Write the failing test**

Add API contract coverage like:

```ts
test("GET /v1/analytics/explorer applies OR within a filter and AND across filters", async () => {
  const response = await requestJson(
    "/v1/analytics/explorer?range=all&category=Food&category=Travel&transaction_type=expense&transaction_type=transfer"
  );

  assert.equal(response.status, 200);
  assert.equal(response.payload?.meta?.categoryView, "granular");
});
```

Add a focused lower-level assertion for shared transaction filters:

```ts
test("applySharedTransactionFilters accepts multiple transaction types", () => {
  const result = applySharedTransactionFilters(seedTransactions, {
    transaction_type: ["expense", "transfer"]
  });

  assert.equal(result.every((entry) => ["expense", "transfer"].includes(resolveType(entry))), true);
});
```

Use fixture rows that prove:
- category array is `OR`
- transaction-type array is `OR`
- combining both is `AND`

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @minance/api test -- --test-name-pattern "OR within a filter and AND across filters|multiple transaction types"`

Expected: FAIL because the server still reads scalars with `searchParams.get(...)` and the backend only supports one transaction type and one category.

**Step 3: Write minimal implementation**

Update the backend so:
- `/v1/analytics/explorer` reads `searchParams.getAll("category")` and `searchParams.getAll("transaction_type")`
- `filterUserTransactions` checks category membership against the selected category list
- `applySharedTransactionFilters` normalizes `transaction_type` as an allowed set
- empty arrays mean no constraint

Implementation sketch:

```ts
function normalizeTransactionTypeFilterList(rawValue: string | string[] | null | undefined) {
  const values = Array.isArray(rawValue) ? rawValue : rawValue ? [rawValue] : [];
  ...
  return allowed;
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @minance/api test -- --test-name-pattern "OR within a filter and AND across filters|multiple transaction types"`

Expected: PASS

**Step 5: Commit**

```bash
git add services/api/src/server.ts services/api/src/analytics.ts services/api/src/transactionFilters.ts services/api/test/api-contract.test.ts
git commit -m "feat: add explorer multi-select analytics filters"
```

### Task 4: Add Explorer metadata for amount bounds and tag suggestions

**Files:**
- Modify: `services/api/src/analytics.ts`
- Modify: `apps/web/src/lib/api/types.ts`
- Modify: `services/api/test/api-contract.test.ts`

**Step 1: Write the failing test**

Add API contract coverage like:

```ts
test("GET /v1/analytics/explorer returns amount bounds and available tags in meta", async () => {
  const response = await requestJson("/v1/analytics/explorer?range=all");

  assert.equal(response.status, 200);
  assert.equal(typeof response.payload?.meta?.amountBounds?.min, "number");
  assert.equal(typeof response.payload?.meta?.amountBounds?.max, "number");
  assert.equal(Array.isArray(response.payload?.meta?.availableTags), true);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @minance/api test -- --test-name-pattern "amount bounds and available tags in meta"`

Expected: FAIL because Explorer metadata currently does not include either field.

**Step 3: Write minimal implementation**

Extend `buildAnalyticsMeta` or the Explorer response assembly to include:
- `amountBounds` calculated from the filtered Explorer transaction set
- `availableTags` as a normalized, sorted, deduplicated list from the same filtered set

Implementation sketch:

```ts
const availableTags = Array.from(
  new Set(currentTransactions.flatMap((entry) => normalizeExistingTags(entry.tags)))
).sort((left, right) => left.localeCompare(right));
```

Keep the metadata generated from the same filtered transaction set used for Explorer results so the slider and suggestions match the active workspace context.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @minance/api test -- --test-name-pattern "amount bounds and available tags in meta"`

Expected: PASS

**Step 5: Commit**

```bash
git add services/api/src/analytics.ts apps/web/src/lib/api/types.ts services/api/test/api-contract.test.ts
git commit -m "feat: add explorer filter metadata"
```

### Task 5: Extract the transactions amount bar into a reusable TSX control

**Files:**
- Create: `apps/web/src/components/filters/AmountRangeControl.tsx`
- Modify: `apps/web/src/app/transactions/page.tsx`
- Modify: `e2e/specs/explorer-upgrade.spec.ts`

**Step 1: Write the failing test**

Add end-to-end coverage that will eventually assert the Explorer modal shows the amount bar UI:

```ts
test("explorer advanced filters use the shared amount bar control", async ({ page }) => {
  await page.goto("/explorer");
  await page.getByTestId("explorer-open-advanced-filters").click();

  await expect(page.getByTestId("amount-range-control")).toBeVisible();
  await expect(page.getByTestId("explorer-advanced-filters")).toContainText("Amount bar");
});
```

Before wiring Explorer, also refactor Transactions to use the extracted component without changing behavior.

**Step 2: Run test to verify it fails**

Run: `env NODE_ENV=test pnpm exec playwright test e2e/specs/explorer-upgrade.spec.ts --grep "shared amount bar control"`

Expected: FAIL because Explorer does not render the control and Transactions still keeps the slider inline.

**Step 3: Write minimal implementation**

Create `AmountRangeControl.tsx` that owns:
- the dual sliders
- highlighted selected track
- the synced min/max text inputs
- accessible labels and `data-testid`s

Then replace the inline amount-bar block in `apps/web/src/app/transactions/page.tsx` with the shared component, preserving current transactions behavior.

Component shape:

```tsx
<AmountRangeControl
  minBound={amountBoundMin}
  maxBound={amountBoundMax}
  minValue={filters.minAmount}
  maxValue={filters.maxAmount}
  onChange={({ minAmount, maxAmount }) => updateFilters(...)}
  testIdPrefix="txn"
/>
```

**Step 4: Run test to verify it passes**

Run: `env NODE_ENV=test pnpm exec playwright test e2e/specs/explorer-upgrade.spec.ts --grep "shared amount bar control"`

Expected: still FAIL for Explorer-specific assertions but the extracted component is now ready and Transactions behavior is preserved for later steps. Also run a targeted Transactions verification:

Run: `env NODE_ENV=test pnpm exec playwright test e2e/specs/explorer-upgrade.spec.ts --grep "Transactions"`

If there is no existing targeted transactions spec for the amount bar, add one in a later task instead of over-expanding this step.

**Step 5: Commit**

```bash
git add apps/web/src/components/filters/AmountRangeControl.tsx apps/web/src/app/transactions/page.tsx e2e/specs/explorer-upgrade.spec.ts
git commit -m "refactor: extract shared amount range control"
```

### Task 6: Rebuild Explorer advanced filters around multi-select controls, shared amount bar, and tag autosuggest

**Files:**
- Modify: `apps/web/src/app/explorer/components/ExplorerAdvancedFilters.tsx`
- Modify: `apps/web/src/app/explorer/page.tsx`
- Modify: `apps/web/src/app/explorer/components/CategoryPerspective.tsx`
- Modify: `e2e/specs/explorer-upgrade.spec.ts`

**Step 1: Write the failing test**

Extend Playwright coverage with assertions like:

```ts
test("explorer advanced filters support category and type multiselect plus tag suggestions", async ({ page }) => {
  await page.goto("/explorer");
  await page.getByTestId("explorer-open-advanced-filters").click();

  await page.getByTestId("explorer-category-multiselect-trigger").click();
  await page.getByRole("option", { name: /Food/i }).click();
  await page.getByRole("option", { name: /Travel/i }).click();

  await page.getByTestId("explorer-type-multiselect-trigger").click();
  await page.getByRole("option", { name: /Expense/i }).click();
  await page.getByRole("option", { name: /Transfer/i }).click();

  await page.getByTestId("explorer-tag-filter").fill("mon");
  await expect(page.getByTestId("explorer-tag-suggestions")).toContainText("monthly");
});
```

Also add an assertion that the category perspective detail panel only appears when exactly one category is active.

**Step 2: Run test to verify it fails**

Run: `env NODE_ENV=test pnpm exec playwright test e2e/specs/explorer-upgrade.spec.ts --grep "support category and type multiselect plus tag suggestions"`

Expected: FAIL because the modal still renders single-value controls and no suggestion list exists.

**Step 3: Write minimal implementation**

Update `ExplorerAdvancedFilters.tsx` so:
- draft state uses `categories` and `transactionTypes`
- custom multi-select popovers render checklist options
- the shared `AmountRangeControl` replaces the old min/max rows
- the tag input uses `list` or an explicit suggestion panel backed by `explorer.meta.availableTags`

Update `page.tsx` so:
- active filter chips summarize grouped values
- drill-down helpers only pass category/type when exactly one is selected
- category clicks replace `categories` with a one-item array

Update `CategoryPerspective.tsx` so multi-category selection suppresses the single-category detail panel.

**Step 4: Run test to verify it passes**

Run: `env NODE_ENV=test pnpm exec playwright test e2e/specs/explorer-upgrade.spec.ts --grep "support category and type multiselect plus tag suggestions"`

Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/app/explorer/components/ExplorerAdvancedFilters.tsx apps/web/src/app/explorer/page.tsx apps/web/src/app/explorer/components/CategoryPerspective.tsx e2e/specs/explorer-upgrade.spec.ts
git commit -m "feat: add explorer advanced filter multiselect controls"
```

### Task 7: Verify the full Explorer filter flow end to end

**Files:**
- Modify: `e2e/specs/explorer-upgrade.spec.ts`
- Modify: `apps/web/src/app/explorer/filters.test.ts`
- Modify: `services/api/test/api-contract.test.ts`

**Step 1: Write the failing test**

Add final cross-layer coverage for:
- repeated query-param round-tripping
- grouped active-filter chips
- `OR` within a filter and `AND` across filters
- amount bar application
- tag suggestion selection

Example end-to-end scenario:

```ts
test("explorer applies OR within a filter and AND across filters", async ({ page }) => {
  await page.goto("/explorer?category=Food&category=Travel&type=expense&type=transfer");

  await expect(page.getByTestId("explorer-active-filters")).toContainText("Categories: Food, Travel");
  await expect(page.getByTestId("explorer-active-filters")).toContainText("Types: Expense, Transfer");
});
```

**Step 2: Run test to verify it fails**

Run: `env NODE_ENV=test pnpm exec playwright test e2e/specs/explorer-upgrade.spec.ts --grep "OR within a filter and AND across filters"`

Expected: FAIL until the last gaps in chip rendering or filter application are closed.

**Step 3: Write minimal implementation**

Patch any remaining issues exposed by the full-flow test:
- chip labels
- URL synchronization
- modal apply/reset edge cases
- tag suggestion selection wiring
- amount bar state synchronization

Do not add new feature scope in this step; only close the gaps needed to satisfy the approved design.

**Step 4: Run test to verify it passes**

Run:

```bash
env NODE_ENV=test pnpm --filter @minance/web exec tsx --test src/app/explorer/filters.test.ts
pnpm --filter @minance/api test -- --test-name-pattern "OR within a filter and AND across filters|amount bounds and available tags in meta"
env NODE_ENV=test pnpm exec playwright test e2e/specs/explorer-upgrade.spec.ts
```

Expected: PASS across all three layers

**Step 5: Commit**

```bash
git add e2e/specs/explorer-upgrade.spec.ts apps/web/src/app/explorer/filters.test.ts services/api/test/api-contract.test.ts
git commit -m "test: cover explorer advanced filter refactor"
```
