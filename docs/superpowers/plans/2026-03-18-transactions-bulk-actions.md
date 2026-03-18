# Transactions Bulk Actions Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add single delete confirmation and bulk category/tag/review actions to the transactions page.

**Architecture:** Add new state variables and handlers to the existing transactions page component. Replace single delete button with two-step inline confirmation. Add dropdown menus for bulk actions in the bulk bar.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS

---

## File Structure

| File | Changes |
|------|---------|
| `apps/web/src/app/transactions/page.tsx` | All changes in this file |

---

## Chunk 1: Single Delete Confirmation

### Task 1: Add delete confirmation state

**Files:**
- Modify: `apps/web/src/app/transactions/page.tsx:136` (after `selectedTransactionIds` state)

- [ ] **Step 1: Add deleteConfirmId state after selectedTransactionIds**

Find the state declarations around line 136 and add after `selectedTransactionIds`:

```tsx
const [selectedTransactionIds, setSelectedTransactionIds] = useState<Set<string>>(() => new Set());
const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
```

- [ ] **Step 2: Clear delete confirmation in startEdit function**

Find `function startEdit(transaction: Transaction)` around line 520 and add `setDeleteConfirmId(null);` as the first line:

```tsx
function startEdit(transaction: Transaction) {
  setDeleteConfirmId(null);
  clearSelectedTransactions();
  setIsCreateDialogOpen(false);
  // ... rest of existing code
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/transactions/page.tsx
git commit -m "feat(transactions): add delete confirmation state"
```

### Task 2: Replace delete button with confirmation UI

**Files:**
- Modify: `apps/web/src/app/transactions/page.tsx:1069-1077` (delete button in Actions column)

- [ ] **Step 1: Replace the delete button with conditional confirmation UI**

Find the delete button around line 1069 and replace the entire `<button>` element with:

```tsx
{deleteConfirmId === txn.id ? (
  <div className="flex gap-1">
    <button
      type="button"
      onClick={() => void removeTransaction(txn.id)}
      disabled={saving}
      className="rounded-lg border border-rose-600 bg-rose-950/60 px-2 py-1 text-xs text-rose-200 transition hover:bg-rose-900/40 disabled:opacity-60"
      data-testid={`txn-delete-confirm-${txn.id}`}
    >
      Confirm?
    </button>
    <button
      type="button"
      onClick={() => setDeleteConfirmId(null)}
      disabled={saving}
      className="rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-neutral-300 transition hover:bg-neutral-800 disabled:opacity-60"
      data-testid={`txn-delete-cancel-${txn.id}`}
    >
      Cancel
    </button>
  </div>
) : (
  <button
    type="button"
    onClick={() => setDeleteConfirmId(txn.id)}
    disabled={saving || isEditing}
    className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs font-medium text-neutral-200 transition hover:bg-neutral-800 disabled:opacity-60"
    data-testid={`txn-delete-${txn.id}`}
    aria-label={`Delete transaction ${txn.merchant_raw}`}
  >
    Delete
  </button>
)}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/transactions/page.tsx
git commit -m "feat(transactions): add two-step delete confirmation UI"
```

---

## Chunk 2: Bulk Action State and Handlers

### Task 3: Add bulk action state variables

**Files:**
- Modify: `apps/web/src/app/transactions/page.tsx:137` (after deleteConfirmId state)

- [ ] **Step 1: Add bulk action states after deleteConfirmId**

```tsx
const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
const [bulkCategoryOpen, setBulkCategoryOpen] = useState(false);
const [bulkCategoryValue, setBulkCategoryValue] = useState("");
const [bulkTagsOpen, setBulkTagsOpen] = useState(false);
const [bulkTagsValue, setBulkTagsValue] = useState("");
const [bulkTagsError, setBulkTagsError] = useState<string | null>(null);
const [bulkReviewOpen, setBulkReviewOpen] = useState(false);
const [bulkApplying, setBulkApplying] = useState(false);
```

- [ ] **Step 2: Import parseTagListInput from form.ts**

Find the imports at the top (around line 13-19) and add `parseTagListInput` to the existing form imports:

```tsx
import {
  buildDraftFromTransaction,
  createInitialTransactionDraft,
  validateTransactionDraft,
  parseTagListInput,
  type TransactionFormDraft,
  type TransactionFormErrors
} from "./form";
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/transactions/page.tsx
git commit -m "feat(transactions): add bulk action state variables"
```

### Task 4: Add bulk action handler functions

**Files:**
- Modify: `apps/web/src/app/transactions/page.tsx:568` (after removeSelectedTransactions function)

- [ ] **Step 1: Add applyBulkCategory function after removeSelectedTransactions**

