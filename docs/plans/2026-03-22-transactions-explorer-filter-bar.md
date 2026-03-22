# Transactions Explorer Filter Bar Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the Transactions filter surface into the same command-bar plus advanced-filters pattern used by Explorer without losing Transactions-specific filtering behavior.

**Architecture:** Split the current filter block out of `apps/web/src/app/transactions/page.tsx` into focused UI components. Use an Explorer-style command bar for quick filters and a Transactions-specific advanced-filters modal for the remaining controls, while preserving the existing filter state, apply flow, URL sync, and selection reset logic already handled in the page.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS, Playwright, Node test runner

---

### Task 1: Lock the new Transactions filter shell with a failing Playwright test

**Files:**
- Modify: `e2e/specs/transactions-workspace-layout.spec.ts`
- Modify: `e2e/specs/transactions-ledger-responsive.spec.ts`

**Step 1: Write the failing test**

- Update the workspace layout spec to expect an Explorer-style command bar on Transactions instead of the old primary and secondary filter rows.
- Update the responsive spec to open advanced filters before asserting the custom date row.

**Step 2: Run test to verify it fails**

Run: `pnpm exec playwright test e2e/specs/transactions-workspace-layout.spec.ts e2e/specs/transactions-ledger-responsive.spec.ts`
Expected: FAIL because Transactions still renders the old inline filter surface.

**Step 3: Write minimal implementation**

- Add Transactions command-bar and advanced-filters test ids to the page and remove the old row-only layout assumptions.

**Step 4: Run test to verify it passes**

Run: `pnpm exec playwright test e2e/specs/transactions-workspace-layout.spec.ts e2e/specs/transactions-ledger-responsive.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add e2e/specs/transactions-workspace-layout.spec.ts e2e/specs/transactions-ledger-responsive.spec.ts apps/web/src/app/transactions/page.tsx apps/web/src/app/transactions/TransactionsCommandBar.tsx apps/web/src/app/transactions/TransactionsAdvancedFilters.tsx
git commit -m "feat: align transactions filter shell with explorer"
```

### Task 2: Extract Transactions filter UI into Explorer-style components

**Files:**
- Create: `apps/web/src/app/transactions/TransactionsCommandBar.tsx`
- Create: `apps/web/src/app/transactions/TransactionsAdvancedFilters.tsx`
- Modify: `apps/web/src/app/transactions/page.tsx`

**Step 1: Write the failing test**

- Extend the layout test to require:
  - `txn-command-bar`
  - `txn-open-advanced-filters`
  - `txn-advanced-filters`
  - `txn-active-filters`

**Step 2: Run test to verify it fails**

Run: `pnpm exec playwright test e2e/specs/transactions-workspace-layout.spec.ts`
Expected: FAIL because the new components and test ids do not exist yet.

**Step 3: Write minimal implementation**

- Create `TransactionsCommandBar.tsx` with Explorer-matching shell, search input, range select, and `+ Filter` button.
- Create `TransactionsAdvancedFilters.tsx` with Transactions-specific controls:
  - categories
  - accounts
  - transaction types
  - category view
  - tag
  - amount range
  - recurring only
  - custom dates when needed
- Wire both into `page.tsx` with draft state and apply/close controls.

**Step 4: Run test to verify it passes**

Run: `pnpm exec playwright test e2e/specs/transactions-workspace-layout.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/app/transactions/TransactionsCommandBar.tsx apps/web/src/app/transactions/TransactionsAdvancedFilters.tsx apps/web/src/app/transactions/page.tsx e2e/specs/transactions-workspace-layout.spec.ts
git commit -m "feat: extract transactions explorer-style filters"
```

### Task 3: Preserve Transactions filtering behavior with active chips and modal apply flow

**Files:**
- Modify: `apps/web/src/app/transactions/page.tsx`
- Modify: `e2e/specs/transactions-multiselect-filters.spec.ts`
- Modify: `e2e/specs/transactions-category-view-filter.spec.ts`
- Modify: `e2e/specs/helpers.ts`

**Step 1: Write the failing test**

- Update the multiselect and category-view specs to use the advanced-filters modal instead of the old inline layout.
- Add assertions that applied filters produce active chips and that clearing a chip updates the result set.

**Step 2: Run test to verify it fails**

Run: `pnpm exec playwright test e2e/specs/transactions-multiselect-filters.spec.ts e2e/specs/transactions-category-view-filter.spec.ts`
Expected: FAIL because filter interactions still target the old layout and active chips are missing.

**Step 3: Write minimal implementation**

- Keep existing `applyFilters`, `clearFilters`, and selection-reset semantics.
- Build active-filter chips from applied Transactions filters.
- Ensure modal apply commits the draft filters and chip clears update the applied filters correctly.
- Update shared Playwright helpers to open the modal before clicking apply when needed.

**Step 4: Run test to verify it passes**

Run: `pnpm exec playwright test e2e/specs/transactions-multiselect-filters.spec.ts e2e/specs/transactions-category-view-filter.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/app/transactions/page.tsx e2e/specs/transactions-multiselect-filters.spec.ts e2e/specs/transactions-category-view-filter.spec.ts e2e/specs/helpers.ts
git commit -m "feat: preserve transactions filters in explorer layout"
```

### Task 4: Verify the final Transactions filter experience

**Files:**
- Modify: `e2e/specs/transactions-ledger-header-controls.spec.ts`
- Modify: `e2e/specs/transactions-ledger-responsive.spec.ts`
- Modify: `e2e/specs/cross-tab-parity.spec.ts`

**Step 1: Write the failing test**

- Update remaining specs that reference the old inline filter layout so they assert against the new command-bar and modal flow.

**Step 2: Run test to verify it fails**

Run: `pnpm exec playwright test e2e/specs/transactions-ledger-header-controls.spec.ts e2e/specs/transactions-ledger-responsive.spec.ts e2e/specs/cross-tab-parity.spec.ts`
Expected: FAIL until all new selectors and interactions are wired.

**Step 3: Write minimal implementation**

- Finish any missing selector, modal, or chip behavior needed by the updated specs.

**Step 4: Run test to verify it passes**

Run: `pnpm exec playwright test e2e/specs/transactions-ledger-header-controls.spec.ts e2e/specs/transactions-ledger-responsive.spec.ts e2e/specs/cross-tab-parity.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add e2e/specs/transactions-ledger-header-controls.spec.ts e2e/specs/transactions-ledger-responsive.spec.ts e2e/specs/cross-tab-parity.spec.ts apps/web/src/app/transactions/page.tsx apps/web/src/app/transactions/TransactionsCommandBar.tsx apps/web/src/app/transactions/TransactionsAdvancedFilters.tsx
git commit -m "test: verify transactions explorer-style filters"
```
