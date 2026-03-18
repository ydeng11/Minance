# Recurrings Improvements Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Recurrings page into a useful settings feature that integrates with Dashboard, Transactions, and Explorer by making "Recurring Spend" rule-based and adding suggestions for discovery.

**Architecture:** Server-side detection runs on transaction import, storing suggestions in a new collection. Dashboard/Explorer display rule-based recurring spend with a subtle callout for untracked suggestions. Recurrings page gains suggestions section, monthly/yearly totals, and expanded rule fields. Transactions page gets recurring filter, badge, and create-rule action.

**Tech Stack:** TypeScript, Node.js, React, Next.js, node:test

---

## File Structure

**Backend (new):**
- `services/api/src/recurring-suggestions.ts` - Detection logic, suggestions CRUD
- `services/api/test/recurring-suggestions.test.ts` - Tests

**Backend (modify):**
- `services/api/src/store.ts` - Add `recurringSuggestions` and `dismissedRecurringSuggestions` to defaultStore
- `services/api/src/recurrings.ts` - Add dismissed registry entry on rule delete
- `services/api/src/analytics.ts` - Change `recurringSpend` to rule-based calculation
- `services/api/src/server.ts` - Add suggestions API routes
- `services/api/src/imports.ts` - Hook detection into import completion

**Frontend (new):**
- `apps/web/src/components/recurrings/SuggestionsSection.tsx` - Suggestions list with create/dismiss
- `apps/web/src/components/recurrings/RecurringTotalsBand.tsx` - Monthly/yearly totals display
- `apps/web/src/components/recurrings/SuggestionsCallout.tsx` - Small callout for Dashboard/Explorer

**Frontend (modify):**
- `apps/web/src/lib/api/types.ts` - Add suggestion types
- `apps/web/src/lib/api/endpoints.ts` - Add suggestions API client
- `apps/web/src/app/recurrings/page.tsx` - Add suggestions, totals, expanded fields
- `apps/web/src/app/transactions/filters.ts` - Add recurring filter
- `apps/web/src/app/transactions/page.tsx` - Add recurring badge, create-rule action
- `apps/web/src/app/page.tsx` - Add suggestions callout to Dashboard
- `apps/web/src/app/explorer/components/ExplorerSummaryBand.tsx` - Add suggestions callout

---

## Chunk 1: Backend Foundation - Store & Types

### Task 1: Add new collections to store

**Files:**
- Modify: `services/api/src/store.ts:11-32`
- Test: `services/api/test/recurring-suggestions.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// test/recurring-suggestions.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { loadStore, resetStoreForTests } from "../src/store.ts";

test("store includes recurringSuggestions and dismissedRecurringSuggestions collections", () => {
  resetStoreForTests({});
  const store = loadStore();

  assert.ok(Array.isArray(store.recurringSuggestions), "recurringSuggestions should be an array");
  assert.ok(Array.isArray(store.dismissedRecurringSuggestions), "dismissedRecurringSuggestions should be an array");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd services/api && node --test test/recurring-suggestions.test.ts`
Expected: FAIL with "Cannot read properties of undefined (reading 'recurringSuggestions')" or similar

- [ ] **Step 3: Add collections to defaultStore**

```typescript
// store.ts - update defaultStore
const defaultStore = {
  users: [],
  sessions: [],
  accounts: [],
  transactions: [],
  recurringRules: [],
  recurringSuggestions: [],           // NEW
  dismissedRecurringSuggestions: [],  // NEW
  investmentHoldings: [],
  investmentSnapshots: [],
  categories: [],
  categoryStrategies: [],
  categoryRules: [],
  imports: [],
  importRowsRaw: [],
  importRowsProcessed: [],
  importRowDiagnostics: [],
  aiProviderCredentials: [],
  aiProviderPreferences: [],
  assistantQueries: [],
  savedViews: [],
  migrationRuns: [],
  auditEvents: []
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd services/api && node --test test/recurring-suggestions.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add services/api/src/store.ts services/api/test/recurring-suggestions.test.ts
git commit -m "feat(store): add recurringSuggestions and dismissedRecurringSuggestions collections"
```

---

### Task 2: Create recurring-suggestions module with detection logic

**Files:**
- Create: `services/api/src/recurring-suggestions.ts`
- Test: `services/api/test/recurring-suggestions.test.ts`

- [ ] **Step 1: Write the failing test for detection**

```typescript
// Add to test/recurring-suggestions.test.ts
import { detectRecurringSuggestions, listRecurringSuggestions } from "../src/recurring-suggestions.ts";

const USER_ID = "user_suggestions_1";
const ACCOUNT_ID = "acct_suggestions_1";

function resetForSuggestions(transactions = []) {
  resetStoreForTests({
    users: [{ id: USER_ID, email: "suggestions@example.com", passwordHash: "h", salt: "s", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }],
    accounts: [{ id: ACCOUNT_ID, userId: USER_ID, normalizedKey: "checking", displayName: "Checking", accountType: "checking", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }],
    transactions
  });
}

test("detectRecurringSuggestions finds merchants appearing in 2+ months", () => {
  resetForSuggestions([
    { id: "t1", user_id: USER_ID, account_id: ACCOUNT_ID, transaction_date: "2026-01-15", merchant_raw: "Netflix", merchant_normalized: "netflix", description: "", amount: -15.99, direction: "outflow", category_final: "Entertainment", created_at: "2026-01-15T00:00:00Z", updated_at: "2026-01-15T00:00:00Z" },
    { id: "t2", user_id: USER_ID, account_id: ACCOUNT_ID, transaction_date: "2026-02-15", merchant_raw: "Netflix", merchant_normalized: "netflix", description: "", amount: -15.99, direction: "outflow", category_final: "Entertainment", created_at: "2026-02-15T00:00:00Z", updated_at: "2026-02-15T00:00:00Z" },
    { id: "t3", user_id: USER_ID, account_id: ACCOUNT_ID, transaction_date: "2026-01-10", merchant_raw: "Coffee Shop", merchant_normalized: "coffee shop", description: "", amount: -5.00, direction: "outflow", category_final: "Dining", created_at: "2026-01-10T00:00:00Z", updated_at: "2026-01-10T00:00:00Z" }
  ]);

  const result = detectRecurringSuggestions(USER_ID);

  assert.equal(result.length, 1);
  assert.equal(result[0].merchant_pattern, "netflix");
  assert.equal(result[0].amount, 15.99);
  assert.equal(result[0].occurrence_count, 2);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd services/api && node --test test/recurring-suggestions.test.ts`
