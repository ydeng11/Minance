# Flagship Polish Pass Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver a flagship finish pass across the shared shell, dashboard, and explorer micro-details without changing the approved editorial direction.

**Architecture:** Add small source-level polish contract tests first, then update the shell, navigation, help menu, dashboard, and explorer summary surfaces with behavior-preserving refinements. Keep all existing route structure, analytics behavior, and preserved test IDs intact while tightening semantics, interaction states, and styling consistency.

**Tech Stack:** Next.js app router, React 19, TypeScript, Tailwind CSS 4, Node test runner, Playwright

---

### Task 1: Lock the polish contracts with failing tests

**Files:**
- Modify: `apps/web/src/app/editorial-design-contract.test.ts`
- Create or Modify: `apps/web/src/app/flagship-polish-contract.test.ts`
- Test: `apps/web/src/app/editorial-design-contract.test.ts`
- Test: `apps/web/src/app/flagship-polish-contract.test.ts`

**Step 1: Write the failing test**

Add source-level assertions for:

- descriptive dashboard KPI `aria-label` strings in `apps/web/src/app/page.tsx`
- help menu panel semantics in `apps/web/src/components/layout/HelpMenu.tsx`
- tokenized shell-language classes and current component names in touched shell/navigation surfaces
- quieter, token-aligned explorer summary context band styling where appropriate

**Step 2: Run test to verify it fails**

Run: `pnpm --filter web test -- src/app/editorial-design-contract.test.ts src/app/flagship-polish-contract.test.ts`

Expected: FAIL with missing strings or outdated markup/classes in the touched files.

**Step 3: Write minimal implementation**

Only implement the markup, label, and styling refinements required by the failing tests. Do not expand scope beyond the approved polish surfaces.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter web test -- src/app/editorial-design-contract.test.ts src/app/flagship-polish-contract.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/app/editorial-design-contract.test.ts apps/web/src/app/flagship-polish-contract.test.ts
git commit -m "test: lock flagship polish contracts"
```

### Task 2: Refine the shared shell, nav, and help surfaces

**Files:**
- Modify: `apps/web/src/components/layout/Shell.tsx`
- Modify: `apps/web/src/components/layout/Sidebar.tsx`
- Modify: `apps/web/src/components/layout/BottomNav.tsx`
- Modify: `apps/web/src/components/layout/HelpMenu.tsx`
- Modify if needed: `apps/web/src/app/globals.css`
- Test: `e2e/specs/navigation-secondary-menu.spec.ts`
- Test: `e2e/specs/view-control-placement.spec.ts`

**Step 1: Write the failing test**

If needed, add or extend source-level assertions for:

- proper help menu panel role/semantics
- refined shell button labels or shell class markers
- shared nav/shell token alignment

**Step 2: Run test to verify it fails**

Run: `pnpm --filter web test -- src/app/flagship-polish-contract.test.ts`

Expected: FAIL until the shell and help markup matches the refined contract.

**Step 3: Write minimal implementation**

Implement:

- stronger shell header grouping and button treatment
- calmer desktop/mobile nav active-state polish
- help menu semantic fixes plus token-consistent styling
- low-risk interaction-state refinements that preserve existing behavior and IDs

**Step 4: Run focused tests**

Run: `pnpm exec playwright test e2e/specs/navigation-secondary-menu.spec.ts e2e/specs/view-control-placement.spec.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/components/layout/Shell.tsx apps/web/src/components/layout/Sidebar.tsx apps/web/src/components/layout/BottomNav.tsx apps/web/src/components/layout/HelpMenu.tsx apps/web/src/app/globals.css e2e/specs/navigation-secondary-menu.spec.ts e2e/specs/view-control-placement.spec.ts
git commit -m "feat: polish shared shell surfaces"
```

### Task 3: Refine dashboard and explorer micro-details

**Files:**
- Modify: `apps/web/src/app/page.tsx`
- Modify: `apps/web/src/app/explorer/components/ExplorerSummaryBand.tsx`
- Modify: `apps/web/src/app/explorer/components/ExplorerMiniSparkline.tsx`
- Modify if needed: `apps/web/src/app/explorer/components/TrendChart.tsx`
- Test: `apps/web/src/app/flagship-polish-contract.test.ts`
- Test: `e2e/specs/assistant-and-analytics.spec.ts`
- Test: `e2e/specs/explorer-upgrade.spec.ts`
- Test: `e2e/specs/full-user-flow.spec.ts`
- Test: `e2e/specs/cross-tab-parity.spec.ts`

**Step 1: Write the failing test**

Add or extend assertions for:

- descriptive KPI button `aria-label` values
- refined explorer summary context-band markup/classes
- any new stable polish marker needed for the flagship finish contract

**Step 2: Run test to verify it fails**

Run: `pnpm --filter web test -- src/app/flagship-polish-contract.test.ts`

Expected: FAIL until dashboard and explorer surfaces are updated.

**Step 3: Write minimal implementation**

Implement:

- dashboard KPI `aria-label` strings with clear action context
- tighter dashboard control/card micro-hierarchy and interaction feedback
- quieter, more integrated explorer sparkline/context-band treatment
- consistent summary label color, spacing, and contrast

**Step 4: Run focused tests**

Run: `pnpm exec playwright test e2e/specs/assistant-and-analytics.spec.ts e2e/specs/explorer-upgrade.spec.ts e2e/specs/full-user-flow.spec.ts e2e/specs/cross-tab-parity.spec.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/app/page.tsx apps/web/src/app/explorer/components/ExplorerSummaryBand.tsx apps/web/src/app/explorer/components/ExplorerMiniSparkline.tsx apps/web/src/app/explorer/components/TrendChart.tsx apps/web/src/app/flagship-polish-contract.test.ts e2e/specs/assistant-and-analytics.spec.ts e2e/specs/explorer-upgrade.spec.ts e2e/specs/full-user-flow.spec.ts e2e/specs/cross-tab-parity.spec.ts
git commit -m "feat: polish dashboard and explorer details"
```

### Task 4: Final verification and cleanup

**Files:**
- Modify if needed: touched files from Tasks 1-3
- Update: `docs/plans/2026-04-16-flagship-polish-pass-design.md`
- Update: `docs/plans/2026-04-16-flagship-polish-pass-implementation-plan.md`

**Step 1: Run the full targeted verification set**

Run:

```bash
pnpm --filter web test -- src/app/editorial-design-contract.test.ts src/app/flagship-polish-contract.test.ts
pnpm exec playwright test e2e/specs/navigation-secondary-menu.spec.ts e2e/specs/view-control-placement.spec.ts e2e/specs/assistant-and-analytics.spec.ts e2e/specs/explorer-upgrade.spec.ts e2e/specs/full-user-flow.spec.ts e2e/specs/cross-tab-parity.spec.ts
just check
just build-web
```

Expected: PASS across all commands.

**Step 2: Run Code Simplifier if the polish diff is large**

Review the touched files and apply only behavior-preserving readability cleanup where needed.

**Step 3: Re-run any affected verification**

Run the smallest relevant verification subset after cleanup, then re-run `just check` and `just build-web` if the simplification touched runtime code.

**Step 4: Commit**

```bash
git add docs/plans/2026-04-16-flagship-polish-pass-design.md docs/plans/2026-04-16-flagship-polish-pass-implementation-plan.md
git commit -m "docs: add flagship polish pass plan"
```
