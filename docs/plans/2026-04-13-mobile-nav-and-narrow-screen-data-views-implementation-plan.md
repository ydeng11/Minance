# Mobile Nav and Narrow-Screen Data Views Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restore mobile route parity for Explorer and make Transactions and Import usable on phones without relying on horizontal table scrolling.

**Architecture:** Keep desktop layouts intact while introducing mobile-specific adaptations at the component boundary. Rework the bottom navigation into a compact primary bar plus `More` sheet, keep Transactions on a single responsive ledger structure, and add mobile card renderers for Import review surfaces while preserving the existing table implementations for larger breakpoints.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Tailwind CSS 4, Playwright, Node test runner

---

### Task 1: Lock mobile navigation expectations

**Files:**
- Modify: `apps/web/src/components/layout/BottomNav.test.ts`
- Test: `e2e/specs/navigation-secondary-menu.spec.ts`

**Step 1: Write the failing tests**

- Extend `apps/web/src/components/layout/BottomNav.test.ts` to assert the source includes `Explorer` and a `More` destination rather than a horizontally growing list of every route.
- Add a mobile Playwright scenario in `e2e/specs/navigation-secondary-menu.spec.ts` that opens the bottom nav on a phone viewport, verifies `Explorer` is directly visible, opens `More`, and verifies access to `Accounts`, `Categories`, `Recurrings`, and `Settings`.

**Step 2: Run tests to verify they fail**

Run: `pnpm --filter web test -- --test-name-pattern="bottom nav"`  
Expected: FAIL because `BottomNav.tsx` still omits `Explorer` and has no `More` entry.

Run: `pnpm exec playwright test e2e/specs/navigation-secondary-menu.spec.ts -g "mobile more navigation exposes secondary routes"`  
Expected: FAIL because the current mobile nav has no `More` sheet and no direct `Explorer` slot.

**Step 3: Write minimal implementation**

- Update `apps/web/src/components/layout/BottomNav.tsx` to define a compact primary item list.
- Implement a lightweight mobile `More` surface with focusable route buttons and close behavior.
- Keep touch targets at or above the current 44px floor.

**Step 4: Run tests to verify they pass**

Run the same two commands and confirm both pass.

**Step 5: Commit**

```bash
git add apps/web/src/components/layout/BottomNav.tsx apps/web/src/components/layout/BottomNav.test.ts e2e/specs/navigation-secondary-menu.spec.ts
git commit -m "feat: tighten mobile navigation parity"
```

### Task 2: Make narrow-screen Transactions usable without horizontal panning

**Files:**
- Modify: `apps/web/src/app/transactions/page.tsx`
- Modify: `e2e/specs/transactions-ledger-responsive.spec.ts`

**Step 1: Write the failing test**

- Replace the current mobile assertion in `e2e/specs/transactions-ledger-responsive.spec.ts` that expects horizontal overflow with assertions that the main row content, amount, and actions remain visible and operable within the viewport on a phone-sized screen.

**Step 2: Run test to verify it fails**

Run: `pnpm exec playwright test e2e/specs/transactions-ledger-responsive.spec.ts -g "transactions remains usable on narrow screens"`  
Expected: FAIL because the ledger region still overflows horizontally.

**Step 3: Write minimal implementation**

- Update the narrow-screen table/container styling in `apps/web/src/app/transactions/page.tsx` so the ledger no longer requires horizontal panning below the desktop breakpoint.
- Keep desktop column structure intact and avoid branching into a second desktop implementation.
- Preserve existing selection, inline edit, and row action behavior.

**Step 4: Run test to verify it passes**

Run the same Playwright command and confirm it passes.

**Step 5: Commit**

```bash
git add apps/web/src/app/transactions/page.tsx e2e/specs/transactions-ledger-responsive.spec.ts
git commit -m "fix: adapt transactions ledger for narrow screens"
```

### Task 3: Introduce mobile card layouts for Import review

**Files:**
- Modify: `apps/web/src/app/import/page.tsx`
- Modify: `apps/web/src/app/import/page.test.ts`
- Test: `e2e/specs/imports-upload-process.spec.ts`

**Step 1: Write the failing tests**

- Add unit coverage in `apps/web/src/app/import/page.test.ts` for mobile-only processed-row and reconciliation rendering hooks or conditional markup.
- Add a Playwright scenario in `e2e/specs/imports-upload-process.spec.ts` that processes an import on a phone viewport and verifies the processed rows and reconciliation sections render as stacked mobile cards instead of only as wide tables.

**Step 2: Run tests to verify they fail**

Run: `pnpm --filter web test -- src/app/import/page.test.ts`  
Expected: FAIL because mobile-specific import card markup does not exist yet.

Run: `pnpm exec playwright test e2e/specs/imports-upload-process.spec.ts -g "import review adapts to narrow screens"`  
Expected: FAIL because the current mobile experience still renders only wide tables.

**Step 3: Write minimal implementation**

- Extract or add compact mobile renderers inside `apps/web/src/app/import/page.tsx` for processed rows and reconciliation entries.
- Reuse existing field update handlers and account/category option plumbing so mobile and desktop stay behaviorally aligned.
- Keep desktop table markup visible at larger breakpoints only.

**Step 4: Run tests to verify they pass**

Run the same unit and Playwright commands and confirm both pass.

**Step 5: Commit**

```bash
git add apps/web/src/app/import/page.tsx apps/web/src/app/import/page.test.ts e2e/specs/imports-upload-process.spec.ts
git commit -m "feat: add mobile import review layouts"
```

### Task 4: Full verification and cleanup

**Files:**
- Modify: `minance2-lv3y--adapt-mobile-nav-parity-and-narrow-screen-data-vie.md`

**Step 1: Run the focused regression suite**

Run:

```bash
pnpm --filter web test -- --test-name-pattern="bottom nav|import"
pnpm exec playwright test e2e/specs/navigation-secondary-menu.spec.ts e2e/specs/transactions-ledger-responsive.spec.ts e2e/specs/imports-upload-process.spec.ts
just build-web
just check
```

Expected: PASS across all commands.

**Step 2: Simplify any large generated diff**

- If the combined implementation exceeds 50 lines of new or changed code in a way that feels noisy or repetitive, run the `Code Simplifier` skill before final handoff.

**Step 3: Update the bean**

- Mark all remaining checklist items complete in `minance2-lv3y--adapt-mobile-nav-parity-and-narrow-screen-data-vie.md`.
- Append a `## Summary of Changes` section describing the implemented mobile nav and responsive data-view work.

**Step 4: Commit**

```bash
git add docs/plans/2026-04-13-mobile-nav-and-narrow-screen-data-views-design.md docs/plans/2026-04-13-mobile-nav-and-narrow-screen-data-views-implementation-plan.md minance2-lv3y--adapt-mobile-nav-parity-and-narrow-screen-data-vie.md
git commit -m "chore: document responsive adaptation plan"
```