Expected: FAIL - module not found

- [ ] **Step 3: Create the detection function**

```typescript
// services/api/src/recurring-suggestions.ts
import { loadStore, saveStore, addAuditEvent } from "./store.ts";
import { createId, nowIso, monthKey } from "./utils.ts";

const AMOUNT_TOLERANCE = 0.01;
const MAX_TRANSACTION_IDS = 10;
const COOLDOWN_DAYS = 30;

function toAmount(txn) {
  return Math.abs(Number(txn?.amount || 0));
}

function amountMatches(a, b) {
  return Math.abs(a - b) <= AMOUNT_TOLERANCE;
}

function isCooldownExpired(dismissedAt) {
  const dismissedDate = new Date(dismissedAt);
  const expiresAt = new Date(dismissedDate.getTime() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
  return new Date() >= expiresAt;
}

export function detectRecurringSuggestions(userId) {
  const store = loadStore();
  const userTxns = store.transactions.filter(
    (txn) => txn.user_id === userId && !txn.deleted_at
  );

  // Group by (merchant_normalized, amount)
  const groups = new Map();

  for (const txn of userTxns) {
    const merchant = String(txn.merchant_normalized || "").trim().toLowerCase();
    if (!merchant) continue;

    const amount = toAmount(txn);
    const key = `${merchant}::${amount.toFixed(2)}`;

    if (!groups.has(key)) {
      groups.set(key, {
        merchant_pattern: merchant,
        amount,
        months: new Set(),
        transaction_ids: []
      });
    }

    const group = groups.get(key);
    const month = monthKey(txn.transaction_date);
    if (month) group.months.add(month);

    if (group.transaction_ids.length < MAX_TRANSACTION_IDS) {
      group.transaction_ids.push(txn.id);
    }
  }

  // Filter to those with 2+ distinct months, not already a rule, not dismissed
  const existingRules = new Set(
    (store.recurringRules || [])
      .filter((rule) => rule.user_id === userId)
      .map((rule) => `${String(rule.merchant_pattern || "").toLowerCase()}::${Number(rule.amount).toFixed(2)}`)
  );

  const dismissedPatterns = new Set(
    (store.dismissedRecurringSuggestions || [])
      .filter((d) => d.user_id === userId)
      .filter((d) => d.dismissed_reason === "user_dismissed" || !isCooldownExpired(d.dismissed_at))
      .map((d) => `${String(d.merchant_pattern || "").toLowerCase()}::${Number(d.amount).toFixed(2)}`)
  );

  const suggestions = [];
  for (const [key, group] of groups) {
    if (group.months.size < 2) continue;
    if (existingRules.has(key)) continue;
    if (dismissedPatterns.has(key)) continue;

    suggestions.push({
      id: createId("rsug"),
      user_id: userId,
      merchant_pattern: group.merchant_pattern,
      amount: group.amount,
      detected_at: nowIso(),
      occurrence_count: group.months.size,
      transaction_ids: group.transaction_ids
    });
  }

  // Store suggestions
  store.recurringSuggestions = suggestions;
  saveStore(store);

  return suggestions;
}

export function listRecurringSuggestions(userId, options = {}) {
  const store = loadStore();
  const items = (store.recurringSuggestions || [])
    .filter((s) => s.user_id === userId)
    .sort((a, b) => b.occurrence_count - a.occurrence_count);

  if (options.count_only) {
    return { count: items.length };
  }

  return { items };
}

export function dismissRecurringSuggestion(userId, suggestionId, reason = "user_dismissed") {
  const store = loadStore();
  const suggestion = (store.recurringSuggestions || []).find(
    (s) => s.id === suggestionId && s.user_id === userId
  );

  if (!suggestion) {
    throw new Error("Suggestion not found");
  }

  const dismissedAt = nowIso();
  const cooldownUntil = reason === "rule_deleted"
    ? new Date(Date.now() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000).toISOString()
    : null;

  store.dismissedRecurringSuggestions.push({
    id: createId("rdis"),
    user_id: userId,
    merchant_pattern: suggestion.merchant_pattern,
    amount: suggestion.amount,
    dismissed_at: dismissedAt,
    dismissed_reason: reason,
    cooldown_until: cooldownUntil
  });

  store.recurringSuggestions = (store.recurringSuggestions || []).filter(
    (s) => s.id !== suggestionId
  );

  saveStore(store);
  addAuditEvent(userId, "recurrings.suggestion.dismiss", { suggestionId, reason });

  return { dismissed: true };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd services/api && node --test test/recurring-suggestions.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add services/api/src/recurring-suggestions.ts services/api/test/recurring-suggestions.test.ts
git commit -m "feat(api): add recurring suggestions detection and dismissal"
```

---

### Task 3: Add create-rule-from-suggestion function

