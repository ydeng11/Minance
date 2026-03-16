# Explorer Heatmap Summary And Category Matrix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace Explorer Overview's unstable week-based heatmap with a fixed weekday spend summary and add a filtered top-7 category-by-weekday heatmap to the Category perspective.

**Architecture:** Keep the existing generic `heatmap` analytics field in place for now, but add two new Explorer-specific analytics shapes: `weekdaySummary` and `categoryWeekdayHeatmap`. Wire Overview to a new fixed-footprint summary component, wire Category to a new comparative matrix component, and change Category workspace category interactions from immediate filtering to local inspection plus an explicit filter action.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS, Node test runner via `tsx --test`, Playwright

---

### Task 1: Extend Explorer analytics with weekday summary and category weekday matrix

**Files:**
- Modify: `services/api/src/analytics.ts`
- Modify: `services/api/test/analytics.test.ts`
- Modify: `apps/web/src/lib/api/types.ts`

**Step 1: Write the failing backend tests**

Add tests to `services/api/test/analytics.test.ts` that prove:
- `getExplorerAnalytics(...).weekdaySummary.items` returns seven weekday buckets in `0-6` order with zero-filled missing days
- `getExplorerAnalytics(...).categoryWeekdayHeatmap.items` returns at most seven rows ranked by filtered spend
- the category matrix honors active filters such as `account`, `merchant`, and `category_view`

Use a fixture shape like:

```ts
const analytics = getExplorerAnalytics("user_1", {
  start: "2026-01-01",
  end: "2026-01-31",
  account: "checking",
  category_view: "granular"
});

assert.equal(analytics.weekdaySummary.items.length, 7);
assert.deepEqual(
  analytics.weekdaySummary.items.map((entry) => entry.weekday),
  [0, 1, 2, 3, 4, 5, 6]
);
assert.equal(analytics.categoryWeekdayHeatmap.items.length, 2);
assert.equal(analytics.categoryWeekdayHeatmap.items[0]?.category, "Groceries");
assert.equal(analytics.categoryWeekdayHeatmap.items[0]?.cells.length, 7);
```

**Step 2: Run the backend test file to verify it fails**

Run: `env NODE_ENV=test tsx --test services/api/test/analytics.test.ts`

Expected: FAIL with missing `weekdaySummary` and `categoryWeekdayHeatmap` fields on `ExplorerAnalyticsResponse`.

**Step 3: Implement minimal analytics helpers**

In `services/api/src/analytics.ts`, add helper functions that derive both datasets from filtered outflow transactions:

```ts
function buildExplorerWeekdaySummary(txns) {
  const buckets = Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    amount: 0,
    count: 0
  }));

  for (const txn of txns) {
    const date = new Date(`${txn.transaction_date}T12:00:00Z`);
    if (Number.isNaN(date.getTime())) continue;
    const weekday = date.getUTCDay();
    buckets[weekday].amount += toAmount(txn);
    buckets[weekday].count += 1;
  }

  return buckets.map((entry) => ({
    ...entry,
    amount: round2(entry.amount)
  }));
}

function buildExplorerCategoryWeekdayHeatmap(txns, resolveCategory, categoryView) {
  // group filtered outflow txns by category, rank by total spend, keep top 7,
  // then expand each row to seven weekday cells with zero-filled missing days
}
```

Wire the new helpers into `getExplorerAnalytics(...)` while leaving the existing `heatmap` field intact for now.

**Step 4: Update shared API types**

Extend `apps/web/src/lib/api/types.ts` with:

```ts
export interface ExplorerWeekdaySummaryItem {
  weekday: number;
  amount: number;
  count: number;
}

export interface ExplorerCategoryWeekdayHeatmapCell {
  weekday: number;
  amount: number;
  count: number;
}

export interface ExplorerCategoryWeekdayHeatmapRow {
  category: string;
  emoji?: string;
  coarseKey?: string;
  totalSpend: number;
  transactionCount: number;
  cells: ExplorerCategoryWeekdayHeatmapCell[];
}
```

Then add:

```ts
weekdaySummary: {
  items: ExplorerWeekdaySummaryItem[];
};
categoryWeekdayHeatmap: {
  items: ExplorerCategoryWeekdayHeatmapRow[];
};
```

to `ExplorerAnalyticsResponse`.

**Step 5: Run the backend test file again**

Run: `env NODE_ENV=test tsx --test services/api/test/analytics.test.ts`

