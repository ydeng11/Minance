# Explorer Summary Clarity Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Clarify Explorer summary cards and trend labeling so the selected range, recent seven-day microtrend, and comparison context are visually distinct without redundant panels.

**Architecture:** Keep the change local to the Explorer web app. Rework summary-card presentation helpers and layout so the cards own both short-term recency context and comparison context, remove the redundant overview comparison panel, and pass the active range label into the main trend chart so it renders the full filtered series with truthful copy.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS, Node `node:test` via `tsx`, Playwright

---

### Task 1: Refine Explorer summary presentation helpers for explicit context labels and value sizing

**Files:**
- Modify: `apps/web/src/app/explorer/presentation.ts`
- Modify: `apps/web/src/app/explorer/presentation.test.ts`

**Step 1: Write the failing test**

Expand the existing helper coverage with tests like:

```ts
test("buildSummarySecondaryState returns explicit last-7-days copy for sparkline mode", () => {
  const state = buildSummarySecondaryState({
    comparisonEnabled: false,
    deltaLabel: "Ignored when sparkline is shown",
    sparkline: [12, 18, 10, 14, 16, 11, 15]
  });

  assert.equal(state.mode, "sparkline");
  assert.equal(state.label, "Last 7 days");
});

test("buildSummarySecondaryState returns comparison copy when comparison is enabled", () => {
  const state = buildSummarySecondaryState({
    comparisonEnabled: true,
    deltaLabel: "Compared with previous period",
    sparkline: [12, 18, 10, 14, 16, 11, 15]
  });

  assert.equal(state.mode, "delta");
  assert.equal(state.label, "Compared with previous period");
});

test("summary value sizing steps down for long currency values", () => {
  assert.equal(getSummaryValueClassName("$123.45"), "text-4xl");
  assert.equal(getSummaryValueClassName("$123,456.78"), "text-3xl");
  assert.equal(getSummaryValueClassName("$12,345,678.90"), "text-2xl");
});
```

**Step 2: Run test to verify it fails**

Run: `env NODE_ENV=test pnpm --filter @minance/web exec tsx --test src/app/explorer/presentation.test.ts`

Expected: FAIL because the helper still returns `Recent 7-day trend` and there is no typography-sizing helper yet.

**Step 3: Write minimal implementation**

Update the presentation helper so sparkline mode uses explicit seven-day copy and add a small helper for hero-card value sizing.

```ts
export function buildSummarySecondaryState(
  input: SummarySecondaryStateInput
): SummarySecondaryState {
  if (!input.comparisonEnabled && input.sparkline.length > 1) {
    return {
      mode: "sparkline",
      label: "Last 7 days"
    };
  }

  return {
    mode: "delta",
    label: input.deltaLabel
  };
}

export function getSummaryValueClassName(value: string) {
  if (value.length >= 14) return "text-2xl";
  if (value.length >= 10) return "text-3xl";
  return "text-4xl";
}
```

Keep the helper intentionally simple and based on the rendered string, not raw numeric magnitude.

**Step 4: Run test to verify it passes**

Run: `env NODE_ENV=test pnpm --filter @minance/web exec tsx --test src/app/explorer/presentation.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/app/explorer/presentation.ts apps/web/src/app/explorer/presentation.test.ts
git commit -m "refactor: clarify explorer summary presentation helpers"
```

### Task 2: Rebuild Explorer hero cards around a distinct context band

**Files:**
- Modify: `apps/web/src/app/explorer/components/ExplorerSummaryBand.tsx`

**Step 1: Write the failing test**

Add or update a Playwright assertion so comparison-off cards show explicit seven-day language and comparison-on cards do not rely on the old `7D` shorthand alone:

```ts
test("summary cards separate selected-range totals from recent seven-day context", async ({ page }) => {
  await loginWithSeedAccount(page);
  await uploadAndCommitFixtureCsv(page);
  await page.goto("/explorer?range=365d");

  const summary = page.getByTestId("explorer-summary-band");
  await expect(summary).toContainText("Last 7 days");
  await expect(summary).toContainText("within current filters");
  await expect(summary).not.toContainText("Recent 7-day trend");
});
```

If comparison mode already has coverage elsewhere, extend that test to assert the hero cards surface previous-period language without a separate right-side comparison module.

**Step 2: Run test to verify it fails**

Run: `env NODE_ENV=test pnpm exec playwright test e2e/specs/explorer-upgrade.spec.ts --grep "separate selected-range totals"`

Expected: FAIL because the cards still use `Recent 7-day trend` plus `7D`, and the current layout does not visually separate the context band.

**Step 3: Write minimal implementation**

Update `ExplorerSummaryBand.tsx` so:
- the top card section holds only the metric label, primary value, and icon
- the primary value uses `getSummaryValueClassName(item.value)`
- the lower context band becomes mode-specific

Implementation sketch:

```tsx
const secondaryState = buildSummarySecondaryState({
  comparisonEnabled: comparison?.enabled ?? false,
  deltaLabel: "Compared with previous period",
  sparkline: sparklineData
});

<div className="rounded-[22px] border border-neutral-900 bg-neutral-950/80 p-4">
  <div className="flex items-start justify-between gap-4">
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-neutral-500">
        {item.label}
      </p>
      <p className={`mt-4 font-semibold tracking-tight ${getSummaryValueClassName(item.value)}`}>
        {item.value}
      </p>
    </div>
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ...">
      <item.icon className="h-5 w-5" />
    </div>
  </div>
</div>

<div className="rounded-[20px] border border-neutral-900 bg-neutral-1000/60 px-4 py-3">
  {secondaryState.mode === "sparkline" ? (
    <>
      <div className="flex items-center justify-between text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
        <span>{secondaryState.label}</span>
        <span>within current filters</span>
      </div>
      <ExplorerMiniSparkline ... />
    </>
  ) : (
    <>
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
        Compared with previous period
      </p>
      <p className="mt-1 text-sm text-neutral-300">{formatDelta(item.delta)}</p>
    </>
  )}
</div>
```

