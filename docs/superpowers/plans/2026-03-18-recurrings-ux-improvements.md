# Recurrings UX Improvements Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add category/account dropdowns, delete confirmation, and clickable linked transactions to the recurrings page.

**Architecture:** Frontend-only changes to two files. Add `recurringRuleId` filter support to transactions filter system, then update recurrings page with dropdowns populated from API, inline delete confirmation, and Next.js Link navigation.

**Tech Stack:** React, TypeScript, Next.js, Node.js test runner

---

## File Structure

| File | Purpose |
|------|---------|
| `apps/web/src/app/transactions/filters.ts` | Add `recurringRuleId` filter support |
| `apps/web/src/app/transactions/filters.test.ts` | Tests for recurring_rule_id filter |
| `apps/web/src/app/recurrings/page.tsx` | Main page with all UX improvements |

---

## Chunk 1: Transactions Filter Support

### Task 1: Add recurring_rule_id to Filter Types and Functions

**Files:**
- Modify: `apps/web/src/app/transactions/filters.ts`
- Modify: `apps/web/src/app/transactions/filters.test.ts`

- [ ] **Step 1: Write the failing test for recurringRuleId in defaults**

```typescript
// In filters.test.ts, update the existing test for createDefaultTransactionsFilterState
test("createDefaultTransactionsFilterState returns expected defaults", () => {
  assert.deepEqual(createDefaultTransactionsFilterState(), {
    query: "",
    categories: [],
    accounts: [],
    minAmount: "",
    maxAmount: "",
    range: "all",
    start: "",
    end: "",
    categoryView: "granular",
    transactionTypes: [],
    tag: "",
    page: 1,
    recurringRuleId: ""
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/ihelio/code/minance2/apps/web && NODE_ENV=test npx tsx --test src/app/transactions/filters.test.ts`
Expected: FAIL - "recurringRuleId" not in returned object

- [ ] **Step 3: Add recurringRuleId to TransactionsFilterState interface**

Replace the interface (lines 6-19):
```typescript
export interface TransactionsFilterState {
  query: string;
  categories: string[];
  accounts: string[];
  minAmount: string;
  maxAmount: string;
  range: string;
  start: string;
  end: string;
  categoryView: TransactionCategoryView;
  transactionTypes: TransactionTypeFilter[];
  tag: string;
  page: number;
  recurringRuleId: string;
}
```

- [ ] **Step 4: Add recurring_rule_id to TransactionsListApiParams interface**

Replace the interface (lines 21-35):
```typescript
export interface TransactionsListApiParams {
  query?: string;
  category?: string[];
  account?: string[];
  min_amount?: number;
  max_amount?: number;
  range?: string;
  start?: string;
  end?: string;
  category_view: TransactionCategoryView;
  transaction_type?: TransactionTypeFilter[];
  tag?: string;
  limit: number;
  offset: number;
  recurring_rule_id?: string;
}
```

- [ ] **Step 5: Update createDefaultTransactionsFilterState**

```typescript
// In filters.ts, update the function
export function createDefaultTransactionsFilterState(): TransactionsFilterState {
  return {
    query: "",
    categories: [],
    accounts: [],
    minAmount: "",
    maxAmount: "",
    range: "all",
    start: "",
    end: "",
    categoryView: "granular",
    transactionTypes: [],
    tag: "",
    page: 1,
    recurringRuleId: ""
  };
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd /Users/ihelio/code/minance2/apps/web && NODE_ENV=test npx tsx --test src/app/transactions/filters.test.ts`
Expected: PASS for createDefaultTransactionsFilterState test

- [ ] **Step 7: Write test for parseTransactionsFilterState with recurring_rule_id**

```typescript
// In filters.test.ts, add new test
test("parseTransactionsFilterState reads recurring_rule_id parameter", () => {
  const parsed = parseTransactionsFilterState(
    new URLSearchParams("recurring_rule_id=rrule_abc123")
  );
  assert.equal(parsed.recurringRuleId, "rrule_abc123");
});
```

- [ ] **Step 8: Run test to verify it fails**

Run: `cd /Users/ihelio/code/minance2/apps/web && NODE_ENV=test npx tsx --test src/app/transactions/filters.test.ts`
Expected: FAIL - recurringRuleId is ""

- [ ] **Step 9: Update parseTransactionsFilterState**