```tsx
async function applyBulkCategory() {
  if (!bulkCategoryValue) return;
  const selectedIds = Array.from(selectedTransactionIds);
  setBulkApplying(true);
  try {
    await api.transactions.bulkUpdate({
      transaction_ids: selectedIds,
      operation: "update",
      category_final: bulkCategoryValue
    });
    setMessage(`${selectedVisibleCount} transactions updated.`);
    setBulkCategoryOpen(false);
    setBulkCategoryValue("");
    setSelectedTransactionIds(new Set());
    await loadTransactions(filtersRef.current, { preserveMessage: true });
  } catch (error) {
    setMessage(getRequestErrorMessage(error, "Failed to update categories."));
  } finally {
    setBulkApplying(false);
  }
}
```

- [ ] **Step 2: Add applyBulkTags function**

```tsx
async function applyBulkTags() {
  const parsed = parseTagListInput(bulkTagsValue);
  if (parsed.error) {
    setBulkTagsError(parsed.error);
    return;
  }
  if (!parsed.tags.length) return;

  const selectedIds = Array.from(selectedTransactionIds);
  setBulkApplying(true);
  setBulkTagsError(null);
  try {
    await api.transactions.bulkUpdate({
      transaction_ids: selectedIds,
      operation: "update",
      tags: parsed.tags
    });
    setMessage(`${selectedVisibleCount} transactions tagged.`);
    setBulkTagsOpen(false);
    setBulkTagsValue("");
    setSelectedTransactionIds(new Set());
    await loadTransactions(filtersRef.current, { preserveMessage: true });
  } catch (error) {
    setMessage(getRequestErrorMessage(error, "Failed to update tags."));
  } finally {
    setBulkApplying(false);
  }
}
```

- [ ] **Step 3: Add applyBulkReview function**

```tsx
async function applyBulkReview(status: "reviewed" | "needs_review") {
  const selectedIds = Array.from(selectedTransactionIds);
  setBulkApplying(true);
  try {
    await api.transactions.bulkUpdate({
      transaction_ids: selectedIds,
      operation: "update",
      review_status: status
    });
    setMessage(`${selectedVisibleCount} transactions marked as ${status === "reviewed" ? "reviewed" : "needing review"}.`);
    setBulkReviewOpen(false);
    setSelectedTransactionIds(new Set());
    await loadTransactions(filtersRef.current, { preserveMessage: true });
  } catch (error) {
    setMessage(getRequestErrorMessage(error, "Failed to update review status."));
  } finally {
    setBulkApplying(false);
  }
}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/transactions/page.tsx
git commit -m "feat(transactions): add bulk action handlers for category, tags, review"
```

---

## Chunk 3: Bulk Action UI

### Task 5: Add dropdown close handlers

**Files:**
- Modify: `apps/web/src/app/transactions/page.tsx` (add useEffect after existing effects)

- [ ] **Step 1: Add click-outside and Escape key handlers**

Find the existing useEffect hooks (after line 340) and add after them:

```tsx
// Close bulk dropdowns on click outside
useEffect(() => {
  if (!bulkCategoryOpen && !bulkTagsOpen && !bulkReviewOpen) return;

  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest("[data-bulk-dropdown]")) {
      setBulkCategoryOpen(false);
      setBulkTagsOpen(false);
      setBulkReviewOpen(false);
    }
  }

  document.addEventListener("click", handleClickOutside);
  return () => document.removeEventListener("click", handleClickOutside);
}, [bulkCategoryOpen, bulkTagsOpen, bulkReviewOpen]);

// Close bulk dropdowns on Escape key
useEffect(() => {
  if (!bulkCategoryOpen && !bulkTagsOpen && !bulkReviewOpen) return;

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      setBulkCategoryOpen(false);
      setBulkTagsOpen(false);
      setBulkReviewOpen(false);
    }
  }

  document.addEventListener("keydown", handleKeyDown);
  return () => document.removeEventListener("keydown", handleKeyDown);
}, [bulkCategoryOpen, bulkTagsOpen, bulkReviewOpen]);
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/transactions/page.tsx
git commit -m "feat(transactions): add dropdown close handlers for bulk actions"
```

### Task 6: Add bulk action buttons to bulk bar

**Files:**
- Modify: `apps/web/src/app/transactions/page.tsx:900-926` (bulk bar section)

- [ ] **Step 1: Find the bulk bar and add action buttons**

Find the bulk bar `<div data-testid="txn-bulk-bar">` around line 900. Replace the entire bulk bar content with:

