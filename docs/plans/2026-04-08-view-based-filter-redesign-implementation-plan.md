# View-Based Filter Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the page-level Transactions and Explorer filter command bars with a shared shell-level `View` action that opens a centered popup while keeping page-owned filter behavior, URL sync, and non-default active-state chips intact.

**Architecture:** Introduce a shared route-aware view controller that lets pages register popup content and apply/reset behavior with the authenticated shell. Then slim the Transactions and Explorer headers, move date range into the popup content for both pages, and attach active filter chips to the top edge of each page’s main content shell so the current view remains visible without preserving the old command-bar layer.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS, Playwright, Node test runner (`tsx --test`), pnpm.

---

### Task 1: Lock the new shell-level `View` behavior with failing tests

**Files:**
- Create: `e2e/specs/view-control-placement.spec.ts`
- Modify: `e2e/specs/transactions-workspace-layout.spec.ts`
- Modify: `e2e/specs/explorer-upgrade.spec.ts`

**Step 1: Write the failing test**

- Add a new Playwright spec that asserts:
  - `View` is visible in the shell on `/transactions`
  - `View` is visible in the shell on `/explorer`
  - `View` is absent on unrelated routes such as `/accounts` or `/categories`
  - `View` appears before `AI Assistant` in the shell action row
- Update `transactions-workspace-layout.spec.ts` so it expects the old `txn-command-bar` to disappear.
- Update `explorer-upgrade.spec.ts` so it stops expecting `explorer-command-bar` as the primary entry point.

**Step 2: Run test to verify it fails**

Run:

```bash
pnpm exec playwright test e2e/specs/view-control-placement.spec.ts e2e/specs/transactions-workspace-layout.spec.ts e2e/specs/explorer-upgrade.spec.ts
```

Expected: FAIL because the shell does not expose `View`, and both pages still depend on command-bar entry points.

**Step 3: Write minimal implementation**

- Add stable `data-testid` hooks for the new shell-level `View` control and its action-row ordering.
- Remove stale command-bar visibility expectations from the page layout assertions only after the shell trigger exists.

**Step 4: Run test to verify it passes**

Run:

```bash
pnpm exec playwright test e2e/specs/view-control-placement.spec.ts e2e/specs/transactions-workspace-layout.spec.ts e2e/specs/explorer-upgrade.spec.ts
```

Expected: PASS once the shell-level trigger is in place and the old command-bar assumptions are removed.

**Step 5: Commit**

```bash
git add e2e/specs/view-control-placement.spec.ts e2e/specs/transactions-workspace-layout.spec.ts e2e/specs/explorer-upgrade.spec.ts apps/web/src/components/layout/Shell.tsx
git commit -m "test: lock shell-level view control placement"
```

### Task 2: Add a shared route-aware view controller for the authenticated shell

**Files:**
- Create: `apps/web/src/components/view/ViewController.tsx`
- Create: `apps/web/src/components/view/ViewDialog.tsx`
- Create: `apps/web/src/components/view/viewRoutes.ts`
- Create: `apps/web/src/components/view/viewRoutes.test.ts`
- Modify: `apps/web/src/components/providers/AppProviders.tsx`
- Modify: `apps/web/src/components/layout/Shell.tsx`

**Step 1: Write the failing test**

Create `viewRoutes.test.ts` to cover:
- which routes expose `View`
- the label for the shell action
- any route helper used by `Shell` to decide whether to show the button

Also add assertions for the shell dialog frame in the new Playwright spec from Task 1:
- clicking `View` opens a centered dialog
- the dialog contains `Reset` and `Apply`

**Step 2: Run test to verify it fails**

Run:

```bash
cd apps/web && env NODE_ENV=test ./node_modules/.bin/tsx --test src/components/view/viewRoutes.test.ts
```

Then:

```bash
pnpm exec playwright test e2e/specs/view-control-placement.spec.ts
```

Expected: FAIL because no shared view-controller layer exists yet.

**Step 3: Write minimal implementation**

- Add a small shared controller that lets pages register and unregister a route-specific view configuration.
- Render a centered shared `ViewDialog` near the shell level instead of inside page bodies.
- Update `AppProviders` so both `Shell` and page components can consume the same controller context.
- Update `Shell` to:
  - show `View` only on registered supported routes
  - render it before `AI Assistant`
  - open and close the centered dialog

**Step 4: Run test to verify it passes**

Run:

```bash
cd apps/web && env NODE_ENV=test ./node_modules/.bin/tsx --test src/components/view/viewRoutes.test.ts
```

Then:

```bash
pnpm exec playwright test e2e/specs/view-control-placement.spec.ts
```

Expected: PASS with the route-aware shell trigger and centered dialog frame.

**Step 5: Commit**

