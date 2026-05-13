# Shared Dialog and Multiselect Accessibility Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Harden shared dialog and searchable multiselect accessibility for the first audit recommendation.

**Architecture:** Keep the fix localized to `MultiSelectField`, `ViewDialog`, and `TransactionsAdvancedFilters`. Use static markup tests for semantic assertions and Playwright for focus behavior in the shared shell dialog.

**Tech Stack:** Next.js, React, TypeScript, node:test, Playwright

---

### Task 1: Capture Failing Accessibility Expectations

**Files:**
- Modify: `apps/web/src/app/transactions/filter-controls-ui.test.ts`
- Modify: `e2e/specs/view-control-placement.spec.ts`

**Step 1: Write the failing test**

- Add a static markup test proving searchable multiselects expose an accessible search label.
- Add a static markup test proving `TransactionsAdvancedFilters` exposes labeled dialog semantics on the visible panel.
- Add a Playwright assertion proving the shared shell dialog takes focus on open and restores focus to the toggle on close.

**Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter @minance/web test -- --test-name-pattern="searchable multiselect|dialog semantics"
pnpm e2e -- e2e/specs/view-control-placement.spec.ts
```

Expected: failures showing missing search labeling and missing focus behavior.

### Task 2: Implement Minimal Accessibility Fixes

**Files:**
- Modify: `apps/web/src/components/filters/MultiSelectField.tsx`
- Modify: `apps/web/src/components/view/ViewDialog.tsx`
- Modify: `apps/web/src/app/transactions/TransactionsAdvancedFilters.tsx`
- Modify: `apps/web/src/app/explorer/components/ExplorerAdvancedFilters.tsx`

**Step 1: Write minimal implementation**

- Add a dedicated search input aria-label path to `MultiSelectField`.
- Pass explicit search labels from searchable explorer/transactions filter callers.
- Move/fix dialog semantics on `TransactionsAdvancedFilters` and add initial focus plus focus restore.
- Add shared shell dialog initial focus and focus restore behavior in `ViewDialog`.

**Step 2: Run targeted verification**

Run:

```bash
pnpm --filter @minance/web test -- --test-name-pattern="searchable multiselect|dialog semantics|advanced filters"
pnpm e2e -- e2e/specs/view-control-placement.spec.ts
```

Expected: all targeted tests pass.

### Task 3: Final Verification and Cleanup

**Files:**
- Modify: `minance2-i9nj--harden-shared-dialog-and-multiselect-accessibility.md`

**Step 1: Run broader guardrails for touched behavior**

Run:

```bash
just build-web
just e2e-a11y
```

Expected: clean build and passing accessibility-focused e2e checks.

**Step 2: Update tracking**

- Mark the bean todos complete.
- Add a short summary of the implemented hardening changes and verification results.
