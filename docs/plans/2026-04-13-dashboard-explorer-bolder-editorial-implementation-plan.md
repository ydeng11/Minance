# Dashboard And Explorer Editorial Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Give the dashboard and explorer a more distinctive editorial finance identity without changing product behavior.

**Architecture:** Apply typography at the root with `next/font`, then redesign the dashboard and explorer analytics surfaces in place while keeping their data contracts and test IDs stable where possible. Use source-level regression tests to drive the new visual structure before updating the components.

**Tech Stack:** Next.js app router, React 19, TypeScript 5, Tailwind CSS 4, Node test runner via `tsx --test`, Playwright

---

### Task 1: Typography Foundation

**Files:**
- Modify: `apps/web/src/app/layout.tsx`
- Modify: `apps/web/src/app/globals.css`
- Create: `apps/web/src/app/editorial-design-contract.test.ts`

**Step 1: Write the failing test**

Add a source-level test asserting:
- `layout.tsx` imports two `next/font/google` fonts
- `layout.tsx` applies the font variables/classes at the body level
- `globals.css` contains the font-facing theme hooks needed by redesigned surfaces

**Step 2: Run test to verify it fails**

Run: `pnpm --filter web test -- src/app/editorial-design-contract.test.ts`

Expected: FAIL because the current layout still uses only the default font stack.

**Step 3: Write minimal implementation**

Add the display/body fonts in `layout.tsx` and wire their variables into the app body and shared CSS tokens in `globals.css`.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter web test -- src/app/editorial-design-contract.test.ts`

Expected: PASS

### Task 2: Dashboard Visual Contract

**Files:**
- Modify: `apps/web/src/app/page.tsx`
- Modify: `apps/web/src/app/dashboard-performance.test.ts`
- Modify: `apps/web/src/app/editorial-design-contract.test.ts`

**Step 1: Write the failing test**

Extend the source-level contract test so it expects:
- a dashboard hero metric region
- a supporting metrics region
- distinct dashboard sections for categories, merchants, and the transactions handoff
- the old uniform KPI mapping template to be removed from the page source

**Step 2: Run test to verify it fails**

Run: `pnpm --filter web test -- src/app/editorial-design-contract.test.ts src/app/dashboard-performance.test.ts`

Expected: FAIL because the dashboard still renders the cloned KPI row and repeated panel structure.

**Step 3: Write minimal implementation**

Refactor `page.tsx` to:
- create an editorial hero layout for `Net Flow`
- render the supporting metrics in non-clone panels
- redesign categories, merchants, trend, and transactions handoff using differentiated compositions
- keep existing drill-down behavior and key `data-testid` hooks

**Step 4: Run test to verify it passes**

Run: `pnpm --filter web test -- src/app/editorial-design-contract.test.ts src/app/dashboard-performance.test.ts`

Expected: PASS

### Task 3: Explorer Visual Contract

**Files:**
- Modify: `apps/web/src/app/explorer/components/ExplorerSummaryBand.tsx`
- Modify: `apps/web/src/app/explorer/components/TrendChart.tsx`
- Modify: `apps/web/src/app/explorer/components/MerchantAnalysis.tsx`
- Modify: `apps/web/src/app/explorer/components/Anomalies.tsx`
- Modify: `apps/web/src/app/editorial-design-contract.test.ts`

**Step 1: Write the failing test**

Extend the design contract test so it expects:
- the explorer summary band to use varied panel treatments instead of identical card shells
- the trend chart shell to expose a stronger analysis-board structure
- merchants and anomalies to diverge visually instead of sharing the same generic panel recipe

**Step 2: Run test to verify it fails**

Run: `pnpm --filter web test -- src/app/editorial-design-contract.test.ts`

Expected: FAIL because the explorer surface still uses repetitive dark-card patterns.

**Step 3: Write minimal implementation**

Update the explorer components to match the approved direction while preserving:
- existing data behavior
- existing drill-down interactions
- existing important `data-testid` hooks

**Step 4: Run test to verify it passes**

Run: `pnpm --filter web test -- src/app/editorial-design-contract.test.ts`

Expected: PASS

### Task 4: Focused UI Verification

**Files:**
- Modify as needed: existing Playwright specs only if contract changes require it

**Step 1: Run focused web tests**

Run:

```bash
pnpm --filter web test -- src/app/editorial-design-contract.test.ts src/app/dashboard-performance.test.ts src/app/explorer/presentation.test.ts
```

Expected: PASS

**Step 2: Run focused browser verification**

Run:

```bash
pnpm exec playwright test e2e/specs/assistant-and-analytics.spec.ts e2e/specs/explorer-upgrade.spec.ts -g "dashboard|explorer"
```

Expected: PASS for the redesigned analytics flows, or update the affected assertions first if the DOM contract changed intentionally.

**Step 3: Run repo checks**

Run: `just check`

Expected: PASS

**Step 4: Run production build**

Run: `just build-web`

Expected: PASS