```bash
git add apps/web/src/components/view/ViewController.tsx apps/web/src/components/view/ViewDialog.tsx apps/web/src/components/view/viewRoutes.ts apps/web/src/components/view/viewRoutes.test.ts apps/web/src/components/providers/AppProviders.tsx apps/web/src/components/layout/Shell.tsx e2e/specs/view-control-placement.spec.ts
git commit -m "feat: add route-aware shell view controller"
```

### Task 3: Migrate Transactions to the new `View` popup and slim header

**Files:**
- Create: `apps/web/src/app/transactions/TransactionsViewContent.tsx`
- Modify: `apps/web/src/app/transactions/page.tsx`
- Modify: `apps/web/src/app/transactions/TransactionsAdvancedFilters.tsx`
- Modify: `apps/web/src/app/transactions/filter-controls-ui.test.ts`
- Modify: `e2e/specs/transactions-ledger-header-controls.spec.ts`
- Modify: `e2e/specs/transactions-ledger-responsive.spec.ts`
- Modify: `e2e/specs/transactions-multiselect-filters.spec.ts`
- Modify: `e2e/specs/transactions-category-view-filter.spec.ts`

**Step 1: Write the failing test**

Update Transactions tests to require:
- a slim `txn-workspace-header` without the command bar
- shell-level `View` as the entry point for date range and advanced filters
- active chips attached to the top edge of `txn-ledger-shell`
- no chip rail when the page is in the default view

For behavior coverage, update filter specs so they:
- open `View` from the shell
- change categories/accounts/types/date within the centered popup
- click `Apply`
- confirm URL params and results still match existing semantics

**Step 2: Run test to verify it fails**

Run:

```bash
pnpm exec playwright test e2e/specs/transactions-workspace-layout.spec.ts e2e/specs/transactions-ledger-header-controls.spec.ts e2e/specs/transactions-ledger-responsive.spec.ts e2e/specs/transactions-multiselect-filters.spec.ts e2e/specs/transactions-category-view-filter.spec.ts
```

Expected: FAIL because Transactions still renders a page-local command bar and page-local popup flow.

**Step 3: Write minimal implementation**

- Extract the reusable Transactions popup body into `TransactionsViewContent.tsx`.
- Move the date controls into that shared popup body.
- Register the Transactions view content and apply/reset handlers with the shared view controller.
- Slim the Transactions header down to title, compact context, and primary actions.
- Move active chips so they visually cap `txn-ledger-shell` instead of floating above it.
- Keep the existing URL sync, selection reset, filter validation, and explicit apply semantics intact.

**Step 4: Run test to verify it passes**

Run:

```bash
pnpm exec playwright test e2e/specs/transactions-workspace-layout.spec.ts e2e/specs/transactions-ledger-header-controls.spec.ts e2e/specs/transactions-ledger-responsive.spec.ts e2e/specs/transactions-multiselect-filters.spec.ts e2e/specs/transactions-category-view-filter.spec.ts
```

Expected: PASS with Transactions fully driven by the shell-level `View` popup.

**Step 5: Commit**

```bash
git add apps/web/src/app/transactions/TransactionsViewContent.tsx apps/web/src/app/transactions/page.tsx apps/web/src/app/transactions/TransactionsAdvancedFilters.tsx apps/web/src/app/transactions/filter-controls-ui.test.ts e2e/specs/transactions-workspace-layout.spec.ts e2e/specs/transactions-ledger-header-controls.spec.ts e2e/specs/transactions-ledger-responsive.spec.ts e2e/specs/transactions-multiselect-filters.spec.ts e2e/specs/transactions-category-view-filter.spec.ts
git commit -m "feat: move transactions view controls into shell view dialog"
```

### Task 4: Migrate Explorer to the new `View` popup and slim header

**Files:**
- Create: `apps/web/src/app/explorer/components/ExplorerViewContent.tsx`
- Modify: `apps/web/src/app/explorer/page.tsx`
- Modify: `apps/web/src/app/explorer/components/ExplorerAdvancedFilters.tsx`
- Create: `apps/web/src/app/explorer/view-layout.test.ts`
- Modify: `e2e/specs/explorer-upgrade.spec.ts`
- Modify: `e2e/specs/cross-tab-parity.spec.ts`

**Step 1: Write the failing test**

Update Explorer coverage to require:
- shell-level `View` as the only filter entry point
- a slim page header instead of the current command-bar composition
- active chips attached to the main Explorer content shell
- no chip rail in the default view
- Explorer-specific controls such as `Compare` still present inside the popup

Use `view-layout.test.ts` for focused markup checks similar to the existing Transactions SSR tests.

**Step 2: Run test to verify it fails**

Run:

```bash
cd apps/web && env NODE_ENV=test ./node_modules/.bin/tsx --test src/app/explorer/view-layout.test.ts
```