```typescript
// In filters.ts, update the function - add to the return object
export function parseTransactionsFilterState(searchParams: SearchParamsLike): TransactionsFilterState {
  const defaults = createDefaultTransactionsFilterState();

  const range = cleanValue(searchParams.get("range"));
  const categoryView = cleanValue(searchParams.get("category_view"));

  return {
    query: cleanValue(searchParams.get("query")),
    categories: cleanStringList(searchParams.getAll("category")),
    accounts: cleanStringList(searchParams.getAll("account")),
    minAmount: cleanAmountValue(searchParams.get("min_amount")),
    maxAmount: cleanAmountValue(searchParams.get("max_amount")),
    range: RANGE_VALUES.has(range) ? range : defaults.range,
    start: cleanIsoDate(searchParams.get("start")),
    end: cleanIsoDate(searchParams.get("end")),
    categoryView: CATEGORY_VIEW_VALUES.has(categoryView)
      ? (categoryView as TransactionCategoryView)
      : defaults.categoryView,
    transactionTypes: cleanTransactionTypes(searchParams.getAll("type")),
    tag: cleanValue(searchParams.get("tag")),
    page: cleanPositiveInteger(searchParams.get("page"), defaults.page),
    recurringRuleId: cleanValue(searchParams.get("recurring_rule_id"))
  };
}
```

- [ ] **Step 10: Run test to verify it passes**

Run: `cd /Users/ihelio/code/minance2/apps/web && NODE_ENV=test npx tsx --test src/app/transactions/filters.test.ts`
Expected: PASS

- [ ] **Step 11: Write test for toTransactionsListApiParams with recurringRuleId**

```typescript
// In filters.test.ts, update the existing test
test("toTransactionsListApiParams serializes custom date mode and semantic filters", () => {
  const params = toTransactionsListApiParams({
    query: "rent",
    categories: ["Housing", "Travel"],
    accounts: ["fixture-checking", "travel-card"],
    minAmount: "25",
    maxAmount: "150",
    range: "custom",
    start: "2026-01-01",
    end: "2026-01-31",
    categoryView: "coarse",
    transactionTypes: ["expense", "transfer"],
    tag: "monthly",
    page: 3,
    recurringRuleId: "rrule_xyz"
  });

  assert.deepEqual(params, {
    query: "rent",
    category: ["Housing", "Travel"],
    account: ["fixture-checking", "travel-card"],
    min_amount: 25,
    max_amount: 150,
    start: "2026-01-01",
    end: "2026-01-31",
    category_view: "coarse",
    transaction_type: ["expense", "transfer"],
    tag: "monthly",
    limit: 50,
    offset: 100,
    recurring_rule_id: "rrule_xyz"
  });
});
```

- [ ] **Step 12: Run test to verify it fails**

Run: `cd /Users/ihelio/code/minance2/apps/web && NODE_ENV=test npx tsx --test src/app/transactions/filters.test.ts`
Expected: FAIL - recurring_rule_id not in params

- [ ] **Step 13: Update toTransactionsListApiParams**

```typescript
// In filters.ts, update the function - add before the return statement
export function toTransactionsListApiParams(filters: TransactionsFilterState): TransactionsListApiParams {
  const safePage = Math.max(1, Number.isFinite(filters.page) ? Math.trunc(filters.page) : 1);
  const params: TransactionsListApiParams = {
    category_view: filters.categoryView,
    limit: TRANSACTIONS_PAGE_SIZE,
    offset: (safePage - 1) * TRANSACTIONS_PAGE_SIZE
  };

  if (filters.query) {
    params.query = filters.query;
  }
  if (filters.categories.length) {
    params.category = filters.categories;
  }
  if (filters.accounts.length) {
    params.account = filters.accounts;
  }
  if (filters.minAmount) {
    params.min_amount = Number(filters.minAmount);
  }
  if (filters.maxAmount) {
    params.max_amount = Number(filters.maxAmount);
  }
  if (filters.transactionTypes.length) {
    params.transaction_type = filters.transactionTypes;
  }
  if (filters.tag) {
    params.tag = filters.tag;
  }
  if (filters.recurringRuleId) {
    params.recurring_rule_id = filters.recurringRuleId;
  }

  if (filters.range === "custom") {
    if (filters.start) {
      params.start = filters.start;
    }
    if (filters.end) {
      params.end = filters.end;
    }
  } else {
    params.range = filters.range;
  }

  return params;
}
```

