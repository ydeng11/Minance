# Transactions Bulk Delete Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add visible-page row selection and a confirmed bulk delete workflow to `/transactions` so users can remove multiple currently visible transactions in one action without changing any existing filter, edit, create, or pagination behavior.

**Architecture:** Extend the existing `/v1/transactions/bulk` contract with an explicit delete operation, keep route-level selection and confirmation state in `apps/web/src/app/transactions/page.tsx`, and show the bulk action UI only when at least one visible row is selected. Selection must clear on visible-ledger changes such as filter apply, pagination, create/edit refreshes, or dialog entry so batch delete never acts on stale rows.

**Tech Stack:** TypeScript, Next.js app router, React 19, Tailwind CSS, Node API server, Node test runner (`tsx`), Playwright, pnpm.

---

### Task 1: Extend the transactions bulk contract to support delete

**Files:**
- Modify: `apps/web/src/lib/api/types.ts`
- Modify: `apps/web/src/lib/api/endpoints.ts`
- Modify: `services/api/src/transactions.ts`
- Modify: `services/api/test/api-contract.test.ts`

**Step 1: Write the failing tests**

Add API contract coverage for:

- bulk delete succeeds when a valid list of transaction ids is sent
- deleted rows are absent from the next transactions list response
- invalid bulk delete requests still fail clearly when ids are missing or invalid

Add a contract shape so the request is explicit, for example:

```ts
const bulkDelete = await apiRequest(context, "POST", "/v1/transactions/bulk", {
  token: accessToken,
  expectedStatus: 200,
  body: {
    transaction_ids: bulkTransactionIds,
    operation: "delete"
  }
});
assert.equal(bulkDelete.payload?.result?.updated, 2);
```

**Step 2: Run the test to verify it fails**

Run:

```bash
pnpm exec tsx --test services/api/test/api-contract.test.ts
```

Expected: FAIL because the bulk endpoint does not yet accept a delete operation.

**Step 3: Write the minimal implementation**

Update `TransactionsBulkUpdateRequest` in `apps/web/src/lib/api/types.ts`:

```ts
export interface TransactionsBulkUpdateRequest {
  transaction_ids: string[];
  operation?: "update" | "delete";
  category_final?: string;
  tags?: string[] | null;
  review_status?: "reviewed" | "needs_review";
  needs_category_review?: boolean;
}
```

In `services/api/src/transactions.ts`, extend `bulkUpdateTransactions()` so:

- `operation: "delete"` is recognized
- delete is mutually exclusive with category/tags/review updates
- each selected record gets `deleted_at = nowIso()` and `updated_at = nowIso()`
- the response keeps the current `{ updated, transactions, meta }` shape

Prefer a branch like:

```ts
const operation = String(payload.operation || "update").trim().toLowerCase();
if (operation === "delete") {
  if (hasCategoryUpdate || hasTagsUpdate || hasReviewUpdate) {
    throw new Error("Bulk delete cannot be combined with updates");
  }
  ...
}
```

**Step 4: Run the test to verify it passes**

Run:

```bash
pnpm exec tsx --test services/api/test/api-contract.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/src/lib/api/types.ts apps/web/src/lib/api/endpoints.ts services/api/src/transactions.ts services/api/test/api-contract.test.ts
git commit -m "feat: support bulk transaction delete"
```

### Task 2: Add visible-page selection behavior to the transactions route

**Files:**
- Modify: `apps/web/src/app/transactions/page.tsx`
- Create: `apps/web/src/app/transactions/selection.ts`
- Create: `apps/web/src/app/transactions/selection.test.ts`

**Step 1: Write the failing test**

Create focused selection helper tests for visible-page-only behavior:

```ts
test("toggleVisibleSelection adds and removes ids from the current page", () => {
  assert.deepEqual(toggleVisibleSelection(new Set(["a"]), "b"), new Set(["a", "b"]));
});

test("toggleSelectAllVisible replaces selection with only visible rows", () => {
  assert.deepEqual(
    Array.from(toggleSelectAllVisible(new Set(["stale"]), ["x", "y"], true)).sort(),
    ["x", "y"]
  );
});

test("pruneSelectionToVisible removes ids that are no longer in the ledger page", () => {
  assert.deepEqual(Array.from(pruneSelectionToVisible(new Set(["a", "b"]), ["b"])), ["b"]);
});
```

**Step 2: Run the test to verify it fails**

Run:

```bash
pnpm exec tsx --test src/app/transactions/selection.test.ts
```

Run from:

```bash
cd apps/web
```

Expected: FAIL because the helper file does not exist yet.

**Step 3: Write the minimal implementation**

In `apps/web/src/app/transactions/selection.ts`, add small pure helpers:

```ts
export function toggleTransactionSelection(selected: Set<string>, id: string) { ... }
export function toggleSelectAllVisible(selected: Set<string>, visibleIds: string[], checked: boolean) { ... }
export function pruneSelectionToVisible(selected: Set<string>, visibleIds: string[]) { ... }
```

Then wire `page.tsx` to:

