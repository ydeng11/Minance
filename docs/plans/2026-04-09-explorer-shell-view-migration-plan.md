# Explorer Shell View Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Finish the remaining view-based filter redesign work by moving Explorer to the shared shell-level `View` flow and removing the page-local Explorer command bar.

**Architecture:** Introduce the missing shared shell view controller/dialog in `apps/web`, then register Explorer route-specific content with it instead of keeping filter entry points inside the page body. Preserve Explorer's existing URL-driven filter semantics, saved view behavior, and drill-down flows while relocating active chips to the Explorer content shell and slimming the page header.

**Tech Stack:** Next.js App Router, React 19, TypeScript 5, Tailwind CSS 4, Playwright, `tsx --test`, pnpm.

---

### Task 1: Lock the remaining Explorer shell-view behavior with failing tests

**Files:**
- Create: `apps/web/src/app/explorer/view-layout.test.ts`
- Modify: `e2e/specs/explorer-upgrade.spec.ts`
- Modify: `e2e/specs/cross-tab-parity.spec.ts`

**Step 1: Write the failing tests**

- Add `apps/web/src/app/explorer/view-layout.test.ts` to assert Explorer renders a slim header and no page-local command bar when the shell view entry point is active.
- Update `e2e/specs/explorer-upgrade.spec.ts` so it opens Explorer filters from the shell `View` button, expects the dialog content there, and stops requiring `explorer-command-bar`.
- Update `e2e/specs/cross-tab-parity.spec.ts` to verify Explorer still loads correctly after the migration and the shell `View` affordance appears on supported routes only.

**Step 2: Run tests to verify they fail**

Run:

```bash
cd apps/web && env NODE_ENV=test ./node_modules/.bin/tsx --test src/app/explorer/view-layout.test.ts
pnpm exec playwright test e2e/specs/explorer-upgrade.spec.ts e2e/specs/cross-tab-parity.spec.ts
```

Expected: FAIL because Explorer still depends on `ExplorerCommandBar` and the shell-level `View` controller is not present in this workspace.

**Step 3: Write minimal implementation**

- Add the minimal test ids and structure the tests will assert against:
  - shell `View` trigger
  - shared view dialog frame
  - Explorer content shell chip rail
- Remove stale layout expectations that depend on `explorer-command-bar`.

**Step 4: Run tests to verify they pass**

Run:

```bash
cd apps/web && env NODE_ENV=test ./node_modules/.bin/tsx --test src/app/explorer/view-layout.test.ts
pnpm exec playwright test e2e/specs/explorer-upgrade.spec.ts e2e/specs/cross-tab-parity.spec.ts
```

Expected: PASS once Explorer opens filters from the shell and the page-local command bar assumptions are gone.

**Step 5: Commit**

```bash
git add apps/web/src/app/explorer/view-layout.test.ts e2e/specs/explorer-upgrade.spec.ts e2e/specs/cross-tab-parity.spec.ts
git commit -m "test: lock explorer shell view flow"
```

### Task 2: Reintroduce the shared shell view controller and dialog

**Files:**
- Create: `apps/web/src/components/view/ViewController.tsx`
- Create: `apps/web/src/components/view/ViewDialog.tsx`
- Create: `apps/web/src/components/view/viewRoutes.ts`
- Create: `apps/web/src/components/view/viewRoutes.test.ts`
- Modify: `apps/web/src/components/providers/AppProviders.tsx`
- Modify: `apps/web/src/components/layout/Shell.tsx`

**Step 1: Write the failing test**

- Add `apps/web/src/components/view/viewRoutes.test.ts` covering supported routes (`/transactions`, `/explorer`) and unsupported routes (`/accounts`, `/categories`).
- Extend Playwright coverage so clicking shell `View` opens a centered dialog with `Reset` and `Apply`.

**Step 2: Run tests to verify they fail**

Run:

```bash
cd apps/web && env NODE_ENV=test ./node_modules/.bin/tsx --test src/components/view/viewRoutes.test.ts
pnpm exec playwright test e2e/specs/view-control-placement.spec.ts
```

Expected: FAIL because this workspace does not currently contain the shared controller files.

**Step 3: Write minimal implementation**

- Create a `ViewController` context that lets pages register:
  - route availability
  - dialog title/description
  - rendered content
  - reset/apply handlers
- Create a shared `ViewDialog` component with centered modal layout and shell-owned `Reset` / `Apply` actions.
- Add route helpers in `viewRoutes.ts`.
- Wrap authenticated app providers with the controller and update `Shell.tsx` to render `View` before `AI Assistant`.