- [ ] **Step 14: Run test to verify it passes**

Run: `cd /Users/ihelio/code/minance2/apps/web && NODE_ENV=test npx tsx --test src/app/transactions/filters.test.ts`
Expected: PASS

- [ ] **Step 15: Write test for buildTransactionsFilterSearchParams with recurringRuleId**

```typescript
// In filters.test.ts, update the existing test
test("buildTransactionsFilterSearchParams writes only non-default tokens", () => {
  const searchParams = buildTransactionsFilterSearchParams({
    ...createDefaultTransactionsFilterState(),
    query: "Transfer",
    categories: ["Dining", "Groceries"],
    accounts: ["primary-checking", "travel-card"],
    minAmount: "15",
    maxAmount: "120",
    range: "custom",
    start: "2026-01-01",
    end: "2026-01-31",
    transactionTypes: ["expense", "transfer"],
    page: 4,
    recurringRuleId: "rrule_test"
  });

  assert.equal(
    searchParams.toString(),
    "query=Transfer&category=Dining&category=Groceries&account=primary-checking&account=travel-card&min_amount=15&max_amount=120&range=custom&start=2026-01-01&end=2026-01-31&type=expense&type=transfer&page=4&recurring_rule_id=rrule_test"
  );
});
```

- [ ] **Step 16: Run test to verify it fails**

Run: `cd /Users/ihelio/code/minance2/apps/web && NODE_ENV=test npx tsx --test src/app/transactions/filters.test.ts`
Expected: FAIL - recurring_rule_id not in searchParams

- [ ] **Step 17: Update buildTransactionsFilterSearchParams**

```typescript
// In filters.ts, update the function - add before the return statement
export function buildTransactionsFilterSearchParams(filters: TransactionsFilterState): URLSearchParams {
  const defaults = createDefaultTransactionsFilterState();
  const searchParams = new URLSearchParams();

  if (filters.query) {
    searchParams.set("query", filters.query);
  }
  for (const category of filters.categories) {
    searchParams.append("category", category);
  }
  for (const account of filters.accounts) {
    searchParams.append("account", account);
  }
  if (filters.minAmount) {
    searchParams.set("min_amount", filters.minAmount);
  }
  if (filters.maxAmount) {
    searchParams.set("max_amount", filters.maxAmount);
  }
  if (filters.tag) {
    searchParams.set("tag", filters.tag);
  }

  if (filters.range !== defaults.range) {
    searchParams.set("range", filters.range);
  }

  if (filters.range === "custom") {
    if (filters.start) {
      searchParams.set("start", filters.start);
    }
    if (filters.end) {
      searchParams.set("end", filters.end);
    }
  }

  if (filters.categoryView !== defaults.categoryView) {
    searchParams.set("category_view", filters.categoryView);
  }

  for (const transactionType of filters.transactionTypes) {
    searchParams.append("type", transactionType);
  }

  if (filters.page > defaults.page) {
    searchParams.set("page", String(filters.page));
  }

  if (filters.recurringRuleId) {
    searchParams.set("recurring_rule_id", filters.recurringRuleId);
  }

  return searchParams;
}
```

- [ ] **Step 18: Run test to verify it passes**

Run: `cd /Users/ihelio/code/minance2/apps/web && NODE_ENV=test npx tsx --test src/app/transactions/filters.test.ts`
Expected: PASS

- [ ] **Step 19: Write test for toValidFilterState with recurringRuleId**

```typescript
// In filters.test.ts, update the existing test
test("toValidFilterState trims values and clears custom dates when not in custom range", () => {
  const validated = toValidFilterState({
    query: "  Rent  ",
    categories: ["  Housing  ", "Travel", "Housing"],
    accounts: [" fixture-checking ", "travel-card", "fixture-checking"],
    minAmount: " 20.5 ",
    maxAmount: " 140 ",
    range: "90d",
    start: "2026-01-01",
    end: "2026-01-31",
    categoryView: "granular",
    transactionTypes: ["expense", "transfer", "expense"],
    tag: "  monthly  ",
    page: 0,
    recurringRuleId: "  rrule_123  "
  });

  assert.deepEqual(validated, {
    query: "Rent",
    categories: ["Housing", "Travel"],
    accounts: ["fixture-checking", "travel-card"],
    minAmount: "20.5",
    maxAmount: "140",
    range: "90d",
    start: "",
    end: "",
    categoryView: "granular",
    transactionTypes: ["expense", "transfer"],
    tag: "monthly",
    page: 1,
    recurringRuleId: "rrule_123"
  });
});
```