Expected: PASS

**Step 6: Commit**

```bash
git add services/api/src/analytics.ts services/api/test/analytics.test.ts apps/web/src/lib/api/types.ts
git commit -m "feat: add explorer weekday summary analytics"
```

### Task 2: Replace Overview's week heatmap with a fixed weekday spend summary

**Files:**
- Create: `apps/web/src/app/explorer/components/WeekdaySpendSummary.tsx`
- Modify: `apps/web/src/app/explorer/components/OverviewPerspective.tsx`
- Modify: `apps/web/src/app/explorer/page.tsx`
- Modify: `e2e/specs/explorer-upgrade.spec.ts`
- Modify: `e2e/specs/helpers.ts`

**Step 1: Write the failing Explorer end-to-end test**

Add a Playwright test to `e2e/specs/explorer-upgrade.spec.ts` like:

```ts
test("overview uses a fixed weekday spend summary across date ranges", async ({ page }) => {
  await loginWithSeedAccount(page);
  await uploadAndCommitFixtureCsv(page);

  await page.goto("/explorer?range=365d");

  await expect(page.getByTestId("explorer-weekday-summary")).toBeVisible();
  await expect(page.getByTestId("explorer-weekday-summary")).toContainText("Sun");
  await expect(page.getByTestId("explorer-weekday-summary")).toContainText("Sat");
  await expect(explorerWeekdaySummaryCells(page)).toHaveCount(7);
  await expect(page.getByTestId("analytics-heatmap")).toHaveCount(0);
});
```

Add a helper such as:

```ts
export function explorerWeekdaySummaryCells(page) {
  return page.locator('[data-testid="explorer-weekday-summary"] > button');
}
```

**Step 2: Run the focused Playwright test to verify it fails**

Run: `env CI=1 NODE_ENV=test pnpm exec playwright test e2e/specs/explorer-upgrade.spec.ts --grep "fixed weekday spend summary"`

Expected: FAIL because the new summary card does not exist yet and Overview still renders the old heatmap card.

**Step 3: Implement the new Overview component**

Create `WeekdaySpendSummary.tsx` with a fixed seven-cell layout that reads from `weekdaySummary` data:

```tsx
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function WeekdaySpendSummary({ items, loading }: WeekdaySpendSummaryProps) {
  const maxAmount = Math.max(0, ...items.map((entry) => entry.amount));

  return (
    <section data-testid="explorer-weekday-summary">
      {items.map((entry) => (
        <button
          key={entry.weekday}
          type="button"
          aria-label={`${WEEKDAY_LABELS[entry.weekday]} ${money(entry.amount)}`}
        >
          <span>{WEEKDAY_LABELS[entry.weekday]}</span>
          <span>{money(entry.amount)}</span>
        </button>
      ))}
    </section>
  );
}
```

Wire `OverviewPerspective` to consume `weekdaySummary` instead of `heatmap`, and update `page.tsx` to pass `explorer?.weekdaySummary.items || []`.

**Step 4: Run the focused Playwright test again**