**Step 4: Run tests to verify they pass**

Run:

```bash
cd apps/web && env NODE_ENV=test ./node_modules/.bin/tsx --test src/components/view/viewRoutes.test.ts
pnpm exec playwright test e2e/specs/view-control-placement.spec.ts
```

Expected: PASS with shell-controlled route-aware `View` behavior restored.

**Step 5: Commit**

```bash
git add apps/web/src/components/view/ViewController.tsx apps/web/src/components/view/ViewDialog.tsx apps/web/src/components/view/viewRoutes.ts apps/web/src/components/view/viewRoutes.test.ts apps/web/src/components/providers/AppProviders.tsx apps/web/src/components/layout/Shell.tsx e2e/specs/view-control-placement.spec.ts
git commit -m "feat: restore shell view controller"
```

### Task 3: Move Explorer controls into the shell-level view dialog

**Files:**
- Create: `apps/web/src/app/explorer/components/ExplorerViewContent.tsx`
- Modify: `apps/web/src/app/explorer/page.tsx`
- Modify: `apps/web/src/app/explorer/components/ExplorerAdvancedFilters.tsx`
- Modify: `apps/web/src/components/filters/ActiveFilterBadges.tsx`

**Step 1: Write the failing test**

- Update Explorer specs to require:
  - shell-level `View` as the only filter entry point
  - range, compare, category/account filters, and advanced filter fields inside the shell dialog
  - active chips attached to the Explorer content shell
  - no chip rail for the default Explorer view

**Step 2: Run tests to verify they fail**

Run:

```bash
pnpm exec playwright test e2e/specs/explorer-upgrade.spec.ts
```

Expected: FAIL because Explorer still opens filters from `ExplorerCommandBar` and still mounts the old modal inside the page.

**Step 3: Write minimal implementation**

- Extract shell-dialog content into `ExplorerViewContent.tsx`.
- Register Explorer with `ViewController` from `page.tsx`.
- Move range and compare controls into the shared shell dialog body.
- Keep Explorer-specific advanced fields available in the same dialog, either by reusing `ExplorerAdvancedFilters` sections or folding its content into the new shared body.
- Preserve:
  - URL param parsing/building in `apps/web/src/app/explorer/filters.ts`
  - `savedViews` behavior
  - drill-down handlers to Transactions
  - merchant search semantics if still intentionally page-local

**Step 4: Run tests to verify they pass**

Run:

```bash
pnpm exec playwright test e2e/specs/explorer-upgrade.spec.ts
```

Expected: PASS with Explorer fully driven by the shell-level `View` dialog.

**Step 5: Commit**

```bash
git add apps/web/src/app/explorer/components/ExplorerViewContent.tsx apps/web/src/app/explorer/page.tsx apps/web/src/app/explorer/components/ExplorerAdvancedFilters.tsx apps/web/src/components/filters/ActiveFilterBadges.tsx e2e/specs/explorer-upgrade.spec.ts
git commit -m "feat: move explorer filters into shell view dialog"
```

### Task 4: Verify, simplify, and update bean state

**Files:**
- Modify: `.beans/minance2-dwrn--implement-view-based-filter-redesign.md`
- Modify: any touched Explorer or shell files if simplification is needed

**Step 1: Run focused verification**

Run:

```bash
cd apps/web && env NODE_ENV=test ./node_modules/.bin/tsx --test src/components/view/viewRoutes.test.ts src/app/explorer/view-layout.test.ts
pnpm exec playwright test e2e/specs/view-control-placement.spec.ts e2e/specs/explorer-upgrade.spec.ts e2e/specs/cross-tab-parity.spec.ts
just check
```

Expected: PASS, except for any known unrelated pre-existing failures that should be called out explicitly.

**Step 2: Simplify large changes if needed**

- If the combined shell + Explorer diff exceeds roughly 50 lines of substantive new logic, run the `Code Simplifier` workflow on the touched implementation before finalizing.

**Step 3: Update bean body**

- Mark `Task 4: Migrate Explorer to the shell View popup` complete.
- Append `## Summary of Changes` describing the shared shell `View` restoration plus Explorer migration details.

**Step 4: Commit**

```bash
git add .beans/minance2-dwrn--implement-view-based-filter-redesign.md apps/web/src/components/view apps/web/src/app/explorer e2e/specs
git commit -m "chore: complete explorer shell view migration bean"
```