- [ ] **Step 20: Run test to verify it fails**

Run: `cd /Users/ihelio/code/minance2/apps/web && NODE_ENV=test npx tsx --test src/app/transactions/filters.test.ts`
Expected: FAIL - recurringRuleId not trimmed

- [ ] **Step 21: Update toValidFilterState**

```typescript
// In filters.ts, update the function
export function toValidFilterState(filters: TransactionsFilterState): TransactionsFilterState {
  const next: TransactionsFilterState = {
    query: cleanValue(filters.query),
    categories: cleanStringList(filters.categories),
    accounts: cleanStringList(filters.accounts),
    minAmount: cleanAmountValue(filters.minAmount),
    maxAmount: cleanAmountValue(filters.maxAmount),
    range: filters.range,
    start: cleanIsoDate(filters.start),
    end: cleanIsoDate(filters.end),
    categoryView: filters.categoryView,
    transactionTypes: cleanTransactionTypes(filters.transactionTypes),
    tag: cleanValue(filters.tag),
    page: Math.max(1, Number.isFinite(filters.page) ? Math.trunc(filters.page) : 1),
    recurringRuleId: cleanValue(filters.recurringRuleId)
  };

  if (!RANGE_VALUES.has(next.range)) {
    next.range = "all";
  }
  if (!CATEGORY_VIEW_VALUES.has(next.categoryView)) {
    next.categoryView = "granular";
  }

  if (next.range !== "custom") {
    next.start = "";
    next.end = "";
  }

  if (next.minAmount && next.maxAmount && Number(next.minAmount) > Number(next.maxAmount)) {
    next.maxAmount = next.minAmount;
  }

  return next;
}
```

- [ ] **Step 22: Run all filter tests to verify they pass**

Run: `cd /Users/ihelio/code/minance2/apps/web && NODE_ENV=test npx tsx --test src/app/transactions/filters.test.ts`
Expected: All tests PASS

- [ ] **Step 23: Commit filter changes**

```bash
git add apps/web/src/app/transactions/filters.ts apps/web/src/app/transactions/filters.test.ts
git commit -m "feat(transactions): add recurring_rule_id filter support

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 2: Recurrings Page State and Data Loading

### Task 2: Add State Variables and Load Metadata

**Files:**
- Modify: `apps/web/src/app/recurrings/page.tsx`

- [ ] **Step 1: Add imports for Category and Account types**

At line 6, update the import:
```typescript
import type { Account, Category, RecurringMatch, RecurringRule } from "@/lib/api/types";
```

- [ ] **Step 2: Add new state variables after existing state**

After line 37 (after `const [message, setMessage] = useState("");`), add:
```typescript
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
```

- [ ] **Step 3: Expand createDraft state to include direction**

Update lines 39-43:
```typescript
  const [createDraft, setCreateDraft] = useState({
    name: "",
    cadence: "monthly" as (typeof CADENCE_OPTIONS)[number],
    amount: "",
    direction: "" as "" | "outflow" | "inflow"
  });
```

- [ ] **Step 4: Expand editDraft state to include all fields**

Update lines 45-50:
```typescript
  const [editDraft, setEditDraft] = useState({
    name: "",
    cadence: "monthly" as (typeof CADENCE_OPTIONS)[number],
    amount: "",
    merchant_pattern: "",
    category_final: "",
    account_id: "",
    direction: "" as "" | "outflow" | "inflow"
  });
```

- [ ] **Step 5: Add loadMetadata function after loadRuleDetail**

After line 102, add:
```typescript
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

- [ ] **Step 6: Add new useEffect for mount (after state declarations)**

The current page has no mount useEffect. Add a new one AFTER line 37 (state declarations) and BEFORE the existing useEffect at lines 104-107:
```typescript
  useEffect(() => {
    void loadMetadata();
    void loadRules(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
```

Note: Do NOT modify the existing `statusFilter` useEffect at lines 104-107 - that one remains unchanged.

