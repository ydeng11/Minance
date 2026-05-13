# Theme Token Foundation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add semantic theme tokens and migrate the shared shell plus audited theming hot spots to a real token foundation while keeping the visible app dark-only for now.

**Architecture:** Introduce semantic CSS custom properties in the global stylesheet and make `data-theme` the single source of truth for shared UI surfaces. Migrate the shell and audited components to token-backed styles first, leaving broader route content for later passes so dark mode remains visually coherent throughout this rollout.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Tailwind CSS 4, Playwright, Node test runner

---

### Task 1: Lock the theme foundation contract

**Files:**
- Modify: `apps/web/src/app/globals.css`
- Modify: `apps/web/src/app/layout.tsx`
- Modify: `apps/web/src/components/providers/AppProviders.tsx`
- Create: `apps/web/src/app/theme-foundation.test.ts`

**Step 1: Write the failing tests**

- Create `apps/web/src/app/theme-foundation.test.ts` with source-level assertions that:
  - `globals.css` defines semantic custom properties for app background, panel surface, field surface, text, border, accent, and shared gradients
  - `layout.tsx` uses a `data-theme` attribute instead of hard-coding a `.dark` class
  - `AppProviders.tsx` no longer hard-codes `theme="dark"` without referencing the same theme source

**Step 2: Run tests to verify they fail**

Run: `pnpm --filter web test -- src/app/theme-foundation.test.ts`  
Expected: FAIL because the token layer and `data-theme` contract do not exist yet.

**Step 3: Write minimal implementation**

- Expand `apps/web/src/app/globals.css` with semantic token definitions for dark and light values.
- Update `apps/web/src/app/layout.tsx` to expose `data-theme="dark"` as the shared theme source.
- Update `apps/web/src/components/providers/AppProviders.tsx` so shared overlays read from the same theme contract.

**Step 4: Run test to verify it passes**

Run the same test command and confirm it passes.

**Step 5: Commit**

```bash
git add apps/web/src/app/globals.css apps/web/src/app/layout.tsx apps/web/src/components/providers/AppProviders.tsx apps/web/src/app/theme-foundation.test.ts
git commit -m "feat: add theme token foundation"
```

### Task 2: Migrate shared shell surfaces to tokens

**Files:**
- Modify: `apps/web/src/components/layout/Shell.tsx`
- Modify: `apps/web/src/components/layout/Sidebar.tsx`
- Modify: `apps/web/src/components/layout/BottomNav.tsx`
- Modify: `apps/web/src/components/view/ViewDialog.tsx`
- Modify: `apps/web/src/components/layout/BottomNav.test.ts`
- Modify: `e2e/specs/view-control-placement.spec.ts`
- Modify: `e2e/specs/navigation-secondary-menu.spec.ts`

**Step 1: Write the failing tests**

- Extend `apps/web/src/components/layout/BottomNav.test.ts` or add equivalent source-level assertions to verify the shared shell surfaces use token-backed background/border classes instead of one-off dark color recipes.
- Add focused Playwright assertions in `e2e/specs/view-control-placement.spec.ts` and `e2e/specs/navigation-secondary-menu.spec.ts` that confirm the shell dialog and mobile navigation still open and remain visible after token migration.

**Step 2: Run tests to verify they fail**

Run: `pnpm --filter web test -- src/components/layout/BottomNav.test.ts src/app/theme-foundation.test.ts`  
Expected: FAIL because the shell surfaces still use hard-coded dark classes.

Run: `pnpm exec playwright test e2e/specs/view-control-placement.spec.ts e2e/specs/navigation-secondary-menu.spec.ts -g "shell view button appears on supported routes and opens the shell dialog|mobile more navigation exposes secondary routes"`  
Expected: PASS before code changes for interaction, then use the source-level failure as the driver for migration.

**Step 3: Write minimal implementation**

- Replace shell-level background, border, text, panel, and focus recipes with token-backed styles in:
  - `Shell.tsx`
  - `Sidebar.tsx`
  - `BottomNav.tsx`
  - `ViewDialog.tsx`
