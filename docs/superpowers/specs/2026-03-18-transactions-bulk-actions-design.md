# Transactions UX Improvements

**Date:** 2026-03-18
**Branch:** transactions-bulk-actions
**Status:** Draft

## Summary

Improve the transactions page UX by addressing four gaps:
1. Add single delete confirmation (currently immediate, while bulk delete has confirmation)
2. Add bulk category update action
3. Add bulk tag update action
4. Add bulk review status action

## Background

The transactions page has a robust bulk selection system but only supports bulk delete. The backend API (`/v1/transactions/bulk`) already supports `operation: "update"` with `category_final`, `tags`, and `review_status` fields. Additionally, single row delete lacks confirmation while bulk delete has a dialog - this inconsistency risks accidental data loss.

## Existing Utilities (already in page.tsx)

The following utilities and state are already defined and should be reused:
- `getRequestErrorMessage(error, fallback)` - Line 99, error message extraction
- `filtersRef` - Line 132, ref for current filter state
- `selectedVisibleCount` - Line 199, count of selected transactions
- `parseTagListInput(input)` - In `form.ts`, validates and normalizes tag input

## Design

### 1. Single Delete Confirmation

**Current:** Immediate deletion on button click.

**Proposed:** Two-step inline confirmation (matching recurrings pattern).

**State:**
```tsx
const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
```

**UI Flow:**
1. First click sets `deleteConfirmId` to the transaction ID
2. Button changes to "Confirm?" and "Cancel" buttons
3. Second click (on confirm) executes deletion
4. Cancel clears `deleteConfirmId`
5. Editing a row also clears `deleteConfirmId`

**Implementation:**
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

**Clear confirmation on edit:**
```tsx
function startEditing(txn: Transaction) {
  setDeleteConfirmId(null);
  // ... existing edit logic
}
```

### 2. Bulk Actions Bar

**Current:** Only "Clear selection" and "Delete selected" buttons.

**Proposed:** Add "Category", "Tags", and "Review" action buttons.

**State additions:**
```tsx
const [bulkCategoryOpen, setBulkCategoryOpen] = useState(false);
const [bulkCategoryValue, setBulkCategoryValue] = useState("");
const [bulkTagsOpen, setBulkTagsOpen] = useState(false);
const [bulkTagsValue, setBulkTagsValue] = useState("");
const [bulkTagsError, setBulkTagsError] = useState<string | null>(null);
const [bulkReviewOpen, setBulkReviewOpen] = useState(false);
const [bulkApplying, setBulkApplying] = useState(false);
```

**Note:** `deleteConfirmId` state is declared in section 1. `selectedTransactionIds` is the existing selection state. Convert to array for API calls:
```tsx
const selectedIds = Array.from(selectedTransactionIds);
```

**UI Layout:**
```
[N selected on this page]  [Clear selection] [Category ▼] [Tags ▼] [Review ▼] [Delete selected]
```

**Each action button toggles an inline dropdown/panel:**

#### Category Action

```tsx
<button
  type="button"
  onClick={() => {
    setBulkCategoryOpen(!bulkCategoryOpen);
    setBulkTagsOpen(false);
    setBulkReviewOpen(false);
  }}
  className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 transition hover:bg-neutral-800"
>
  Category
</button>

{bulkCategoryOpen && (
  <div data-bulk-dropdown className="absolute top-full left-0 mt-1 z-10 rounded-lg border border-neutral-800 bg-neutral-950 p-3 shadow-xl">
    <select
      value={bulkCategoryValue}
      onChange={(e) => setBulkCategoryValue(e.target.value)}
      className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200"
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
    >
      Apply to {selectedVisibleCount} transactions
    </button>
  </div>
)}
```

#### Tags Action