- [ ] **Step 7: Update loadRuleDetail to populate new fields**

Update lines 84-102:
```typescript
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
        category_final: recurring.category_final || "",
        account_id: recurring.account_id || "",
        direction: recurring.direction || ""
      });
    } catch (error) {
      if (error instanceof ApiError) {
        setMessage(error.message);
      } else {
        setMessage("Failed to load recurring detail.");
      }
    }
  }
```

- [ ] **Step 8: Add useEffect to clear delete confirmation on rule change**

After the existing useEffect at lines 109-116, add:
```typescript
  useEffect(() => {
    setDeleteConfirmId(null);
  }, [selectedRuleId]);
```

- [ ] **Step 9: Commit state changes**

```bash
git add apps/web/src/app/recurrings/page.tsx
git commit -m "feat(recurrings): add state for categories, accounts, and delete confirmation

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 3: Update API Calls for New Fields

### Task 3: Update createRule and saveRuleEdits Functions

**Files:**
- Modify: `apps/web/src/app/recurrings/page.tsx`

- [ ] **Step 1: Update createRule to include direction**

Update lines 118-154:
```typescript
  async function createRule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!createDraft.name.trim()) {
      setMessage("Rule name is required.");
      return;
    }

    const amount = Number(createDraft.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage("Recurring amount must be greater than zero.");
      return;
    }

    setSaving(true);
    try {
      const response = await api.recurrings.create({
        name: createDraft.name.trim(),
        cadence: createDraft.cadence,
        amount,
        direction: createDraft.direction || undefined
      });
      setCreateDraft({
        name: "",
        cadence: "monthly",
        amount: "",
        direction: ""
      });
      setMessage("Recurring rule created.");
      await loadRules(response.recurring.id);
    } catch (error) {
      if (error instanceof ApiError) {
        setMessage(error.message);
      } else {
        setMessage("Failed to create recurring rule.");
      }
    } finally {
      setSaving(false);
    }
  }
```

- [ ] **Step 2: Update saveRuleEdits to include new fields**

Update lines 156-186:
```typescript
  async function saveRuleEdits() {
    if (!selectedRuleId) {
      return;
    }

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
        category_final: editDraft.category_final || null,
        account_id: editDraft.account_id || null,
        direction: editDraft.direction || null
      });
      setMessage("Recurring rule updated.");
      await Promise.all([loadRules(selectedRuleId), loadRuleDetail(selectedRuleId)]);
    } catch (error) {
      if (error instanceof ApiError) {
        setMessage(error.message);
      } else {
        setMessage("Failed to update recurring rule.");
      }
    } finally {
      setSaving(false);
    }
  }
```

- [ ] **Step 3: Update runLifecycleAction to clear delete confirmation after removal**

Update the "remove" case in lines 227-233:
```typescript
      } else {
        await api.recurrings.remove(selectedRuleId);
        setMessage("Recurring rule deleted.");
        setDeleteConfirmId(null);
        setSelectedRuleId(null);
        setSelectedRule(null);
        setMatches([]);
      }
```

- [ ] **Step 4: Commit API call updates**

```bash
git add apps/web/src/app/recurrings/page.tsx
git commit -m "feat(recurrings): include direction, category, account in API calls

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 4: Add Dropdown UI Elements

### Task 4: Add Direction to Create Form

**Files:**
- Modify: `apps/web/src/app/recurrings/page.tsx`

- [ ] **Step 1: Add Link import for navigation**

At line 1-4, add Link import:
```typescript
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Archive, Link2, PauseCircle, PlayCircle, Plus, Repeat2, Trash2 } from "lucide-react";
```

- [ ] **Step 2: Update create form grid to accommodate direction selector**

Update the form grid class (around line 290) to have 5 columns:
```typescript
        <form onSubmit={createRule} className="mb-4 grid gap-2 rounded-xl border border-neutral-800 bg-neutral-900/60 p-3 md:grid-cols-[1.2fr_1fr_1fr_1fr_auto]">
```

- [ ] **Step 3: Add direction selector to create form**

After the amount input (around line 308-315), add a new select before the submit button:
```typescript
          <select
            value={createDraft.direction}
            onChange={(event) => setCreateDraft((previous) => ({ ...previous, direction: event.target.value as "" | "outflow" | "inflow" }))}
            className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-200 outline-none transition focus:border-emerald-500"
            data-testid="recurrings-create-direction"
          >
            <option value="">Any direction</option>
            <option value="outflow">Outflow</option>
            <option value="inflow">Inflow</option>
          </select>
```

