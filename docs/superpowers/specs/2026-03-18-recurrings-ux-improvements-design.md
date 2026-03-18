# Recurrings UX Improvements

**Date:** 2026-03-18
**Branch:** recurrings-improvements
**Status:** Draft

## Summary

Improve the recurrings page UX by addressing three key gaps:
1. Add category/account dropdown fields (currently missing from edit form)
2. Add delete confirmation before destructive action
3. Make linked transactions clickable for navigation

## Background

The recurrings feature has complete backend support (CRUD, lifecycle actions, evaluation/matching) but the frontend has UX gaps:
- The edit form lacks `category_final` and `account_id` fields entirely (backend supports them)
- The create form lacks `direction` field (backend supports it)
- Transactions, import, and explorer pages all load categories/accounts for dropdown selection
- Destructive delete action has no confirmation
- Linked transactions are displayed as static text with no navigation

## Design

### 1. State Changes

**Add new state variables:**
```tsx
const [categories, setCategories] = useState<Category[]>([]);
const [accounts, setAccounts] = useState<Account[]>([]);
const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
```

**Expand `editDraft` state to include all editable fields:**
```tsx
const [editDraft, setEditDraft] = useState({
  name: "",
  cadence: "monthly" as (typeof CADENCE_OPTIONS)[number],
  amount: "",
  merchant_pattern: "",
  category_final: "",      // NEW
  account_id: "",          // NEW
  direction: "" as "" | "outflow" | "inflow"  // NEW
});
```

**Expand `createDraft` state:**
```tsx
const [createDraft, setCreateDraft] = useState({
  name: "",
  cadence: "monthly" as (typeof CADENCE_OPTIONS)[number],
  amount: "",
  direction: "" as "" | "outflow" | "inflow"  // NEW
});
```

### 2. Data Loading

**Add `loadMetadata()` function (following pattern from transactions/page.tsx):**
```tsx
async function loadMetadata() {
  try {
    const [categoriesData, accountsData] = await Promise.all([
      api.categories.list(),
      api.accounts.list()
    ]);
    setCategories(categoriesData.categories);
    setAccounts(accountsData.accounts);
  } catch {
    // Metadata loading is optional; keep page usable
  }
}
```

**Call on mount:**
```tsx
useEffect(() => {
  void loadMetadata();
  void loadRules(null);
}, []);
```

### 3. Update `loadRuleDetail()` to populate new fields

```tsx
async function loadRuleDetail(ruleId: string) {
  try {
    const response = await api.recurrings.getById(ruleId);
    const recurring = response.recurring;
    setSelectedRule(recurring);
    setEditDraft({
      name: recurring.name,
      cadence: recurring.cadence,
      amount: String(recurring.amount),
      merchant_pattern: recurring.merchant_pattern || "",
      category_final: recurring.category_final || "",      // NEW
      account_id: recurring.account_id || "",              // NEW
      direction: recurring.direction || ""                 // NEW
    });
  } catch (error) {
    // error handling
  }
}
```

### 4. Category/Account Dropdowns in Edit Form

**Category select:**
```tsx
<label className="grid gap-1 text-xs uppercase tracking-wide text-neutral-400">
  Category
  <select
    value={editDraft.category_final}
    onChange={(event) => setEditDraft((previous) => ({ ...previous, category_final: event.target.value }))}
    className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-200 outline-none transition focus:border-emerald-500"
    data-testid="recurrings-edit-category"
  >
    <option value="">Any category</option>
    {categories.map((c) => (
      <option key={c.id} value={c.name}>
        {c.emoji ? `${c.emoji} ` : ""}{c.name}
      </option>
    ))}
  </select>
</label>
```