**Files:**
- Modify: `services/api/src/recurring-suggestions.ts`
- Test: `services/api/test/recurring-suggestions.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// Add to test/recurring-suggestions.test.ts
import { createRuleFromSuggestion } from "../src/recurring-suggestions.ts";
import { getRecurringRule } from "../src/recurrings.ts";

test("createRuleFromSuggestion creates rule and removes suggestion", () => {
  resetForSuggestions([
    { id: "t1", user_id: USER_ID, account_id: ACCOUNT_ID, transaction_date: "2026-01-15", merchant_raw: "Spotify", merchant_normalized: "spotify", description: "", amount: -9.99, direction: "outflow", category_final: "Entertainment", created_at: "2026-01-15T00:00:00Z", updated_at: "2026-01-15T00:00:00Z" },
    { id: "t2", user_id: USER_ID, account_id: ACCOUNT_ID, transaction_date: "2026-02-15", merchant_raw: "Spotify", merchant_normalized: "spotify", description: "", amount: -9.99, direction: "outflow", category_final: "Entertainment", created_at: "2026-02-15T00:00:00Z", updated_at: "2026-02-15T00:00:00Z" }
  ]);

  detectRecurringSuggestions(USER_ID);
  const suggestions = listRecurringSuggestions(USER_ID);
  assert.equal(suggestions.items.length, 1);

  const rule = createRuleFromSuggestion(USER_ID, suggestions.items[0].id, {
    name: "Spotify Premium",
    cadence: "monthly"
  });

  assert.equal(rule.name, "Spotify Premium");
  assert.equal(rule.merchant_pattern, "spotify");
  assert.equal(rule.amount, 9.99);

  // Suggestion should be removed
  const afterCreate = listRecurringSuggestions(USER_ID);
  assert.equal(afterCreate.items.length, 0);

  // Transactions should be linked
  const store = loadStore();
  const linkedTxns = store.transactions.filter((t) => t.recurring_rule_id === rule.id);
  assert.equal(linkedTxns.length, 2);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd services/api && node --test test/recurring-suggestions.test.ts`
Expected: FAIL - createRuleFromSuggestion not found

- [ ] **Step 3: Implement createRuleFromSuggestion**

```typescript
// Add to services/api/src/recurring-suggestions.ts
import { createRecurringRule, evaluateRecurringRule } from "./recurrings.ts";

export function createRuleFromSuggestion(userId, suggestionId, overrides = {}) {
  const store = loadStore();
  const suggestion = (store.recurringSuggestions || []).find(
    (s) => s.id === suggestionId && s.user_id === userId
  );

  if (!suggestion) {
    throw new Error("Suggestion not found");
  }

  // Create the rule
  const rule = createRecurringRule(userId, {
    name: overrides.name || suggestion.merchant_pattern,
    cadence: overrides.cadence || "monthly",
    amount: suggestion.amount,
    merchant_pattern: suggestion.merchant_pattern,
    ...overrides
  });

  // Remove suggestion
  store.recurringSuggestions = (store.recurringSuggestions || []).filter(
    (s) => s.id !== suggestionId
  );
  saveStore(store);

  // Link matching transactions
  evaluateRecurringRule(userId, rule.id);

  addAuditEvent(userId, "recurrings.suggestion.create_rule", {
    suggestionId,
    ruleId: rule.id
  });

  return rule;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd services/api && node --test test/recurring-suggestions.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add services/api/src/recurring-suggestions.ts services/api/test/recurring-suggestions.test.ts
git commit -m "feat(api): add createRuleFromSuggestion to convert suggestions to rules"
```

---

## Chunk 2: Backend - API Routes & Analytics

### Task 4: Add suggestions API routes

**Files:**
- Modify: `services/api/src/server.ts`
- Test: `services/api/test/api-contract.test.ts` (or create new test)

- [ ] **Step 1: Write the failing test**

```typescript
// Add to test/recurring-suggestions.test.ts or create test/api-suggestions.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

const API_URL = process.env.API_URL || "http://localhost:3001";

async function fetchApi(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${options.token || "test-token"}`,
      ...options.headers
    }
  });
  return res;
}

test("GET /v1/recurrings/suggestions returns suggestions list", async () => {
  // This test requires running API server - skip in CI
  const res = await fetchApi("/v1/recurrings/suggestions");
  assert.ok(res.ok || res.status === 401, "Should return 200 or 401");
});
```

- [ ] **Step 2: Add routes to server.ts**

```typescript
// Add to services/api/src/server.ts after existing recurrings routes

// Import at top:
import {
  detectRecurringSuggestions,
  listRecurringSuggestions,
  dismissRecurringSuggestion,
  createRuleFromSuggestion
} from "./recurring-suggestions.ts";

// Add routes (around line 900, after recurrings DELETE):

if (req.method === "GET" && pathname === "/v1/recurrings/suggestions") {
  const user = requireUser(req);
  const countOnly = searchParams.get("count_only") === "true";
  const suggestions = listRecurringSuggestions(user.id, { count_only: countOnly });
  sendJson(res, 200, suggestions);
  return;
}

const suggestionDismissParams = matchPath(pathname, "/v1/recurrings/suggestions/:id/dismiss");
if (req.method === "POST" && suggestionDismissParams) {
  const user = requireUser(req);
  const body = await parseJsonBody(req);
  const guard = resolveMutationGuard(req, user.id, "POST /v1/recurrings/suggestions/:id/dismiss", body);
  if (guard?.replay) {
    sendMutationReplay(res, guard.replay);
    return;
  }
  const result = dismissRecurringSuggestion(user.id, suggestionDismissParams.id, body?.reason || "user_dismissed");
  recordMutationGuardResult(user.id, guard, 200, result);
  sendJson(res, 200, result);
  return;
}

const suggestionCreateRuleParams = matchPath(pathname, "/v1/recurrings/suggestions/:id/create-rule");
if (req.method === "POST" && suggestionCreateRuleParams) {
  const user = requireUser(req);
  const body = await parseJsonBody(req);
  const guard = resolveMutationGuard(req, user.id, "POST /v1/recurrings/suggestions/:id/create-rule", body);
  if (guard?.replay) {
    sendMutationReplay(res, guard.replay);
    return;
  }
  const recurring = createRuleFromSuggestion(user.id, suggestionCreateRuleParams.id, body || {});
  recordMutationGuardResult(user.id, guard, 201, { recurring });
  sendJson(res, 201, { recurring });
  return;
}
```

- [ ] **Step 3: Run API server and test manually**

Run: `cd services/api && pnpm dev`
Run: `curl http://localhost:3001/v1/recurrings/suggestions -H "Authorization: Bearer test-token"`

Expected: `{"items":[]}` or similar JSON response with 200 status.
If unauthorized, the test in Step 1 verifies the endpoint exists by checking for 200 or 401 status.

