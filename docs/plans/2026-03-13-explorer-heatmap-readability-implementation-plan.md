# Explorer Heatmap Readability Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the Explorer spending heatmap easier to read by replacing weekday index text with weekday headers, a legend, and color-only intensity cells.

**Architecture:** Keep the change local to the `SpendingHeatmap` component and existing Explorer Playwright coverage. Reuse the current heatmap data contract, derive a simple stepped palette from the current filtered data, and expose a few test ids for the new legend/header elements so the UI can be verified without brittle selectors.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS, Playwright

---

### Task 1: Add failing Explorer coverage for readable heatmap labeling

**Files:**
- Modify: `e2e/specs/explorer-upgrade.spec.ts`
- Modify: `e2e/specs/helpers.ts`

**Step 1: Write the failing test**

Add a test like:

```ts
test("spending heatmap uses weekday headers and a legend instead of weekday indexes", async ({ page }) => {
  await loginWithSeedAccount(page);
  await uploadAndCommitFixtureCsv(page);
  await gotoView(page, "explorer");

  await expect(page.getByTestId("analytics-heatmap-weekdays")).toContainText("Sun");
  await expect(page.getByTestId("analytics-heatmap-weekdays")).toContainText("Sat");
  await expect(page.getByTestId("analytics-heatmap-legend")).toContainText("Low");
  await expect(page.getByTestId("analytics-heatmap-legend")).toContainText("High");
  await expect(analyticsHeatmapCells(page).first()).toHaveText("");
});
```

**Step 2: Run test to verify it fails**

Run: `env CI=1 NODE_ENV=test pnpm exec playwright test e2e/specs/explorer-upgrade.spec.ts --grep "weekday headers and a legend"`

Expected: FAIL because the heatmap has no legend/header test ids and the cells still render weekday indexes.

**Step 3: Write minimal implementation**

Update the helper import only if needed for the new test.

**Step 4: Run test to verify it still fails for the right reason**

Run: `env CI=1 NODE_ENV=test pnpm exec playwright test e2e/specs/explorer-upgrade.spec.ts --grep "weekday headers and a legend"`

Expected: FAIL with missing weekday header / legend elements or non-empty cell text.

### Task 2: Rebuild the heatmap as a color-first card

**Files:**
- Modify: `apps/web/src/app/explorer/components/SpendingHeatmap.tsx`

**Step 1: Implement the minimal UI**

Add:
- weekday header row (`Sun` through `Sat`)
- legend (`Low` to `High`)
- stepped palette helper for no-spend, light, medium, high cells
- clearer tooltip text
- empty inner cell content

**Step 2: Run the focused Explorer test**

Run: `env CI=1 NODE_ENV=test pnpm exec playwright test e2e/specs/explorer-upgrade.spec.ts --grep "weekday headers and a legend"`

Expected: PASS

**Step 3: Commit**

```bash
git add apps/web/src/app/explorer/components/SpendingHeatmap.tsx e2e/specs/explorer-upgrade.spec.ts e2e/specs/helpers.ts
git commit -m "feat: improve explorer heatmap readability"
```

### Task 3: Run focused Explorer regression checks

**Files:**
- No source changes required unless a regression appears

**Step 1: Run Explorer upgrade spec**

Run: `env CI=1 NODE_ENV=test pnpm exec playwright test e2e/specs/explorer-upgrade.spec.ts`

Expected: PASS

**Step 2: Review diff**

Run: `git diff -- apps/web/src/app/explorer/components/SpendingHeatmap.tsx e2e/specs/explorer-upgrade.spec.ts e2e/specs/helpers.ts`

Expected: Diff is limited to heatmap readability changes and related test coverage.
