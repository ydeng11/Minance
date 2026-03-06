# Transactions Sign, Pagination, and Inline Edit Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ensure expense sign correctness for CSV import/API-loader data, add transactions table pagination, and render edit forms directly under the selected transaction row.

**Architecture:** Normalize transaction amounts to absolute values while preserving direction semantics at read/analytics boundaries, add page-aware filter serialization for `/transactions`, and update the transactions UI to support inline row editing plus prev/next pagination controls.

**Tech Stack:** TypeScript, Next.js app router (`apps/web`), Tailwind CSS, Node test runner (`tsx --test`), API service modules (`services/api`).

---

### Task 1: Lock sign-correctness regressions with failing tests

**Files:**
- Modify: `apps/web/src/app/transactions/form.test.ts`
- Add: `services/api/test/transactions-normalization.test.ts`
- Modify: `services/api/test/imports.test.ts`
- Modify: `services/api/test/legacy-api-loader.test.ts`

**Step 1: Add failing tests for negative persisted expense amounts**
- Add tests that assert debit expenses are represented as positive amounts in transaction list responses.
- Add tests that assert overview spend remains positive for debit transactions even if persisted rows carry negative amount values.
- Add ingestion-path tests to enforce sign correctness for CSV import and legacy API loader samples.

**Step 2: Run focused tests to confirm RED**
- Run: `pnpm tsx --test services/api/test/transactions-normalization.test.ts`
- Expected: failures showing negative expense amounts leaking into list/overview.

### Task 2: Implement sign normalization at transaction and analytics boundaries

**Files:**
- Modify: `services/api/src/transactions.ts`
- Modify: `services/api/src/analytics.ts`
- Modify: `apps/web/src/app/transactions/form.ts`

**Step 1: Normalize API transaction records**
- In transaction normalization, coerce amount to absolute numeric value.
- Keep direction explicit when valid; fallback from signed amount only when missing/invalid.

**Step 2: Normalize analytics input path**
- Normalize filtered transaction rows to absolute amounts before spend/income/assistant-facing aggregation.
- Ensure helper amount conversion uses absolute numeric values.

**Step 3: Normalize edit draft amount**
- Convert persisted transaction amount to absolute value before seeding edit form state.

### Task 3: Add transactions-page pagination and inline edit row rendering

**Files:**
- Modify: `apps/web/src/app/transactions/filters.ts`
- Modify: `apps/web/src/app/transactions/filters.test.ts`
- Modify: `apps/web/src/app/transactions/page.tsx`

**Step 1: Add page state to filter model**
- Add `page` to filter state defaults/parsing/validation.
- Serialize `page` into query params when `page > 1`.
- Translate page into `limit` + `offset` API params (`TRANSACTIONS_PAGE_SIZE = 50`).

**Step 2: Update transactions UI data flow**
- Track `totalTransactions` from list API response.
- Add prev/next controls with page indicator and row-range summary.
- Reset page to 1 when applying new non-page filters.

**Step 3: Render inline edit under selected row**
- Keep the active edit form directly below the transaction row being edited.
- Preserve existing save/cancel behavior and mutation flow.
- Keep manual create section focused on create-only mode while inline edit is active.

### Task 4: Verify GREEN and integration safety

**Files:**
- Verify: all touched files above

**Step 1: Run focused frontend tests**
- Run: `pnpm tsx --test src/app/transactions/form.test.ts src/app/transactions/filters.test.ts` (from `apps/web`)
- Expected: PASS.

**Step 2: Run service regression tests**
- Run: `pnpm tsx --test services/api/test/**/*.test.ts`
- Expected: PASS with no regressions.

**Step 3: Build frontend app**
- Run: `pnpm --filter @minance/web build`
- Expected: successful production build.