- [ ] **Step 4: Commit**

```bash
git add services/api/src/server.ts
git commit -m "feat(api): add recurring suggestions API endpoints"
```

---

### Task 5: Change recurringSpend to rule-based calculation

**Files:**
- Modify: `services/api/src/analytics.ts:523-541`
- Test: `services/api/test/analytics.test.ts` (or create)

- [ ] **Step 1: Write the failing test**

```typescript
// Add to test/recurring-suggestions.test.ts or create test/analytics-recurring.test.ts
import { getOverview } from "../src/analytics.ts";
import { createRecurringRule, evaluateRecurringRule } from "../src/recurrings.ts";

test("recurringSpend is sum of transactions with recurring_rule_id", () => {
  resetForSuggestions([
    { id: "t1", user_id: USER_ID, account_id: ACCOUNT_ID, transaction_date: "2026-01-15", merchant_raw: "Netflix", merchant_normalized: "netflix", description: "", amount: -15.99, direction: "outflow", category_final: "Entertainment", created_at: "2026-01-15T00:00:00Z", updated_at: "2026-01-15T00:00:00Z" },
    { id: "t2", user_id: USER_ID, account_id: ACCOUNT_ID, transaction_date: "2026-02-15", merchant_raw: "Netflix", merchant_normalized: "netflix", description: "", amount: -15.99, direction: "outflow", category_final: "Entertainment", created_at: "2026-02-15T00:00:00Z", updated_at: "2026-02-15T00:00:00Z" },
    // This merchant appears 2+ months but has no rule - should NOT count
    { id: "t3", user_id: USER_ID, account_id: ACCOUNT_ID, transaction_date: "2026-01-10", merchant_raw: "Coffee Shop", merchant_normalized: "coffee shop", description: "", amount: -5.00, direction: "outflow", category_final: "Dining", created_at: "2026-01-10T00:00:00Z", updated_at: "2026-01-10T00:00:00Z" },
    { id: "t4", user_id: USER_ID, account_id: ACCOUNT_ID, transaction_date: "2026-02-10", merchant_raw: "Coffee Shop", merchant_normalized: "coffee shop", description: "", amount: -5.00, direction: "outflow", category_final: "Dining", created_at: "2026-02-10T00:00:00Z", updated_at: "2026-02-10T00:00:00Z" }
  ]);

  // Before rule: recurringSpend should be 0
  const before = getOverview(USER_ID);
  assert.equal(before.summary.recurringSpend, 0, "No recurring spend without rules");

  // Create rule and link transactions
  const rule = createRecurringRule(USER_ID, { name: "Netflix", cadence: "monthly", amount: 15.99, merchant_pattern: "netflix" });
  evaluateRecurringRule(USER_ID, rule.id);

  // After rule: recurringSpend should equal linked transactions (15.99 * 2 = 31.98)
  const after = getOverview(USER_ID);
  assert.equal(after.summary.recurringSpend, 31.98, "Recurring spend should be sum of linked transactions");

  // Coffee Shop appears 2+ months but has no rule, so should NOT be included
  // (this would have been included by the old heuristic)
});
```

- [ ] **Step 2: Update getOverview function**

```typescript
// In services/api/src/analytics.ts, replace the heuristic calculation (lines 523-534)

// OLD (remove):
let recurringSpend = 0;
const recurringMerchants = new Set();
for (const key of Object.keys(merchantByMonth)) {
  const [merchant] = key.split("::");
  recurringMerchants.add(merchant);
}
for (const merchant of recurringMerchants) {
  const activeMonths = Object.keys(merchantByMonth).filter((key) => key.startsWith(`${merchant}::`)).length;
  if (activeMonths >= 2) {
    recurringSpend += merchantCounts[merchant] || 0;
  }
}

// NEW:
let recurringSpend = 0;
for (const txn of txns) {
  if (txn.direction !== "outflow") continue;
  if (txn.recurring_rule_id) {
    recurringSpend += toAmount(txn);
  }
}
```

- [ ] **Step 3: Run tests**

Run: `cd services/api && node --test test/analytics.test.ts`
Expected: PASS (update tests if needed)

- [ ] **Step 4: Commit**

```bash
git add services/api/src/analytics.ts
git commit -m "feat(analytics): change recurringSpend to rule-based calculation"
```

---

### Task 6: Hook detection into transaction import

**Files:**
- Modify: `services/api/src/imports.ts`
- Test: `services/api/test/recurring-suggestions.test.ts`

- [ ] **Step 1: Locate the commitImport function**

The `commitImport` function in `services/api/src/imports.ts` finalizes the import.
Find the location where `saveStore(store)` is called (near the end of the function).
Add the detection call immediately after this line.

- [ ] **Step 2: Add detection after commit completes**

```typescript
// In services/api/src/imports.ts, at end of commitImport function
// After transactions are created, call:

import { detectRecurringSuggestions } from "./recurring-suggestions.ts";

// At end of commitImport, after saveStore():
try {
  detectRecurringSuggestions(userId);
} catch (err) {
  // Log but don't fail the import
  console.error("Failed to detect recurring suggestions:", err);
}
```

- [ ] **Step 3: Test detection runs on import**

Manually verify by:
1. Starting the API server: `cd services/api && pnpm dev`
2. Importing a CSV with recurring merchants via the import endpoint
3. Checking `GET /v1/recurrings/suggestions` returns the detected merchants

Or add a unit test that calls `commitImport` with test data and verifies suggestions are created.

- [ ] **Step 4: Commit**

```bash
git add services/api/src/imports.ts
git commit -m "feat(imports): run recurring detection after transaction import"
```

---

### Task 7: Add dismissed registry entry on rule delete