```tsx
{hasVisibleSelection ? (
  <div
    data-testid="txn-bulk-bar"
    className="relative flex flex-wrap items-center justify-between gap-3 border-b border-neutral-900 bg-neutral-900/60 px-5 py-3.5"
  >
    <div className="text-sm text-neutral-200">
      <span className="font-semibold text-neutral-50">{selectedVisibleCount}</span> selected on this page
    </div>
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={clearSelectedTransactions}
        data-testid="txn-bulk-clear"
        className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 transition hover:bg-neutral-800"
      >
        Clear selection
      </button>

      {/* Category action */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setBulkCategoryOpen(!bulkCategoryOpen);
            setBulkTagsOpen(false);
            setBulkReviewOpen(false);
          }}
          disabled={bulkApplying}
          className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 transition hover:bg-neutral-800 disabled:opacity-60"
          data-testid="txn-bulk-category-btn"
        >
          Category
        </button>
        {bulkCategoryOpen && (
          <div data-bulk-dropdown className="absolute top-full left-0 mt-1 z-10 w-56 rounded-lg border border-neutral-800 bg-neutral-950 p-3 shadow-xl">
            <select
              value={bulkCategoryValue}
              onChange={(e) => setBulkCategoryValue(e.target.value)}
              className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200"
              data-testid="txn-bulk-category-select"
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.emoji ? `${c.emoji} ` : ""}{c.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void applyBulkCategory()}
              disabled={!bulkCategoryValue || bulkApplying}
              className="mt-2 w-full rounded-md border border-emerald-600/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300 disabled:opacity-60"
              data-testid="txn-bulk-category-apply"
            >
              {bulkApplying ? "Applying..." : `Apply to ${selectedVisibleCount}`}
            </button>
          </div>
        )}
      </div>

      {/* Tags action */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setBulkTagsOpen(!bulkTagsOpen);
            setBulkCategoryOpen(false);
            setBulkReviewOpen(false);
          }}
          disabled={bulkApplying}
          className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 transition hover:bg-neutral-800 disabled:opacity-60"
          data-testid="txn-bulk-tags-btn"
        >
          Tags
        </button>
        {bulkTagsOpen && (
          <div data-bulk-dropdown className="absolute top-full left-0 mt-1 z-10 w-64 rounded-lg border border-neutral-800 bg-neutral-950 p-3 shadow-xl">
            <input
              type="text"
              value={bulkTagsValue}
              onChange={(e) => setBulkTagsValue(e.target.value)}
              placeholder="Enter tags (comma-separated)"
              className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200"
              data-testid="txn-bulk-tags-input"
            />
            <p className="mt-1 text-xs text-neutral-500">e.g. "monthly, recurring"</p>
            {bulkTagsError ? (
              <p className="mt-1 text-xs text-rose-300" data-testid="txn-bulk-tags-error">{bulkTagsError}</p>
            ) : null}
            <button
              type="button"
              onClick={() => void applyBulkTags()}
              disabled={!bulkTagsValue.trim() || bulkApplying}
              className="mt-2 w-full rounded-md border border-emerald-600/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300 disabled:opacity-60"
              data-testid="txn-bulk-tags-apply"
            >
              {bulkApplying ? "Applying..." : `Apply to ${selectedVisibleCount}`}
            </button>
          </div>
        )}
      </div>

      {/* Review action */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setBulkReviewOpen(!bulkReviewOpen);
            setBulkCategoryOpen(false);
            setBulkTagsOpen(false);
          }}
          disabled={bulkApplying}
          className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 transition hover:bg-neutral-800 disabled:opacity-60"
          data-testid="txn-bulk-review-btn"
        >
          Review
        </button>
        {bulkReviewOpen && (
          <div data-bulk-dropdown className="absolute top-full left-0 mt-1 z-10 w-48 rounded-lg border border-neutral-800 bg-neutral-950 p-2 shadow-xl">
            <button
              type="button"
              onClick={() => void applyBulkReview("reviewed")}
              disabled={bulkApplying}
              className="block w-full rounded-md px-3 py-2 text-left text-sm text-neutral-200 hover:bg-neutral-800"
              data-testid="txn-bulk-review-mark-reviewed"
            >
              Mark as reviewed
            </button>
            <button
              type="button"
              onClick={() => void applyBulkReview("needs_review")}
              disabled={bulkApplying}
              className="block w-full rounded-md px-3 py-2 text-left text-sm text-neutral-200 hover:bg-neutral-800"
              data-testid="txn-bulk-review-mark-needs-review"
            >
              Mark as needs review
            </button>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={openBulkDeleteDialog}
        data-testid="txn-bulk-delete-open"
        className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-100 transition hover:bg-rose-500/20"
      >
        Delete selected
      </button>
    </div>
  </div>
) : null}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/transactions/page.tsx
git commit -m "feat(transactions): add bulk category, tags, and review action buttons"
```

---

## Chunk 4: Final Verification

### Task 7: Run tests and verify

- [ ] **Step 1: Run existing tests**

Run: `npm test -- --test-name-pattern="transactions"`
Expected: All tests pass

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit final changes**

```bash
git add apps/web/src/app/transactions/page.tsx
git commit -m "feat(transactions): complete bulk actions implementation"
```

- [ ] **Step 4: Push to remote**

Run: `git push`
Expected: Changes pushed successfully