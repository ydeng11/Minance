# Transactions Sheet Filters Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the `/transactions` ledger around `@tanstack/react-table` with Google Sheets-style header filters, structured server-backed column filtering, and a grid-toolbar `New transaction` modal flow.

**Architecture:** Keep `/transactions` as a route-level data orchestrator, move the grid into route-local TanStack components, and replace the current flat filter toolbar with typed column filters rendered from table headers. Extend the `/v1/transactions` contract additively so the page can send structured text/date/amount filters and receive facet metadata for string-column multi-selects without breaking older callers.

**Tech Stack:** TypeScript, Next.js app router, React 19, Tailwind CSS, `@tanstack/react-table`, Node API server, Node test runner (`pnpm exec tsx --test`), Playwright, pnpm.

---

### Task 1: Lock the TanStack and structured-filter contract

**Files:**
- Modify: `apps/web/package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `apps/web/src/lib/api/types.ts`
- Modify: `apps/web/src/lib/api/endpoints.ts`
- Modify: `apps/web/src/lib/api/endpoints.test.ts`
- Modify: `services/api/test/api-contract.test.ts`

**Step 1: Write the failing tests**

Cover:

- transactions list endpoint accepts an additive structured filter field alongside existing params
- transactions response metadata includes string-column facet data needed by header multi-select filters
- frontend endpoint builders preserve the new structured filter payload and still support older flat params while the page migrates

**Step 2: Run tests to verify it fails**

Run:

```bash
pnpm exec tsx --test apps/web/src/lib/api/endpoints.test.ts services/api/test/api-contract.test.ts
```

Expected: failures for missing structured filter request fields, missing response metadata types, or mismatched query construction.

**Step 3: Write minimal implementation**

- add `@tanstack/react-table` to `apps/web`
- extend frontend API types to describe structured transaction filters and facet metadata
- update the transactions endpoint builder so the new filter payload can be sent without breaking existing callers

**Step 4: Run tests to verify it passes**

Run:

```bash
pnpm exec tsx --test apps/web/src/lib/api/endpoints.test.ts services/api/test/api-contract.test.ts
```

**Step 5: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml apps/web/src/lib/api/types.ts apps/web/src/lib/api/endpoints.ts apps/web/src/lib/api/endpoints.test.ts services/api/test/api-contract.test.ts
git commit -m "test: lock transactions header filter contract"
```

### Task 2: Add server-side structured filters and facet generation

**Files:**
- Modify: `services/api/src/server.ts`
- Modify: `services/api/src/transactions.ts`
- Create: `services/api/test/transactions-sheet-filters.test.ts`
- Modify: `services/api/test/api-contract.test.ts`

**Step 1: Write the failing tests**

Cover:

- text filters support operators such as `contains`, `starts_with`, `ends_with`, and `equals`
- text filters can also narrow by selected distinct values
- date filters support `before`, `after`, and `between`
- amount filters support min/max range behavior
- structured filters apply before pagination
- response metadata includes facets for at least account, category, type, and tag-oriented filter UIs

**Step 2: Run tests to verify it fails**

Run:

```bash
pnpm exec tsx --test services/api/test/transactions-sheet-filters.test.ts services/api/test/api-contract.test.ts
```

Expected: failures for unparsed structured filters, unsupported operators, or missing facet metadata.

**Step 3: Write minimal implementation**

- parse the structured filter payload in `server.ts`
- validate supported operators and normalize filter values in `transactions.ts`
- apply string/date/amount filters before slicing the requested page
- compute filter facets from the filtered dataset before pagination
- preserve existing flat query param behavior for callers that have not migrated

**Step 4: Run tests to verify it passes**

Run:

```bash
pnpm exec tsx --test services/api/test/transactions-sheet-filters.test.ts services/api/test/api-contract.test.ts
```

**Step 5: Commit**

```bash
git add services/api/src/server.ts services/api/src/transactions.ts services/api/test/transactions-sheet-filters.test.ts services/api/test/api-contract.test.ts
git commit -m "feat: add structured transaction filters"
```

### Task 3: Refactor the transactions filter model for typed column state

**Files:**
- Modify: `apps/web/src/app/transactions/filters.ts`
- Modify: `apps/web/src/app/transactions/filters.test.ts`
- Modify: `apps/web/src/app/transactions/ledger.ts`
- Modify: `apps/web/src/app/transactions/ledger.test.ts`

**Step 1: Write the failing tests**

Cover:

- parse URL params into typed column filters for text, date, and amount columns
- serialize typed filters back into shareable URL params and API params
- reset pagination to page 1 whenever an applied column filter changes
- generate compact filter-summary strings for header badges
- preserve ledger amount-bound behavior with the new filter model

**Step 2: Run tests to verify it fails**

Run:

```bash
pnpm exec tsx --test apps/web/src/app/transactions/filters.test.ts apps/web/src/app/transactions/ledger.test.ts
```

Expected: failures for missing typed filter parsing, mismatched serialization, or stale amount-summary helpers.

**Step 3: Write minimal implementation**

- replace the flat toolbar-centric filter state with typed column filter helpers
- add URL and API translation helpers for structured filters
- keep existing shareable route behavior by making URL serialization explicit and test-covered
- add summary helpers used by the header badges and filter trigger state