**Files:**
- Modify: `services/api/src/recurrings.ts`
- Test: `services/api/test/recurring-suggestions.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
test("deleting a rule adds entry to dismissed registry with 30-day cooldown", () => {
  resetForSuggestions([
    { id: "t1", user_id: USER_ID, account_id: ACCOUNT_ID, transaction_date: "2026-01-15", merchant_raw: "Netflix", merchant_normalized: "netflix", description: "", amount: -15.99, direction: "outflow", category_final: "Entertainment", created_at: "2026-01-15T00:00:00Z", updated_at: "2026-01-15T00:00:00Z" }
  ]);

  const rule = createRecurringRule(USER_ID, { name: "Netflix", cadence: "monthly", amount: 15.99, merchant_pattern: "netflix" });
  deleteRecurringRule(USER_ID, rule.id);

  const store = loadStore();
  const dismissed = store.dismissedRecurringSuggestions.find((d) => d.merchant_pattern === "netflix");
  assert.ok(dismissed, "Should have dismissed entry");
  assert.equal(dismissed.dismissed_reason, "rule_deleted");
  assert.ok(dismissed.cooldown_until, "Should have cooldown date");
});
```

- [ ] **Step 2: Update deleteRecurringRule**

```typescript
// In services/api/src/recurrings.ts, add at end of deleteRecurringRule:

import { loadStore, saveStore } from "./store.ts";
import { createId, nowIso } from "./utils.ts";

// At end of deleteRecurringRule function, before return:
const dismissedEntry = {
  id: createId("rdis"),
  user_id: userId,
  merchant_pattern: record.merchant_pattern,
  amount: record.amount,
  dismissed_at: nowIso(),
  dismissed_reason: "rule_deleted",
  cooldown_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
};

if (!Array.isArray(store.dismissedRecurringSuggestions)) {
  store.dismissedRecurringSuggestions = [];
}
store.dismissedRecurringSuggestions.push(dismissedEntry);
```

- [ ] **Step 3: Run tests**

Run: `cd services/api && node --test test/recurrings.test.ts test/recurring-suggestions.test.ts`

- [ ] **Step 4: Commit**

```bash
git add services/api/src/recurrings.ts services/api/test/recurring-suggestions.test.ts
git commit -m "feat(recurrings): add dismissed registry entry on rule delete with 30-day cooldown"
```

---

## Chunk 3: Frontend Types & API Client

### Task 8: Add frontend types for suggestions

**Files:**
- Modify: `apps/web/src/lib/api/types.ts`

- [ ] **Step 1: Add suggestion types**

```typescript
// Add to apps/web/src/lib/api/types.ts

export interface RecurringSuggestion {
  id: string;
  user_id: string;
  merchant_pattern: string;
  amount: number;
  detected_at: string;
  occurrence_count: number;
  transaction_ids: string[];
}

export interface DismissedRecurringSuggestion {
  id: string;
  user_id: string;
  merchant_pattern: string;
  amount: number;
  dismissed_at: string;
  dismissed_reason: "user_dismissed" | "rule_deleted";
  cooldown_until: string | null;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/lib/api/types.ts
git commit -m "feat(types): add RecurringSuggestion and DismissedRecurringSuggestion types"
```

---

### Task 9: Add suggestions API client methods

**Files:**
- Modify: `apps/web/src/lib/api/endpoints.ts`

- [ ] **Step 1: Add suggestions API methods to recurringsApi**

```typescript
// In apps/web/src/lib/api/endpoints.ts, extend recurringsApi

export const recurringsApi = {
  // ... existing methods ...

  getSuggestions: (request: ApiRequest, params?: { count_only?: boolean }) =>
    request<{ items: RecurringSuggestion[] } | { count: number }>(
      `/v1/recurrings/suggestions${buildQuery(params || {})}`
    ),

  dismissSuggestion: (request: ApiRequest, id: string, reason?: "user_dismissed" | "rule_deleted") =>
    request<{ dismissed: boolean }>(`/v1/recurrings/suggestions/${id}/dismiss`, {
      method: "POST",
      body: { reason: reason || "user_dismissed" }
    }),

  createRuleFromSuggestion: (request: ApiRequest, id: string, body: { name?: string; cadence?: string }) =>
    request<{ recurring: RecurringRule }>(`/v1/recurrings/suggestions/${id}/create-rule`, {
      method: "POST",
      body
    })
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/lib/api/endpoints.ts
git commit -m "feat(api): add suggestions API client methods"
```

---

## Chunk 4: Recurrings Page Improvements

### Task 10: Create RecurringTotalsBand component

**Files:**
- Create: `apps/web/src/components/recurrings/RecurringTotalsBand.tsx`

- [ ] **Step 1: Create the component**

```tsx
// apps/web/src/components/recurrings/RecurringTotalsBand.tsx
"use client";

import { money } from "@/lib/utils";
import type { RecurringRule } from "@/lib/api/types";

interface RecurringTotalsBandProps {
  rules: RecurringRule[];
}

export function RecurringTotalsBand({ rules }: RecurringTotalsBandProps) {
  const activeRules = rules.filter((r) => r.status === "active");

  const monthlyTotal = activeRules.reduce((sum, rule) => {
    const multiplier = {
      weekly: 4.33,
      biweekly: 2.17,
      monthly: 1,
      quarterly: 0.33,
      yearly: 0.08
    }[rule.cadence] || 1;
    return sum + rule.amount * multiplier;
  }, 0);

  const yearlyTotal = monthlyTotal * 12;

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-3" data-testid="recurring-totals-band">
      <div className="flex items-center justify-between gap-4 text-sm">
        <div>
          <span className="text-neutral-400">Active recurring:</span>
          <span className="ml-2 font-semibold text-neutral-100">{money(monthlyTotal)}/mo</span>
        </div>
        <div className="text-neutral-500">
          {money(yearlyTotal)}/yr
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/recurrings/RecurringTotalsBand.tsx
git commit -m "feat(ui): add RecurringTotalsBand component"
```

---

### Task 11: Create SuggestionsSection component

**Files:**
- Create: `apps/web/src/components/recurrings/SuggestionsSection.tsx`

- [ ] **Step 1: Create the component**