- keep `selectedTransactionIds` in state
- derive `visibleTransactionIds` from `ledgerTransactions`
- clear or prune selection when transactions reload, filters apply, page changes, create dialog opens, or inline edit starts

**Step 4: Run the test to verify it passes**

Run:

```bash
pnpm exec tsx --test src/app/transactions/selection.test.ts
```

Run from:

```bash
cd apps/web
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/src/app/transactions/page.tsx apps/web/src/app/transactions/selection.ts apps/web/src/app/transactions/selection.test.ts
git commit -m "feat: add transactions visible row selection"
```

### Task 3: Build the bulk action bar and confirmation dialog

**Files:**
- Modify: `apps/web/src/app/transactions/page.tsx`
- Create: `e2e/specs/transactions-bulk-delete.spec.ts`

**Step 1: Write the failing Playwright test**

Add one end-to-end spec that covers the full workflow:

```ts
test("@core transactions bulk delete removes selected visible rows", async ({ page }) => {
  await loginWithSeedAccount(page);
  await gotoView(page, "transactions");

  const first = await createManualTransaction(page, { merchant: `PW Bulk One ${Date.now()}`, amount: "11.25" });
  const second = await createManualTransaction(page, { merchant: `PW Bulk Two ${Date.now()}`, amount: "12.25" });

  await page.getByTestId(`txn-select-row-${first.id}`).check();
  await page.getByTestId(`txn-select-row-${second.id}`).check();
  await expect(page.getByTestId("txn-bulk-bar")).toContainText("2 selected");

  await page.getByTestId("txn-bulk-delete-open").click();
  await expect(page.getByTestId("txn-bulk-delete-dialog")).toContainText("Delete 2 transactions");
  await page.getByTestId("txn-bulk-delete-confirm").click();

  await expect(page.getByTestId("global-message")).toContainText("2 transactions deleted.");
  await expect(page.locator('[data-testid="txn-table"] tr', { hasText: first.merchant })).toHaveCount(0);
  await expect(page.locator('[data-testid="txn-table"] tr', { hasText: second.merchant })).toHaveCount(0);
});
```

Also add assertions for:

- select-all-visible checkbox
- clear-selection button
- selection clears after changing page or applying filters

**Step 2: Run the test to verify it fails**

Run:

```bash
pnpm exec playwright test e2e/specs/transactions-bulk-delete.spec.ts --project=chromium
```

Expected: FAIL because the selection column, bulk bar, and dialog do not exist yet.

**Step 3: Write the minimal implementation**

In `page.tsx`:

- add a leading selection column with stable test ids:
  - `txn-select-all-visible`
  - `txn-select-row-${txn.id}`
- add a bulk bar rendered only when `selectedTransactionIds.size > 0` with:
  - `txn-bulk-bar`
  - `txn-bulk-clear`
  - `txn-bulk-delete-open`
- add a confirmation dialog with:
  - `txn-bulk-delete-dialog`
  - `txn-bulk-delete-cancel`
  - `txn-bulk-delete-confirm`

The delete action should call:

```ts
await api.transactions.bulkUpdate({
  transaction_ids: selectedIds,
  operation: "delete"
});
```

After success:

- clear selection
- close the dialog
- refresh the current ledger view
- show `N transactions deleted.`

**Step 4: Run the test to verify it passes**

Run:

```bash
pnpm exec playwright test e2e/specs/transactions-bulk-delete.spec.ts --project=chromium
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/src/app/transactions/page.tsx e2e/specs/transactions-bulk-delete.spec.ts
git commit -m "feat: add transactions bulk delete workflow"
```

### Task 4: Run the focused regression set and finish the task cleanly

**Files:**
- Modify: `e2e/specs/transactions-ledger-header-controls.spec.ts`
- Modify: `e2e/specs/transactions-ledger-responsive.spec.ts`
- Modify: `e2e/specs/transactions-workspace-layout.spec.ts`

**Step 1: Add small regression assertions**

Extend the existing transactions specs so they prove the new selection UI does not break the refreshed ledger:

- selection column is visible but does not interfere with create/edit/delete
- responsive overflow still works with the new checkbox column
- layout test still passes with the bulk bar hidden by default

**Step 2: Run the regression set**

Run:

```bash
pnpm test:test-first
```

Run:

```bash
cd apps/web && pnpm exec tsx --test src/app/transactions/filters.test.ts src/app/transactions/selection.test.ts src/components/layout/shellWidth.test.ts
```

Run:

```bash
pnpm exec playwright test e2e/specs/transactions-workspace-layout.spec.ts e2e/specs/transactions-ledger-header-controls.spec.ts e2e/specs/transactions-ledger-responsive.spec.ts e2e/specs/transactions-bulk-delete.spec.ts --project=chromium
```

Expected: all checks PASS.

**Step 3: Commit**

```bash
git add e2e/specs/transactions-ledger-header-controls.spec.ts e2e/specs/transactions-ledger-responsive.spec.ts e2e/specs/transactions-workspace-layout.spec.ts
git commit -m "test: cover transactions bulk delete regressions"
```