**Step 4: Run tests to verify it passes**

Run:

```bash
pnpm exec tsx --test apps/web/src/app/transactions/filters.test.ts apps/web/src/app/transactions/ledger.test.ts
```

**Step 5: Commit**

```bash
git add apps/web/src/app/transactions/filters.ts apps/web/src/app/transactions/filters.test.ts apps/web/src/app/transactions/ledger.ts apps/web/src/app/transactions/ledger.test.ts
git commit -m "refactor: add typed transactions column filters"
```

### Task 4: Build the TanStack ledger shell and header filter popovers

**Files:**
- Create: `apps/web/src/app/transactions/TransactionsTable.tsx`
- Create: `apps/web/src/app/transactions/TransactionHeaderFilter.tsx`
- Create: `apps/web/src/app/transactions/transactionsColumns.tsx`
- Modify: `apps/web/src/app/transactions/page.tsx`
- Modify: `e2e/specs/transactions-ledger-header-controls.spec.ts`

**Step 1: Write the failing test**

Extend Playwright coverage to assert:

- the ledger is rendered through a table toolbar and TanStack-backed header layout
- each filterable header exposes a filter trigger and active summary
- text/date/amount filter popovers open from the header instead of from the old page-level filter cards
- the `New transaction` button sits above the table and still opens the modal form

**Step 2: Run test to verify it fails**

Run:

```bash
pnpm exec playwright test e2e/specs/transactions-ledger-header-controls.spec.ts --project=chromium
```

Expected: failures because the current UI still uses the hero filter cards and not the header-triggered grid design.

**Step 3: Write minimal implementation**

- add route-local TanStack column definitions for dates, details, category, account, type, amount, and actions
- render header trigger controls with type-specific popovers
- keep table styling in Tailwind only
- move the primary toolbar, summary text, and `New transaction` button to sit directly above the grid
- keep inline edit and row actions working inside the new table shell

**Step 4: Run test to verify it passes**

Run:

```bash
pnpm exec playwright test e2e/specs/transactions-ledger-header-controls.spec.ts --project=chromium
```

**Step 5: Commit**

```bash
git add apps/web/src/app/transactions/TransactionsTable.tsx apps/web/src/app/transactions/TransactionHeaderFilter.tsx apps/web/src/app/transactions/transactionsColumns.tsx apps/web/src/app/transactions/page.tsx e2e/specs/transactions-ledger-header-controls.spec.ts
git commit -m "feat: rebuild transactions ledger with tanstack headers"
```

### Task 5: Update helpers and finish the regression net

**Files:**
- Modify: `e2e/specs/helpers.ts`
- Create: `e2e/specs/transactions-sheet-filters.spec.ts`
- Modify: `apps/web/src/app/transactions/TransactionEditorFields.tsx`
- Modify: `apps/web/src/app/transactions/page.tsx`

**Step 1: Write the failing tests**

Cover:

- string header filters support operator-based matching and value multi-select behavior
- date header filters support `before`, `after`, and `between`
- amount header filter supports dual-ended range updates
- helper flows can still create a manual transaction through the toolbar-launched modal
- test ids used by helper functions remain stable or are updated in one place

**Step 2: Run tests to verify it fails**

Run:

```bash
pnpm exec playwright test e2e/specs/transactions-sheet-filters.spec.ts e2e/specs/transactions-ledger-header-controls.spec.ts --project=chromium
```

Expected: failures for missing operator controls, missing helper selectors, or incomplete filter behavior.

**Step 3: Write minimal implementation**

- update Playwright helpers for the new header filter interactions
- finish any remaining modal or table test-id gaps
- polish the popover controls so the supported operators map cleanly to the backend filter contract

**Step 4: Run tests to verify it passes**

Run:

```bash
pnpm exec playwright test e2e/specs/transactions-sheet-filters.spec.ts e2e/specs/transactions-ledger-header-controls.spec.ts --project=chromium
```

**Step 5: Commit**

```bash
git add e2e/specs/helpers.ts e2e/specs/transactions-sheet-filters.spec.ts apps/web/src/app/transactions/TransactionEditorFields.tsx apps/web/src/app/transactions/page.tsx
git commit -m "test: cover transactions sheet-style header filters"
```

### Task 6: Run full verification before calling the feature complete

**Files:**
- No new files expected

**Step 1: Run the focused automated checks**

Run:

```bash
pnpm exec tsx --test apps/web/src/lib/api/endpoints.test.ts apps/web/src/app/transactions/filters.test.ts apps/web/src/app/transactions/ledger.test.ts services/api/test/api-contract.test.ts services/api/test/transactions-sheet-filters.test.ts
```

Expected: PASS

**Step 2: Run the web app test suite**

Run:

```bash
pnpm --filter @minance/web test
```

Expected: PASS

**Step 3: Run the targeted Playwright regression**

Run:

```bash
pnpm exec playwright test e2e/specs/transactions-ledger-header-controls.spec.ts e2e/specs/transactions-sheet-filters.spec.ts --project=chromium
```

Expected: PASS

**Step 4: Run the broader repo tests if the focused checks are green**

Run:

```bash
pnpm test
```

Expected: PASS

**Step 5: Commit**

```bash
git status --short
```

Confirm only intended files are changed, then create the final implementation commit(s).