```tsx
// apps/web/src/components/recurrings/SuggestionsSection.tsx
"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { money } from "@/lib/utils";
import { useApi } from "@/hooks/useApi";
import type { RecurringSuggestion } from "@/lib/api/types";

interface SuggestionsSectionProps {
  suggestions: RecurringSuggestion[];
  onSuggestionHandled: () => void;
}

export function SuggestionsSection({ suggestions, onSuggestionHandled }: SuggestionsSectionProps) {
  const api = useApi();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleCreate(suggestion: RecurringSuggestion) {
    setLoading(suggestion.id);
    try {
      await api.recurrings.createRuleFromSuggestion(suggestion.id, {
        name: suggestion.merchant_pattern,
        cadence: "monthly"
      });
      onSuggestionHandled();
    } catch (err) {
      console.error("Failed to create rule:", err);
    } finally {
      setLoading(null);
    }
  }

  async function handleDismiss(suggestion: RecurringSuggestion) {
    setLoading(suggestion.id);
    try {
      await api.recurrings.dismissSuggestion(suggestion.id);
      onSuggestionHandled();
    } catch (err) {
      console.error("Failed to dismiss:", err);
    } finally {
      setLoading(null);
    }
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <section className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4" data-testid="recurrings-suggestions">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
        Suggested Recurrings ({suggestions.length})
      </h4>
      <p className="mt-1 text-xs text-neutral-500">
        Merchants detected as potentially recurring. Create rules to track them.
      </p>
      <div className="mt-3 space-y-2">
        {suggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            className="flex items-center justify-between rounded-lg bg-neutral-950 px-3 py-2"
          >
            <div>
              <p className="text-sm font-medium text-neutral-200">{suggestion.merchant_pattern}</p>
              <p className="text-xs text-neutral-500">
                {money(suggestion.amount)} · {suggestion.occurrence_count} months
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleCreate(suggestion)}
                disabled={loading === suggestion.id}
                className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50"
                data-testid={`suggestion-create-${suggestion.id}`}
              >
                <Plus className="h-3 w-3" />
                Create
              </button>
              <button
                type="button"
                onClick={() => handleDismiss(suggestion)}
                disabled={loading === suggestion.id}
                className="inline-flex items-center gap-1 rounded-md bg-neutral-800 px-2 py-1 text-xs text-neutral-400 transition hover:bg-neutral-700 disabled:opacity-50"
                data-testid={`suggestion-dismiss-${suggestion.id}`}
              >
                <X className="h-3 w-3" />
                Dismiss
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/recurrings/SuggestionsSection.tsx
git commit -m "feat(ui): add SuggestionsSection component with create/dismiss actions"
```

---

### Task 12: Update Recurrings page with new features

**Files:**
- Modify: `apps/web/src/app/recurrings/page.tsx`

- [ ] **Step 1: Import new components and add suggestions state**

```tsx
// Add imports
import { RecurringTotalsBand } from "@/components/recurrings/RecurringTotalsBand";
import { SuggestionsSection } from "@/components/recurrings/SuggestionsSection";
import type { RecurringSuggestion } from "@/lib/api/types";

// Add state
const [suggestions, setSuggestions] = useState<RecurringSuggestion[]>([]);
```

- [ ] **Step 2: Add loadSuggestions function**

```tsx
async function loadSuggestions() {
  try {
    const response = await api.recurrings.getSuggestions({});
    if ("items" in response) {
      setSuggestions(response.items);
    }
  } catch (err) {
    console.error("Failed to load suggestions:", err);
  }
}
```

- [ ] **Step 3: Add useEffect to load suggestions**

```tsx
useEffect(() => {
  void loadSuggestions();
}, []);
```

- [ ] **Step 4: Add totals band and suggestions section to render**

```tsx
// After header, before the main section:
<RecurringTotalsBand rules={rules} />

// Inside the main section, after the create form:
<SuggestionsSection
  suggestions={suggestions}
  onSuggestionHandled={() => {
    void loadRules(null);
    void loadSuggestions();
  }}
/>
```

- [ ] **Step 5: Add category, account, direction fields to edit form**

```tsx
// Add state for categories and accounts (load from API on mount)
const [categories, setCategories] = useState<string[]>([]);
const [accounts, setAccounts] = useState<{ id: string; displayName: string }[]>([]);

useEffect(() => {
  async function loadFilters() {
    try {
      const [catRes, accRes] = await Promise.all([
        api.categories.list(),
        api.accounts.list()
      ]);
      setCategories(catRes.categories.map((c) => c.name).filter(Boolean));
      setAccounts(accRes.accounts.map((a) => ({ id: a.id, displayName: a.displayName })));
    } catch (err) {
      console.error("Failed to load filters:", err);
    }
  }
  void loadFilters();
}, []);

// Add to editDraft state (in existing editDraft useState)
// Add account_id field if not present

// Add after merchant_pattern input in the edit form:
<label className="grid gap-1 text-xs uppercase tracking-wide text-neutral-400">
  Category
  <select
    value={editDraft.category_final || ""}
    onChange={(event) => setEditDraft((prev) => ({ ...prev, category_final: event.target.value || null }))}
    className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-200"
  >
    <option value="">Any category</option>
    {categories.map((cat) => (
      <option key={cat} value={cat}>{cat}</option>
    ))}
  </select>
</label>

<label className="grid gap-1 text-xs uppercase tracking-wide text-neutral-400">
  Account
  <select
    value={editDraft.account_id || ""}
    onChange={(event) => setEditDraft((prev) => ({ ...prev, account_id: event.target.value || null }))}
    className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-200"
  >
    <option value="">Any account</option>
    {accounts.map((acc) => (
      <option key={acc.id} value={acc.id}>{acc.displayName}</option>
    ))}
  </select>
</label>

<label className="grid gap-1 text-xs uppercase tracking-wide text-neutral-400">
  Direction
  <select
    value={editDraft.direction || ""}
    onChange={(event) => setEditDraft((prev) => ({ ...prev, direction: event.target.value || null }))}
    className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-200"
  >
    <option value="">Any direction</option>
    <option value="outflow">Outflow</option>
    <option value="inflow">Inflow</option>
  </select>
</label>
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/recurrings/page.tsx
git commit -m "feat(recurrings): add suggestions section, totals band, and expanded rule fields"
```

