# Dashboard And Explorer Render Optimization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove repeated dashboard and explorer render derivation work while preserving existing UI behavior.

**Architecture:** Move render math into small pure presentation helpers. The dashboard page will consume a dedicated trend-bar helper, and the explorer summary band will consume precomputed sparkline series from the existing presentation layer.

**Tech Stack:** Next.js app router, React 19, TypeScript 5, Node test runner via `tsx --test`

---

### Task 1: Dashboard Trend Helper

**Files:**
- Create: `apps/web/src/app/dashboardPresentation.ts`
- Test: `apps/web/src/app/dashboardPresentation.test.ts`

**Step 1: Write the failing test**

Add a test that calls a new `buildDashboardTrendBars` helper and asserts:
- `90d` returns the last 3 trend entries
- `all` caps at 24 entries
- `barHeight` is normalized against a single computed `maxAbsNet`
- `isPositive` matches the sign of `net`

**Step 2: Run test to verify it fails**

Run: `pnpm --filter web test -- src/app/dashboardPresentation.test.ts`

Expected: FAIL because `dashboardPresentation.ts` or `buildDashboardTrendBars` does not exist yet.

**Step 3: Write minimal implementation**

Create `buildDashboardTrendBars` in `apps/web/src/app/dashboardPresentation.ts` with:
- a local `rangeToCount` map
- a single `visibleTrend` slice
- one `maxAbsNet` calculation
- one map over `visibleTrend`

**Step 4: Run test to verify it passes**

Run: `pnpm --filter web test -- src/app/dashboardPresentation.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/app/dashboardPresentation.ts apps/web/src/app/dashboardPresentation.test.ts
git commit -m "test: add dashboard trend presentation helper"
```

### Task 2: Dashboard Page Integration Regression

**Files:**
- Modify: `apps/web/src/app/page.tsx`
- Create: `apps/web/src/app/dashboard-performance.test.ts`

**Step 1: Write the failing test**

Add a source-level test that asserts:
- `page.tsx` imports `buildDashboardTrendBars`
- `page.tsx` calls `buildDashboardTrendBars`
- `page.tsx` no longer contains the nested `Math.max(1, ...trend.map(...))` inside the trend-bar map path

**Step 2: Run test to verify it fails**

Run: `pnpm --filter web test -- src/app/dashboard-performance.test.ts`

Expected: FAIL because `page.tsx` still contains the inline derivation.

**Step 3: Write minimal implementation**

Update `page.tsx` to replace the current `useMemo` body with a call to `buildDashboardTrendBars`.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter web test -- src/app/dashboard-performance.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/app/page.tsx apps/web/src/app/dashboard-performance.test.ts
git commit -m "refactor: hoist dashboard trend derivation"
```

### Task 3: Explorer Summary Sparkline Helper

**Files:**
- Modify: `apps/web/src/app/explorer/presentation.ts`
- Modify: `apps/web/src/app/explorer/presentation.test.ts`
- Modify: `apps/web/src/app/explorer/components/ExplorerSummaryBand.tsx`

**Step 1: Write the failing test**

Add a test for a new helper such as `buildSummarySparklineSeries` that asserts it returns:
- `spend`, `income`, and `net` arrays
- values in source order
- empty arrays when no sparkline points exist

**Step 2: Run test to verify it fails**

Run: `pnpm --filter web test -- src/app/explorer/presentation.test.ts`

Expected: FAIL because the helper does not exist yet.

**Step 3: Write minimal implementation**

Add the helper to `presentation.ts` and update `ExplorerSummaryBand.tsx` to:
- compute the series object once
- read `sparklineData` from the precomputed series inside the item loop

**Step 4: Run test to verify it passes**

Run: `pnpm --filter web test -- src/app/explorer/presentation.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/app/explorer/presentation.ts apps/web/src/app/explorer/presentation.test.ts apps/web/src/app/explorer/components/ExplorerSummaryBand.tsx
git commit -m "refactor: precompute explorer sparkline series"
```

### Task 4: Full Verification

**Files:**
- Verify only

**Step 1: Run focused frontend tests**

Run:

```bash
pnpm --filter web test -- src/app/dashboardPresentation.test.ts src/app/dashboard-performance.test.ts src/app/explorer/presentation.test.ts
```

Expected: PASS

**Step 2: Run repo checks**

Run: `just check`

Expected: PASS

**Step 3: Run production build**

Run: `just build-web`

Expected: PASS

**Step 4: Commit**

```bash
git add .
git commit -m "perf: optimize dashboard and explorer render derivations"
```