**Account select:**
```tsx
<label className="grid gap-1 text-xs uppercase tracking-wide text-neutral-400">
  Account
  <select
    value={editDraft.account_id}
    onChange={(event) => setEditDraft((previous) => ({ ...previous, account_id: event.target.value }))}
    className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-200 outline-none transition focus:border-emerald-500"
    data-testid="recurrings-edit-account"
  >
    <option value="">Any account</option>
    {accounts.map((a) => (
      <option key={a.id} value={a.id}>{a.displayName}</option>
    ))}
  </select>
</label>
```

**Direction select:**
```tsx
<label className="grid gap-1 text-xs uppercase tracking-wide text-neutral-400">
  Direction
  <select
    value={editDraft.direction}
    onChange={(event) => setEditDraft((previous) => ({ ...previous, direction: event.target.value as "" | "outflow" | "inflow" }))}
    className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-200 outline-none transition focus:border-emerald-500"
    data-testid="recurrings-edit-direction"
  >
    <option value="">Any direction</option>
    <option value="outflow">Outflow (expense)</option>
    <option value="inflow">Inflow (income)</option>
  </select>
</label>
```

### 5. Update `saveRuleEdits()` to include new fields

```tsx
async function saveRuleEdits() {
  if (!selectedRuleId) return;

  const amount = Number(editDraft.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    setMessage("Recurring amount must be greater than zero.");
    return;
  }

  setSaving(true);
  try {
    await api.recurrings.update(selectedRuleId, {
      name: editDraft.name.trim(),
      cadence: editDraft.cadence,
      amount,
      merchant_pattern: editDraft.merchant_pattern.trim() || null,
      category_final: editDraft.category_final || null,    // NEW
      account_id: editDraft.account_id || null,            // NEW
      direction: editDraft.direction || null               // NEW
    });
    setMessage("Recurring rule updated.");
    await Promise.all([loadRules(selectedRuleId), loadRuleDetail(selectedRuleId)]);
  } catch (error) {
    // error handling
  } finally {
    setSaving(false);
  }
}
```

### 6. Direction in Create Form

**Add direction selector to create form:**
```tsx
<label className="grid gap-1 text-xs uppercase tracking-wide text-neutral-400">
  Direction
  <select
    value={createDraft.direction}
    onChange={(event) => setCreateDraft((previous) => ({ ...previous, direction: event.target.value as "" | "outflow" | "inflow" }))}
    className="rounded-lg border border-neutral-800 bg-neutral-950 px-2 py-1 text-xs text-neutral-200 outline-none transition focus:border-emerald-500"
    data-testid="recurrings-create-direction"
  >
    <option value="">Any</option>
    <option value="outflow">Outflow</option>
    <option value="inflow">Inflow</option>
  </select>
</label>
```

**Update `createRule()` to include direction:**
```tsx
await api.recurrings.create({
  name: createDraft.name.trim(),
  cadence: createDraft.cadence,
  amount,
  direction: createDraft.direction || undefined    // NEW
});
```

### 7. Delete Confirmation

**Current:** Immediate deletion on button click.

**Proposed:** Two-step inline confirmation.

**State:**
```tsx
const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
```

**UI Flow:**
1. First click sets `deleteConfirmId` to the rule ID
2. Button changes to confirm/cancel buttons
3. Second click (on confirm) executes deletion
4. Cancel clears `deleteConfirmId`
5. Selecting a different rule also clears `deleteConfirmId`

**Implementation:**
```tsx
{deleteConfirmId === selectedRuleId ? (
  <div className="flex gap-2">
    <button
      type="button"
      onClick={() => void runLifecycleAction("remove")}
      disabled={saving}
      className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-600 bg-rose-950/60 px-3 py-2 text-sm text-rose-200 transition hover:bg-rose-900/40 disabled:opacity-60"
      data-testid="recurrings-delete-confirm"
    >
      Confirm delete?
    </button>
    <button
      type="button"
      onClick={() => setDeleteConfirmId(null)}
      disabled={saving}
      className="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 transition hover:bg-neutral-800 disabled:opacity-60"
      data-testid="recurrings-delete-cancel"
    >
      Cancel
    </button>
  </div>
) : (
  <button
    type="button"
    onClick={() => setDeleteConfirmId(selectedRuleId)}
    disabled={saving}
    className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-700/70 bg-rose-950/40 px-3 py-2 text-sm text-rose-200 transition hover:bg-rose-900/40 disabled:opacity-60"
    data-testid="recurrings-delete"
  >
    <Trash2 className="h-4 w-4" /> Delete
  </button>
)}
```