---

## Chunk 5: Transactions Page Integration

### Task 13: Add recurring filter to Transactions page

**Files:**
- Modify: `apps/web/src/app/transactions/filters.ts`
- Modify: `apps/web/src/app/transactions/page.tsx`

- [ ] **Step 1: Add recurring to filter state and types**

```typescript
// In apps/web/src/app/transactions/filters.ts

export interface TransactionsFilterState {
  // ... existing fields ...
  recurring: boolean;  // NEW
}

export interface TransactionsListApiParams {
  // ... existing fields ...
  recurring_rule_id?: string;  // NEW: "true" for filter
}

// Update createDefaultTransactionsFilterState
export function createDefaultTransactionsFilterState(): TransactionsFilterState {
  return {
    // ... existing defaults ...
    recurring: false
  };
}

// Update parseTransactionsFilterState
export function parseTransactionsFilterState(searchParams: SearchParamsLike): TransactionsFilterState {
  return {
    // ... existing parsing ...
    recurring: searchParams.get("recurring") === "true"
  };
}

// Update toTransactionsListApiParams
export function toTransactionsListApiParams(filters: TransactionsFilterState): TransactionsListApiParams {
  const params: TransactionsListApiParams = {
    // ... existing params ...
  };

  if (filters.recurring) {
    params.recurring_rule_id = "true";
  }

  return params;
}

// Update buildTransactionsFilterSearchParams
export function buildTransactionsFilterSearchParams(filters: TransactionsFilterState): URLSearchParams {
  const searchParams = new URLSearchParams();

  // ... existing params ...

  if (filters.recurring) {
    searchParams.set("recurring", "true");
  }

  return searchParams;
}
```

- [ ] **Step 2: Add recurring filter UI to Transactions page**

```tsx
// In apps/web/src/app/transactions/page.tsx, add filter control

<label className="flex items-center gap-2 text-xs text-neutral-400">
  <input
    type="checkbox"
    checked={filterState.recurring}
    onChange={(event) => setFilterState((prev) => ({ ...prev, recurring: event.target.checked, page: 1 }))}
    className="rounded border-neutral-700 bg-neutral-900"
  />
  Recurring only
</label>
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/transactions/filters.ts apps/web/src/app/transactions/page.tsx
git commit -m "feat(transactions): add recurring filter to header filters"
```

---

### Task 14: Add recurring badge to transaction rows

**Files:**
- Modify: `apps/web/src/app/transactions/page.tsx`

- [ ] **Step 1: Add badge component to transaction row**

```tsx
// In the transaction row render, add badge after amount

{transaction.recurring_rule_id && (
  <span
    className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-300"
    title={`Linked to recurring rule`}
    data-testid={`tx-recurring-badge-${transaction.id}`}
  >
    ↻
  </span>
)}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/transactions/page.tsx
git commit -m "feat(transactions): add recurring badge to transaction rows"
```

---

### Task 15: Add "Create rule from transaction" action

**Files:**
- Modify: `apps/web/src/app/transactions/page.tsx`

- [ ] **Step 1: Add action to transaction row menu**

```tsx
// Add state for create rule modal
const [createRuleFromTxn, setCreateRuleFromTxn] = useState<Transaction | null>(null);

// Add handler
async function handleCreateRuleFromTransaction(txn: Transaction) {
  try {
    await api.recurrings.create({
      name: txn.merchant_raw || txn.description,
      cadence: "monthly",
      amount: Math.abs(txn.amount),
      merchant_pattern: txn.merchant_normalized,
      category_final: txn.category_final,
      account_id: txn.account_id
    });
    setMessage("Recurring rule created from transaction.");
    setCreateRuleFromTxn(null);
    await loadTransactions();
  } catch (err) {
    setMessage("Failed to create recurring rule.");
  }
}

// Add action button (in transaction row actions or context menu)
<button
  type="button"
  onClick={() => setCreateRuleFromTxn(transaction)}
  className="text-xs text-neutral-400 hover:text-neutral-200"
>
  Create recurring rule
</button>
```

- [ ] **Step 2: Add simple modal for confirmation**

```tsx
// Add import at top of file
import { money } from "@/lib/utils";

// Add modal after the main return (or in a portal)
{createRuleFromTxn && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
      <h3 className="text-lg font-semibold">Create Recurring Rule?</h3>
      <p className="mt-2 text-sm text-neutral-400">
        Create a monthly recurring rule for {createRuleFromTxn.merchant_raw} ({money(Math.abs(createRuleFromTxn.amount))})?
      </p>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => handleCreateRuleFromTransaction(createRuleFromTxn)}
          className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-medium text-white"
        >
          Create Rule
        </button>
        <button
          type="button"
          onClick={() => setCreateRuleFromTxn(null)}
          className="rounded-lg bg-neutral-800 px-3 py-2 text-sm text-neutral-300"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/transactions/page.tsx
git commit -m "feat(transactions): add create recurring rule action from transaction"
```

---

## Chunk 6: Dashboard & Explorer Integration

### Task 16: Create SuggestionsCallout component

**Files:**
- Create: `apps/web/src/components/recurrings/SuggestionsCallout.tsx`

- [ ] **Step 1: Create the component**

```tsx
// apps/web/src/components/recurrings/SuggestionsCallout.tsx
"use client";

import { useRouter } from "next/navigation";

interface SuggestionsCalloutProps {
  count: number;
}

export function SuggestionsCallout({ count }: SuggestionsCalloutProps) {
  const router = useRouter();

  if (count === 0) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => router.push("/recurrings")}
      className="group inline-flex items-center gap-1 text-xs text-amber-300/80 transition hover:text-amber-200"
      title={`${count} potential recurring items not tracked`}
      data-testid="suggestions-callout"
    >
      <span className="inline-block animate-pulse">✨</span>
      <span className="text-amber-200/70 group-hover:text-amber-200">
        +{count} untracked
      </span>
    </button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/recurrings/SuggestionsCallout.tsx
git commit -m "feat(ui): add SuggestionsCallout component for Dashboard/Explorer"
```