Run: `env CI=1 NODE_ENV=test pnpm exec playwright test e2e/specs/explorer-upgrade.spec.ts --grep "fixed weekday spend summary"`

Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/app/explorer/components/WeekdaySpendSummary.tsx apps/web/src/app/explorer/components/OverviewPerspective.tsx apps/web/src/app/explorer/page.tsx e2e/specs/explorer-upgrade.spec.ts e2e/specs/helpers.ts
git commit -m "feat: replace explorer overview heatmap with weekday summary"
```

### Task 3: Add the Category weekday matrix and inspection-first category interactions

**Files:**
- Create: `apps/web/src/app/explorer/components/CategoryWeekdayHeatmap.tsx`
- Modify: `apps/web/src/app/explorer/components/CategoryPerspective.tsx`
- Modify: `apps/web/src/app/explorer/page.tsx`
- Modify: `e2e/specs/explorer-upgrade.spec.ts`
- Modify: `e2e/specs/helpers.ts`

**Step 1: Write the failing Category perspective end-to-end test**

Add a Playwright test like:

```ts
test("category perspective compares filtered top categories by weekday before applying a filter", async ({ page }) => {
  await loginWithSeedAccount(page);
  await uploadAndCommitFixtureCsv(page);
  await page.goto("/explorer?perspective=category&range=365d");

  await expect(page.getByTestId("explorer-category-weekday-heatmap")).toBeVisible();
  await expect(explorerCategoryHeatmapRows(page)).toHaveCount(7);

  await page.getByTestId("explorer-category-lens").getByRole("button").first().click();
  await expect(page).toHaveURL(/perspective=category/);
  await expect(page).not.toHaveURL(/category=/);

  await page.getByTestId("explorer-category-apply-filter").click();
  await expect(page).toHaveURL(/category=/);
});
```

Add a helper such as:

```ts
export function explorerCategoryHeatmapRows(page) {
  return page.locator('[data-testid="explorer-category-weekday-heatmap-row"]');
}
```

**Step 2: Run the focused Playwright test to verify it fails**

Run: `env CI=1 NODE_ENV=test pnpm exec playwright test e2e/specs/explorer-upgrade.spec.ts --grep "compares filtered top categories by weekday"`

Expected: FAIL because the matrix card and explicit filter action do not exist yet, and category lens clicks currently apply the global filter immediately.

**Step 3: Implement the matrix and local inspection flow**

In `CategoryPerspective.tsx`:
- add local `inspectedCategory` state
- seed it from `selectedCategory` when a real global category filter exists
- otherwise seed it from the first available matrix row or category card
- change `Category Lens` tile clicks to update local inspection instead of calling `onCategoryClick(...)`
- render a new explicit filter button that calls `onCategoryClick(inspectedCategory)`

Use state flow like:

```tsx
const [inspectedCategory, setInspectedCategory] = useState(selectedCategory || "");

useEffect(() => {
  if (selectedCategory) {
    setInspectedCategory(selectedCategory);
    return;
  }

  const firstCategory = categoryWeekdayHeatmap[0]?.category || categories[0]?.category || "";
  setInspectedCategory((current) => current || firstCategory);
}, [selectedCategory, categoryWeekdayHeatmap, categories]);
```

Create `CategoryWeekdayHeatmap.tsx` to render:
- one row per `categoryWeekdayHeatmap` item
- seven weekday columns
- row-local color normalization
- a selected-row style for `inspectedCategory`
- `data-testid="explorer-category-weekday-heatmap"` on the card container
- `data-testid="explorer-category-weekday-heatmap-row"` on each row

Update `page.tsx` to pass `explorer?.categoryWeekdayHeatmap.items || []` into `CategoryPerspective`.

**Step 4: Run the focused Playwright test again**

Run: `env CI=1 NODE_ENV=test pnpm exec playwright test e2e/specs/explorer-upgrade.spec.ts --grep "compares filtered top categories by weekday"`

Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/app/explorer/components/CategoryWeekdayHeatmap.tsx apps/web/src/app/explorer/components/CategoryPerspective.tsx apps/web/src/app/explorer/page.tsx e2e/specs/explorer-upgrade.spec.ts e2e/specs/helpers.ts
git commit -m "feat: add explorer category weekday heatmap"
```

### Task 4: Run focused regressions and review the diff

**Files:**
- No source changes required unless a regression appears

**Step 1: Run backend analytics coverage**

Run: `env NODE_ENV=test tsx --test services/api/test/analytics.test.ts`

Expected: PASS

**Step 2: Run frontend unit coverage**

Run: `pnpm --filter @minance/web test`

Expected: PASS

**Step 3: Run Explorer end-to-end coverage**

Run: `env CI=1 NODE_ENV=test pnpm exec playwright test e2e/specs/explorer-upgrade.spec.ts`

Expected: PASS

**Step 4: Review the final diff**

Run: `git diff -- apps/web/src/app/explorer/page.tsx apps/web/src/app/explorer/components/OverviewPerspective.tsx apps/web/src/app/explorer/components/CategoryPerspective.tsx apps/web/src/app/explorer/components/WeekdaySpendSummary.tsx apps/web/src/app/explorer/components/CategoryWeekdayHeatmap.tsx apps/web/src/lib/api/types.ts services/api/src/analytics.ts services/api/test/analytics.test.ts e2e/specs/explorer-upgrade.spec.ts e2e/specs/helpers.ts docs/plans/2026-03-15-explorer-heatmap-summary-and-category-matrix-design.md docs/plans/2026-03-15-explorer-heatmap-summary-and-category-matrix-implementation-plan.md`

Expected: Diff is limited to the approved Overview summary swap, the new Category weekday matrix, supporting analytics fields, and related tests/docs.