**Clear confirmation on rule change:**
```tsx
useEffect(() => {
  if (selectedRuleId !== deleteConfirmId) {
    setDeleteConfirmId(null);
  }
}, [selectedRuleId]);
```

### 8. Transactions Page Filter Support

The linked transactions feature requires adding `recurring_rule_id` filter support to the transactions page.

**File: `apps/web/src/app/transactions/filters.ts`**

**Add to `TransactionsFilterState` interface:**
```tsx
export interface TransactionsFilterState {
  // ... existing fields
  recurringRuleId: string;    // NEW
}
```

**Add to `TransactionsListApiParams` interface:**
```tsx
export interface TransactionsListApiParams {
  // ... existing fields
  recurring_rule_id?: string;    // NEW
}
```

**Update `createDefaultTransactionsFilterState()`:**
```tsx
return {
  // ... existing defaults
  recurringRuleId: "",    // NEW
};
```

**Update `parseTransactionsFilterState()`:**
```tsx
return {
  // ... existing parsing
  recurringRuleId: cleanValue(searchParams.get("recurring_rule_id")),    // NEW
};
```

**Update `toTransactionsListApiParams()`:**
```tsx
if (filters.recurringRuleId) {
  params.recurring_rule_id = filters.recurringRuleId;
}
```

**Update `buildTransactionsFilterSearchParams()`:**
```tsx
if (filters.recurringRuleId) {
  searchParams.set("recurring_rule_id", filters.recurringRuleId);
}
```

**Update `toValidFilterState()`:**
```tsx
const next: TransactionsFilterState = {
  // ... existing fields
  recurringRuleId: cleanValue(filters.recurringRuleId),
};
```

### 9. Clickable Linked Transactions

**Current:**
```tsx
<div key={entry.id} className="flex items-center justify-between ...">
  <span>{entry.transaction_date} · {entry.merchant_raw}</span>
  <span className="font-medium text-neutral-100">{money(entry.amount)}</span>
</div>
```

**Proposed:** Wrap in Next.js Link to navigate to transactions filtered by rule.

```tsx
import Link from "next/link";

<Link
  key={entry.id}
  href={`/transactions?recurring_rule_id=${selectedRuleId}`}
  className="flex items-center justify-between rounded-md bg-neutral-900/70 px-3 py-2 text-sm text-neutral-300 transition hover:bg-neutral-800/70"
>
  <span>{entry.transaction_date} · {entry.merchant_raw}</span>
  <span className="font-medium text-neutral-100">{money(entry.amount)}</span>
</Link>
```

This navigates to the transactions page showing all transactions linked to this rule.

### 10. Helper Text

Add helper text below amount fields in both create and edit forms:

```tsx
<p className="text-xs text-neutral-500">Matches transactions within ±$0.01 of this amount</p>
```

## Files to Modify

| File | Changes |
|------|---------|
| `apps/web/src/app/recurrings/page.tsx` | State changes, dropdowns, delete confirmation, linked transactions |
| `apps/web/src/app/transactions/filters.ts` | Add `recurring_rule_id` filter support |

## Testing

- Manual testing of dropdown population
- Verify delete confirmation flow (confirm and cancel)
- Test navigation from linked transactions
- Verify category/account/direction saved correctly
- Ensure existing API tests still pass

## Out of Scope

- Match preview / dry-run evaluation
- Bulk actions
- Fuzzy merchant matching
- Timezone handling improvements