---

### Task 17: Add suggestions callout to Dashboard

**Files:**
- Modify: `apps/web/src/app/page.tsx`

- [ ] **Step 1: Add suggestions count to state and load**

```tsx
// Import
import { SuggestionsCallout } from "@/components/recurrings/SuggestionsCallout";

// Add state
const [suggestionsCount, setSuggestionsCount] = useState(0);

// Add to loadDashboardData or separate effect
useEffect(() => {
  async function loadSuggestionsCount() {
    try {
      const result = await api.recurrings.getSuggestions({ count_only: true });
      if ("count" in result) {
        setSuggestionsCount(result.count);
      }
    } catch {
      // Ignore
    }
  }
  if (hydrated) {
    void loadSuggestionsCount();
  }
}, [hydrated, api]);
```

- [ ] **Step 2: Add callout to Recurring Spend KPI card**

```tsx
// In the recurring-spend KPI card, after the label:
<div className="flex items-center gap-2 text-neutral-400">
  <entry.icon className="h-4 w-4" />
  <span className="text-xs font-medium uppercase tracking-wide">{entry.label}</span>
  <SuggestionsCallout count={suggestionsCount} />
</div>
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/page.tsx
git commit -m "feat(dashboard): add suggestions callout to recurring spend KPI"
```

---

### Task 18: Add suggestions callout to Explorer

**Files:**
- Modify: `apps/web/src/app/explorer/components/ExplorerSummaryBand.tsx`

- [ ] **Step 1: Add suggestions count and callout**

```tsx
// Import
import { SuggestionsCallout } from "@/components/recurrings/SuggestionsCallout";
import { useApi } from "@/hooks/useApi";

// Add inside component
const api = useApi();
const [suggestionsCount, setSuggestionsCount] = useState(0);

useEffect(() => {
  async function loadCount() {
    try {
      const result = await api.recurrings.getSuggestions({ count_only: true });
      if ("count" in result) {
        setSuggestionsCount(result.count);
      }
    } catch {
      // Ignore
    }
  }
  void loadCount();
}, []);

// Update the items interface to include optional callout
interface SummaryItem {
  key: string;
  label: string;
  // ... other existing fields ...
  callout?: React.ReactNode;  // NEW
}

// Add callout to recurring item in the items array
{
  key: "recurring",
  label: "Recurring Spend",
  // ...
  callout: <SuggestionsCallout count={suggestionsCount} />
}

// Render callout in the card if present (add to card render)
{item.callout}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/explorer/components/ExplorerSummaryBand.tsx
git commit -m "feat(explorer): add suggestions callout to recurring spend card"
```

---

## Chunk 7: Integration Testing & Polish

### Task 19: Add integration test for full flow

**Files:**
- Create: `e2e/specs/recurrings-suggestions.spec.ts` (or test file)

- [ ] **Step 1: Write end-to-end test**

```typescript
// e2e/specs/recurrings-suggestions.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Recurring Suggestions Flow", () => {
  test("import creates suggestions, creating rule links transactions", async ({ page }) => {
    // 1. Navigate to recurrings page
    await page.goto("/recurrings");

    // 2. Verify suggestions section exists (may be empty initially)
    const suggestionsSection = page.getByTestId("recurrings-suggestions");
    // Section may not exist if no suggestions

    // 3. If suggestions exist, click create on first one
    const createButton = page.getByTestId(/suggestion-create-/).first();
    if (await createButton.isVisible()) {
      await createButton.click();

      // 4. Verify rule was created (check for success or rule in list)
      await expect(page.getByText(/created/i)).toBeVisible();
    }

    // 5. Navigate to dashboard and verify recurring spend KPI
    await page.goto("/");
    const recurringCard = page.getByText(/recurring spend/i);
    await expect(recurringCard).toBeVisible();
  });

  test("dashboard shows suggestions callout when suggestions exist", async ({ page }) => {
    await page.goto("/");

    // Check for callout component
    const callout = page.getByTestId("suggestions-callout");

    // Callout should be visible if suggestions > 0
    const isVisible = await callout.isVisible().catch(() => false);

    if (isVisible) {
      // Click should navigate to recurrings
      await callout.click();
      await expect(page).toHaveURL(/\/recurrings/);
    }
  });
});
```

- [ ] **Step 2: Run and fix any issues**

- [ ] **Step 3: Commit**

```bash
git add e2e/specs/recurrings-suggestions.spec.ts
git commit -m "test(e2e): add integration test for recurring suggestions flow"
```

---

### Task 20: Final review and commit

- [ ] **Step 1: Run all tests**

Run: `pnpm test`

- [ ] **Step 2: Build frontend**

Run: `pnpm build`

- [ ] **Step 3: Manual testing**

Verification checklist:
1. Import transactions with recurring merchants (e.g., Netflix, Spotify same amount 2+ months)
2. Navigate to Recurrings page - verify suggestions section shows detected merchants
3. Click "Create" on a suggestion - verify rule appears in rules list
4. Navigate to Transactions - filter by "Recurring only" - verify linked transactions shown
5. Check Dashboard recurring spend KPI shows correct total (sum of active rule amounts)
6. Check Explorer recurring spend card shows same total
7. Delete a rule - verify it moves to dismissed registry
8. Wait for cooldown period or manually clear dismissed entry - verify suggestion can reappear

- [ ] **Step 4: Final commit if needed**

```bash
git add -A
git commit -m "chore: final integration fixes for recurrings improvements"
```

---

## Summary

This plan implements the Recurrings Improvements feature across 4 phases:

1. **Backend Foundation** (Tasks 1-7): Store collections, detection logic, API routes, analytics change
2. **Frontend Types & API** (Tasks 8-9): Types and API client methods
3. **Recurrings Page** (Tasks 10-12): Suggestions section, totals band, expanded fields
4. **Transactions Page** (Tasks 13-15): Filter, badge, create-rule action
5. **Dashboard & Explorer** (Tasks 16-18): Suggestions callout
6. **Integration Testing** (Tasks 19-20): E2E tests and final review