```tsx
<button
  type="button"
  onClick={() => {
    setBulkTagsOpen(!bulkTagsOpen);
    setBulkCategoryOpen(false);
    setBulkReviewOpen(false);
  }}
  className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 transition hover:bg-neutral-800"
>
  Tags
</button>

{bulkTagsOpen && (
  <div data-bulk-dropdown className="absolute top-full left-0 mt-1 z-10 rounded-lg border border-neutral-800 bg-neutral-950 p-3 shadow-xl">
    <input
      type="text"
      value={bulkTagsValue}
      onChange={(e) => setBulkTagsValue(e.target.value)}
      placeholder="Enter tags (comma-separated)"
      className="w-64 rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200"
    />
    <p className="mt-1 text-xs text-neutral-500">e.g. "monthly, recurring"</p>
    {bulkTagsError ? (
      <p className="mt-1 text-xs text-rose-300">{bulkTagsError}</p>
    ) : null}
    <button
      type="button"
      onClick={() => void applyBulkTags()}
      disabled={!bulkTagsValue.trim() || bulkApplying}
      className="mt-2 w-full rounded-md border border-emerald-600/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300 disabled:opacity-60"
    >
      Apply to {selectedVisibleCount} transactions
    </button>
  </div>
)}
```

#### Review Action

```tsx
<button
  type="button"
  onClick={() => {
    setBulkReviewOpen(!bulkReviewOpen);
    setBulkCategoryOpen(false);
    setBulkTagsOpen(false);
  }}
  className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 transition hover:bg-neutral-800"
>
  Review
</button>

{bulkReviewOpen && (
  <div data-bulk-dropdown className="absolute top-full left-0 mt-1 z-10 rounded-lg border border-neutral-800 bg-neutral-950 p-2 shadow-xl">
    <button
      type="button"
      onClick={() => void applyBulkReview("reviewed")}
      disabled={bulkApplying}
      className="block w-full rounded-md px-3 py-2 text-left text-sm text-neutral-200 hover:bg-neutral-800"
    >
      Mark as reviewed
    </button>
    <button
      type="button"
      onClick={() => void applyBulkReview("needs_review")}
      disabled={bulkApplying}
      className="block w-full rounded-md px-3 py-2 text-left text-sm text-neutral-200 hover:bg-neutral-800"
    >
      Mark as needs review
    </button>
  </div>
)}
```

### 3. Bulk Action Handlers

**Category:**
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

**Tags:**
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

**Review:**
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

### 4. Dropdown Positioning and Behavior

Each action button needs its own relative wrapper for correct dropdown positioning:

```tsx
<div className="relative">
  <button type="button" onClick={() => setBulkCategoryOpen(!bulkCategoryOpen)}>
    Category
  </button>
  {bulkCategoryOpen && (
    <div className="absolute top-full left-0 mt-1 z-10 ...">
      {/* dropdown content */}
    </div>
  )}
</div>
```

**Click-outside-to-close:** Use `useEffect` with click listener:

```tsx
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
```

Add `data-bulk-dropdown` attribute to each dropdown wrapper.

**Keyboard accessibility:** Add Escape key handler:

```tsx
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

### 5. Empty Selection Handling

The bulk bar only appears when `hasVisibleSelection` is true, so action buttons are never shown with empty selection. No additional handling needed.

## Files to Modify

| File | Changes |
|------|---------|
| `apps/web/src/app/transactions/page.tsx` | Add delete confirmation state, bulk action states, UI components, and handlers |

## Testing

### Manual Testing

- Single delete confirmation flow (confirm and cancel)
- Confirmation clears when starting to edit a row
- Bulk category update with category selection
- Bulk tag update with valid and invalid inputs
- Bulk review status toggle
- Click-outside-to-close for dropdowns
- Escape key closes dropdowns
- API calls include correct payloads

### Automated Tests

Add tests for:
- `parseTagListInput` validation errors display in bulk tag input
- Bulk action handlers call API with correct payloads
- Dropdown state toggles correctly

### Edge Cases

- Tags validation: `parseTagListInput` returns `error` property for invalid tags (too long, invalid characters, too many tags). Display this error in the UI.
- API failure: Error message displayed via `getRequestErrorMessage`, dropdown remains open for retry.
- Concurrent actions: `bulkApplying` state disables all action buttons during API call.

## Out of Scope

- Bulk amount/date editing
- Bulk account transfer
- Undo functionality
- Bulk action history/audit log