Then:

```bash
pnpm exec playwright test e2e/specs/explorer-upgrade.spec.ts e2e/specs/cross-tab-parity.spec.ts
```

Expected: FAIL because Explorer still depends on the page-local command bar and popup flow.

**Step 3: Write minimal implementation**

- Extract the reusable Explorer popup body into `ExplorerViewContent.tsx`.
- Move range selection into the popup body and keep Explorer-specific fields such as `Compare` in a route-specific section.
- Register Explorer’s draft/apply/reset behavior with the shared view controller.
- Slim the Explorer header to title, subtitle, and top-level page actions.
- Attach active chips to the Explorer content shell while keeping current URL and drill-down semantics intact.

**Step 4: Run test to verify it passes**

Run:

```bash
cd apps/web && env NODE_ENV=test ./node_modules/.bin/tsx --test src/app/explorer/view-layout.test.ts
```

Then:

```bash
pnpm exec playwright test e2e/specs/explorer-upgrade.spec.ts e2e/specs/cross-tab-parity.spec.ts
```

Expected: PASS with Explorer fully using the shell-level `View` flow.

**Step 5: Commit**

```bash
git add apps/web/src/app/explorer/components/ExplorerViewContent.tsx apps/web/src/app/explorer/page.tsx apps/web/src/app/explorer/components/ExplorerAdvancedFilters.tsx apps/web/src/app/explorer/view-layout.test.ts e2e/specs/explorer-upgrade.spec.ts e2e/specs/cross-tab-parity.spec.ts
git commit -m "feat: move explorer view controls into shell view dialog"
```

### Task 5: Remove obsolete command-bar assumptions and simplify the old components

**Files:**
- Modify: `apps/web/src/app/transactions/TransactionsCommandBar.tsx`
- Modify: `apps/web/src/app/explorer/components/ExplorerCommandBar.tsx`
- Modify: `e2e/specs/helpers.ts`
- Modify: `docs/plans/2026-04-08-view-based-filter-redesign-design.md`

**Step 1: Write the failing test**

- Update any remaining helper flows or route specs that still click page-local command-bar buttons.
- Decide whether the old command-bar components are deleted entirely or reduced into smaller internal parts reused by the popup content.

**Step 2: Run test to verify it fails**

Run:

```bash
pnpm exec playwright test e2e/specs/transactions-workspace-layout.spec.ts e2e/specs/explorer-upgrade.spec.ts e2e/specs/full-user-flow.spec.ts
```

Expected: FAIL anywhere helper logic still assumes page-level filter triggers.

**Step 3: Write minimal implementation**

- Remove dead command-bar-only logic or repurpose the useful pieces into the new popup content components.
- Update shared Playwright helpers so view interactions route through the shell-level `View` button.
- Run `@code-simplifier` on any large, awkward leftovers after the migration to keep the page code understandable.

**Step 4: Run test to verify it passes**

Run:

```bash
pnpm exec playwright test e2e/specs/transactions-workspace-layout.spec.ts e2e/specs/explorer-upgrade.spec.ts e2e/specs/full-user-flow.spec.ts
```

Expected: PASS with no stale command-bar assumptions left in helpers or route tests.

**Step 5: Commit**

```bash
git add apps/web/src/app/transactions/TransactionsCommandBar.tsx apps/web/src/app/explorer/components/ExplorerCommandBar.tsx e2e/specs/helpers.ts docs/plans/2026-04-08-view-based-filter-redesign-design.md
git commit -m "refactor: remove obsolete page filter command bars"
```

### Task 6: Run focused verification and repo-wide checks

**Files:**
- No code changes expected

**Step 1: Run focused web tests**

Run:

```bash
cd apps/web && env NODE_ENV=test ./node_modules/.bin/tsx --test src/app/transactions/filter-controls-ui.test.ts src/app/explorer/view-layout.test.ts src/components/view/viewRoutes.test.ts
```

Expected: all focused markup and route-availability tests pass.

**Step 2: Run focused Playwright coverage**

Run:

```bash
pnpm exec playwright test e2e/specs/view-control-placement.spec.ts e2e/specs/transactions-workspace-layout.spec.ts e2e/specs/transactions-ledger-header-controls.spec.ts e2e/specs/transactions-ledger-responsive.spec.ts e2e/specs/transactions-multiselect-filters.spec.ts e2e/specs/transactions-category-view-filter.spec.ts e2e/specs/explorer-upgrade.spec.ts e2e/specs/cross-tab-parity.spec.ts
```

Expected: all targeted `View` redesign flows pass.

**Step 3: Run repo checks**

Run:

```bash
just check
```

Expected: guardrails and full automated tests pass.

**Step 4: Commit check**

Run:

```bash
git status --short
```

Confirm only the intended redesign files remain before final handoff.