- Keep visuals dark and behavior unchanged.

**Step 4: Run tests to verify they pass**

Run the same source and Playwright commands and confirm they pass.

**Step 5: Commit**

```bash
git add apps/web/src/components/layout/Shell.tsx apps/web/src/components/layout/Sidebar.tsx apps/web/src/components/layout/BottomNav.tsx apps/web/src/components/view/ViewDialog.tsx apps/web/src/components/layout/BottomNav.test.ts e2e/specs/view-control-placement.spec.ts e2e/specs/navigation-secondary-menu.spec.ts
git commit -m "refactor: tokenize shared shell surfaces"
```

### Task 3: Migrate the audited theming hot spots

**Files:**
- Modify: `apps/web/src/app/explorer/components/ExplorerCard.tsx`
- Modify: `apps/web/src/app/transactions/TransactionsCommandBar.tsx`
- Modify: `apps/web/src/app/transactions/TransactionsAdvancedFilters.tsx`
- Modify: `apps/web/src/app/transactions/filter-controls-ui.test.ts`
- Modify: `apps/web/src/app/explorer/view-layout.test.ts`

**Step 1: Write the failing tests**

- Extend source-level tests to assert these audited components no longer embed arbitrary dark gradient rgba recipes directly.
- Add or update markup tests in `apps/web/src/app/transactions/filter-controls-ui.test.ts` and `apps/web/src/app/explorer/view-layout.test.ts` so the tokenized markup still exposes the expected structure and controls.

**Step 2: Run tests to verify they fail**

Run: `pnpm --filter web test -- src/app/transactions/filter-controls-ui.test.ts src/app/explorer/view-layout.test.ts src/app/theme-foundation.test.ts`  
Expected: FAIL because the audited components still use hard-coded gradients and color utilities.

**Step 3: Write minimal implementation**

- Replace the arbitrary gradient and repeated accent recipes in:
  - `ExplorerCard.tsx`
  - `TransactionsCommandBar.tsx`
  - `TransactionsAdvancedFilters.tsx`
- Keep copy, layout, and interaction behavior unchanged.

**Step 4: Run tests to verify they pass**

Run the same test command and confirm it passes.

**Step 5: Commit**

```bash
git add apps/web/src/app/explorer/components/ExplorerCard.tsx apps/web/src/app/transactions/TransactionsCommandBar.tsx apps/web/src/app/transactions/TransactionsAdvancedFilters.tsx apps/web/src/app/transactions/filter-controls-ui.test.ts apps/web/src/app/explorer/view-layout.test.ts apps/web/src/app/theme-foundation.test.ts
git commit -m "refactor: tokenize audited themed surfaces"
```

### Task 4: Verification and cleanup

**Files:**
- Modify: `.beans/minance2-p13w--p1-create-design-token-system-with-css-custom-prop.md`

**Step 1: Run the focused verification suite**

Run:

```bash
pnpm --filter web test -- src/app/theme-foundation.test.ts src/components/layout/BottomNav.test.ts src/app/transactions/filter-controls-ui.test.ts src/app/explorer/view-layout.test.ts
pnpm exec playwright test e2e/specs/view-control-placement.spec.ts e2e/specs/navigation-secondary-menu.spec.ts
just build-web
just check
```

Expected: PASS across all commands.

**Step 2: Simplify any large diff**

- If the token migration grows beyond a clean, readable size, run the `Code Simplifier` skill before handoff.

**Step 3: Update the bean**

- Mark the remaining checklist items complete in `.beans/minance2-p13w--p1-create-design-token-system-with-css-custom-prop.md`.
- Append a `## Summary of Changes` section describing the token foundation and migrated surfaces.

**Step 4: Commit**

```bash
git add docs/plans/2026-04-13-theme-token-foundation-design.md docs/plans/2026-04-13-theme-token-foundation-implementation-plan.md .beans/minance2-p13w--p1-create-design-token-system-with-css-custom-prop.md
git commit -m "chore: document theme token rollout"
```