Avoid putting both the delta badge and a sparkline in the same header area. The footer band is the one place for contextual detail.

**Step 4: Run test to verify it passes**

Run: `env NODE_ENV=test pnpm exec playwright test e2e/specs/explorer-upgrade.spec.ts --grep "separate selected-range totals"`

Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/app/explorer/components/ExplorerSummaryBand.tsx
git commit -m "feat: clarify explorer summary card context"
```

### Task 3: Remove the redundant comparison panel and let the trend chart own the overview row

**Files:**
- Modify: `apps/web/src/app/explorer/components/OverviewPerspective.tsx`
- Modify: `apps/web/src/app/explorer/components/TrendChart.tsx`
- Delete: `apps/web/src/app/explorer/components/ExplorerComparisonPanel.tsx`
- Modify: `apps/web/src/app/explorer/page.tsx`
- Modify: `e2e/specs/explorer-upgrade.spec.ts`

**Step 1: Write the failing test**

Update the overview coverage to assert the comparison panel is gone and the trend chart reflects the active range label:

```ts
test("overview perspective uses a full-width trend chart with the active range label", async ({ page }) => {
  await loginWithSeedAccount(page);
  await uploadAndCommitFixtureCsv(page);
  await page.goto("/explorer?range=365d");

  await expect(page.getByTestId("explorer-overview-trend")).toBeVisible();
  await expect(page.getByTestId("explorer-comparison-panel")).toHaveCount(0);
  await expect(page.getByTestId("explorer-overview-trend")).toContainText("Last 12 months");
  await expect(page.getByTestId("explorer-overview-trend")).not.toContainText("Last 6 months");
});
```

If the fixture supports enough monthly buckets, also assert the chart renders more than six month labels after selecting the twelve-month range.

**Step 2: Run test to verify it fails**

Run: `env NODE_ENV=test pnpm exec playwright test e2e/specs/explorer-upgrade.spec.ts --grep "full-width trend chart"`

Expected: FAIL because the panel still renders and the chart still shows `Last 6 months`.

**Step 3: Write minimal implementation**

Make the overview row single-column and pass the active range label into the trend chart.

Implementation sketch:

```tsx
// page.tsx
<OverviewPerspective
  overview={overview}
  summary={explorer?.summary || null}
  comparison={explorer?.comparison || null}
  heatmap={explorer?.heatmap.items || []}
  anomalies={explorer?.anomalies.items || []}
  trendRangeLabel={dateRangeDisplay}
  ...
/>

// OverviewPerspective.tsx
<div data-testid="explorer-overview-trend">
  <TrendChart
    overview={overview}
    rangeLabel={trendRangeLabel}
    onMonthClick={onMonthClick}
    loading={loading}
  />
</div>

// TrendChart.tsx
const trendBars = useMemo(() => {
  const trend = overview?.trend || [];
  ...
  return trend.map((entry) => ({
    ...entry,
    ...
  }));
}, [overview]);
```

Update the chart header copy so it references `rangeLabel`, not a hard-coded six-month horizon. Delete the comparison-panel component if nothing else imports it.

**Step 4: Run test to verify it passes**

Run: `env NODE_ENV=test pnpm exec playwright test e2e/specs/explorer-upgrade.spec.ts --grep "full-width trend chart"`

Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/app/explorer/components/OverviewPerspective.tsx apps/web/src/app/explorer/components/TrendChart.tsx apps/web/src/app/explorer/page.tsx e2e/specs/explorer-upgrade.spec.ts
git rm apps/web/src/app/explorer/components/ExplorerComparisonPanel.tsx
git commit -m "feat: remove redundant explorer comparison panel"
```

### Task 4: Run focused regression coverage for Explorer summary clarity

**Files:**
- No source changes required unless a regression appears

**Step 1: Run Explorer unit coverage**

Run: `env NODE_ENV=test pnpm --filter @minance/web exec tsx --test src/app/explorer/presentation.test.ts`

Expected: PASS

**Step 2: Run targeted Explorer end-to-end coverage**

Run: `env NODE_ENV=test pnpm exec playwright test e2e/specs/explorer-upgrade.spec.ts`

Expected: PASS

**Step 3: Review the final diff**

Run: `git diff -- apps/web/src/app/explorer/presentation.ts apps/web/src/app/explorer/presentation.test.ts apps/web/src/app/explorer/components/ExplorerSummaryBand.tsx apps/web/src/app/explorer/components/OverviewPerspective.tsx apps/web/src/app/explorer/components/TrendChart.tsx apps/web/src/app/explorer/page.tsx e2e/specs/explorer-upgrade.spec.ts`

Expected: Diff shows only summary-clarity, range-label, and comparison-panel-removal changes.

**Step 4: Commit**

```bash
git add apps/web/src/app/explorer/presentation.ts apps/web/src/app/explorer/presentation.test.ts apps/web/src/app/explorer/components/ExplorerSummaryBand.tsx apps/web/src/app/explorer/components/OverviewPerspective.tsx apps/web/src/app/explorer/components/TrendChart.tsx apps/web/src/app/explorer/page.tsx e2e/specs/explorer-upgrade.spec.ts
git commit -m "test: verify explorer summary clarity"
```
