# Explorer Review Filter Removal Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove review-status filtering from Explorer so the page no longer exposes, persists, or restores a `review` filter.

**Architecture:** Keep the change local to the Explorer web app. Remove `review` from the Explorer filter state and every UI surface that references it, while continuing to ignore legacy `review` values that may still appear in old saved views or bookmarked Explorer URLs.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS, Node `node:test` via `tsx`, Playwright

---

### Task 1: Remove review from Explorer filter state while keeping legacy inputs harmless

**Files:**
- Modify: `apps/web/src/app/explorer/filters.ts`
- Modify: `apps/web/src/app/explorer/filters.test.ts`

**Step 1: Write the failing test**

Add tests like:

```ts
test("parseExplorerFilterState ignores legacy review search params", () => {
  const state = parseExplorerFilterState(
    new URLSearchParams("range=30d&review=reviewed&category=Groceries")
  );

  assert.equal(state.range, "30d");
  assert.equal(state.category, "Groceries");
  assert.equal("review" in state, false);
});

test("savedExplorerFiltersToState ignores legacy review values", () => {
  const state = savedExplorerFiltersToState({
    review: "needs_review",
    account: "Checking"
  });

  assert.equal(state.account, "Checking");
  assert.equal("review" in state, false);
});
```

**Step 2: Run test to verify it fails**

Run: `env NODE_ENV=test pnpm --filter @minance/web exec tsx --test src/app/explorer/filters.test.ts`

Expected: FAIL because Explorer filter state still includes `review`.

**Step 3: Write minimal implementation**

Remove the `ExplorerReviewFilter` type, delete `review` from `ExplorerFilterState`, defaults, validation, parsing, URL serialization, and saved-view restoration.

```ts
export interface ExplorerFilterState {
  perspective: ExplorerPerspective;
  compare: ExplorerCompareMode;
  query: string;
  merchant: string;
  category: string;
  account: string;
  categoryView: ExplorerCategoryView;
  range: string;
  start: string;
  end: string;
  transactionType: ExplorerTypeFilter;
  direction: ExplorerDirectionFilter;
  tag: string;
  minAmount: string;
  maxAmount: string;
}
```

Legacy `review` values should simply be ignored because `savedExplorerFiltersToState()` and `parseExplorerFilterState()` stop reading them.

**Step 4: Run test to verify it passes**

Run: `env NODE_ENV=test pnpm --filter @minance/web exec tsx --test src/app/explorer/filters.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/app/explorer/filters.ts apps/web/src/app/explorer/filters.test.ts
git commit -m "refactor: remove explorer review filter state"
```

### Task 2: Remove review-status Explorer UI and regression coverage

**Files:**
- Modify: `apps/web/src/app/explorer/components/ExplorerAdvancedFilters.tsx`
- Modify: `apps/web/src/app/explorer/components/FilterSidebar.tsx`
- Modify: `apps/web/src/app/explorer/page.tsx`
- Modify: `e2e/specs/explorer-upgrade.spec.ts`

**Step 1: Write the failing test**

Update the existing Explorer Playwright test to assert the review control is absent:

```ts
test("explorer advanced filters omit review status controls", async ({ page }) => {
  await loginWithSeedAccount(page);
  await uploadAndCommitFixtureCsv(page);
  await gotoView(page, "explorer");

  await page.getByTestId("explorer-open-advanced-filters").click();
  await expect(page.getByTestId("explorer-advanced-filters")).toBeVisible();
  await expect(page.getByText("Review status")).toHaveCount(0);
});
```

If useful, also assert the active filter area does not contain `Reviewed` or `Needs Review` after loading Explorer.

**Step 2: Run test to verify it fails**

Run: `env NODE_ENV=test pnpm exec playwright test e2e/specs/explorer-upgrade.spec.ts --grep "omit review status controls"`

Expected: FAIL because Explorer still renders the review select.

**Step 3: Write minimal implementation**

Delete the review select and related draft/reset logic from `ExplorerAdvancedFilters.tsx`, remove review handling from `FilterSidebar.tsx`, and remove the review active-chip block from `page.tsx`.

```tsx
type AdvancedFilterDraft = Pick<
  ExplorerFilterState,
  "merchant" | "category" | "transactionType" | "direction" | "tag" | "minAmount" | "maxAmount" | "categoryView"
>;
```

Also remove review from the active-filter count and clear-all reset object in the sidebar component.

**Step 4: Run test to verify it passes**

Run: `env NODE_ENV=test pnpm exec playwright test e2e/specs/explorer-upgrade.spec.ts --grep "omit review status controls"`

Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/app/explorer/components/ExplorerAdvancedFilters.tsx apps/web/src/app/explorer/components/FilterSidebar.tsx apps/web/src/app/explorer/page.tsx e2e/specs/explorer-upgrade.spec.ts
git commit -m "refactor: remove explorer review filter ui"
```

### Task 3: Run focused regression checks for Explorer filters

**Files:**
- No source changes required unless a regression appears

**Step 1: Run Explorer unit tests**

Run: `env NODE_ENV=test pnpm --filter @minance/web exec tsx --test src/app/explorer/filters.test.ts`

Expected: PASS

**Step 2: Run Explorer end-to-end coverage**

Run: `env NODE_ENV=test pnpm exec playwright test e2e/specs/explorer-upgrade.spec.ts`

Expected: PASS

**Step 3: Review changed files**

Run: `git diff -- apps/web/src/app/explorer/filters.ts apps/web/src/app/explorer/filters.test.ts apps/web/src/app/explorer/components/ExplorerAdvancedFilters.tsx apps/web/src/app/explorer/components/FilterSidebar.tsx apps/web/src/app/explorer/page.tsx e2e/specs/explorer-upgrade.spec.ts`

Expected: Diff shows only Explorer review-filter removal and related test updates.

**Step 4: Commit**

```bash
git add apps/web/src/app/explorer/filters.ts apps/web/src/app/explorer/filters.test.ts apps/web/src/app/explorer/components/ExplorerAdvancedFilters.tsx apps/web/src/app/explorer/components/FilterSidebar.tsx apps/web/src/app/explorer/page.tsx e2e/specs/explorer-upgrade.spec.ts
git commit -m "test: verify explorer review filter removal"
```