The create form will now have 5 elements: name input, cadence select, amount input, direction select, submit button.

- [ ] **Step 4: Add helper text below amount input**

After the amount input, add:
```typescript
            <p className="text-xs text-neutral-500">Matches within ±$0.01</p>
```

- [ ] **Step 5: Commit create form changes**

```bash
git add apps/web/src/app/recurrings/page.tsx
git commit -m "feat(recurrings): add direction selector to create form

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

### Task 5: Add Category/Account/Direction Dropdowns to Edit Form

**Files:**
- Modify: `apps/web/src/app/recurrings/page.tsx`

- [ ] **Step 1: Add Category dropdown after merchant_pattern input**

In the edit form grid (around line 408), add after merchant_pattern:
```typescript
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

- [ ] **Step 2: Add Account dropdown**

```typescript
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

- [ ] **Step 3: Add Direction dropdown**

```typescript
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

- [ ] **Step 4: Update edit form grid to 3 columns**

Update the grid class (around line 367):
```typescript
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
```

- [ ] **Step 5: Add helper text below amount in edit form**

After the amount input in edit form, add:
```typescript
                    <p className="text-xs text-neutral-500">Matches within ±$0.01</p>
```

- [ ] **Step 6: Commit edit form dropdowns**

```bash
git add apps/web/src/app/recurrings/page.tsx
git commit -m "feat(recurrings): add category, account, direction dropdowns to edit form

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 5: Delete Confirmation and Linked Transactions

### Task 6: Add Delete Confirmation UI

**Files:**
- Modify: `apps/web/src/app/recurrings/page.tsx`

- [ ] **Step 1: Replace delete button with confirmation UI**

Find the delete button (around line 460-468) and replace:
```typescript
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

- [ ] **Step 2: Commit delete confirmation**

```bash
git add apps/web/src/app/recurrings/page.tsx
git commit -m "feat(recurrings): add delete confirmation UI

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

### Task 7: Make Linked Transactions Clickable

**Files:**
- Modify: `apps/web/src/app/recurrings/page.tsx`

- [ ] **Step 1: Replace matches list with Link components**

Find the matches display (around line 482-490) and replace:
```typescript
                  {matches.length ? (
                    <div className="space-y-2">
                      {matches.map((entry) => (
                        <Link
                          key={entry.id}
                          href={`/transactions?recurring_rule_id=${selectedRuleId}`}
                          className="flex items-center justify-between rounded-md bg-neutral-900/70 px-3 py-2 text-sm text-neutral-300 transition hover:bg-neutral-800/70"
                        >
                          <span>{entry.transaction_date} · {entry.merchant_raw}</span>
                          <span className="font-medium text-neutral-100">{money(entry.amount)}</span>
                        </Link>
                      ))}
                    </div>
                  ) : selectedLinkedIds.length ? (
```

- [ ] **Step 2: Commit clickable linked transactions**

```bash
git add apps/web/src/app/recurrings/page.tsx
git commit -m "feat(recurrings): make linked transactions clickable

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 6: Final Verification

### Task 8: Run Tests and Verify

- [ ] **Step 1: Run all filter tests**

Run: `cd /Users/ihelio/code/minance2/apps/web && NODE_ENV=test npx tsx --test src/app/transactions/filters.test.ts`
Expected: All tests PASS

- [ ] **Step 2: Run API recurrings tests**

Run: `cd /Users/ihelio/code/minance2/services/api && NODE_ENV=test npx tsx --test test/recurrings.test.ts`
Expected: All tests PASS

- [ ] **Step 3: Run TypeScript check**

Run: `cd /Users/ihelio/code/minance2 && pnpm --filter @minance/web exec tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Manual testing checklist**

1. Navigate to /recurrings page
2. Create a new rule with direction selected
3. Edit a rule, change category/account/direction
4. Click delete, verify confirmation appears
5. Click cancel, verify confirmation dismisses
6. Click delete again, then confirm, verify rule is deleted
7. Evaluate a rule with matches
8. Click a linked transaction, verify navigation to transactions page with filter

- [ ] **Step 5: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix(recurrings): address any issues found in testing

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```