# LLM-Powered Recurring Detection Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace amount-based recurring detection with LLM-powered pattern detection that runs as a daily scheduled task.

**Architecture:** New scan state tracks when users need recurring analysis. Daily task checks dirty flags, calls LLM per merchant with 6-month history, creates suggestions for detected patterns. Amount tolerance changes from fixed $0.01 to 5% with $0.10 floor.

**Tech Stack:** TypeScript, Node.js, OpenAI/OpenRouter LLM API, existing store infrastructure

---

## File Structure

**New files:**
- `services/api/src/recurring-scan.ts` - Scan state management, helper functions, daily task logic
- `services/api/src/llm/recurring-detection.ts` - LLM detection function, prompt builders, output validation
- `services/api/test/recurring-scan.test.ts` - Tests for scan state, helpers, thresholds

**Modified files:**
- `services/api/src/store.ts` - Add `userRecurringScanState` array and `scanRunState` singleton to defaultStore
- `services/api/src/recurrings.ts` - Update `transactionMatchesRule()` to use new `amountMatches()` (5% + floor)
- `services/api/src/recurring-suggestions.ts` - Update `amountMatches()` to use 5% tolerance with floor
- `services/api/src/imports.ts` - Call `incrementUserScanCounter()` after `commitImport()`
- `services/api/src/server.ts` - Add admin endpoint to trigger scan, increment counter on transaction create

---

### Task 1: Update Store with New Collections

**Files:**
- Modify: `services/api/src/store.ts:11-34`
- Test: `services/api/test/store.test.ts` (existing file, add tests)

- [ ] **Step 1: Write failing test for new collections**

```typescript
// In services/api/test/store.test.ts
test("store includes userRecurringScanState and scanRunState collections", () => {
  resetStoreForTests({});
  const store = loadStore();

  assert.ok(Array.isArray(store.userRecurringScanState), "userRecurringScanState should be an array");
  assert.ok(store.scanRunState, "scanRunState should exist");
  assert.equal(store.scanRunState.is_running, false);
  assert.equal(store.scanRunState.last_run_at, null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd services/api && npm test -- --test-name-pattern="userRecurringScanState"`
Expected: FAIL with "Cannot read properties of undefined"

- [ ] **Step 3: Add new collections to defaultStore**

```typescript
// In services/api/src/store.ts, update defaultStore:
const defaultStore = {
  users: [],
  sessions: [],
  accounts: [],
  transactions: [],
  recurringRules: [],
  recurringSuggestions: [],
  dismissedRecurringSuggestions: [],
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
  auditEvents: [],
  userRecurringScanState: [],
  scanRunState: {
    is_running: false,
    last_run_at: null,
    last_run_status: null,
    last_run_duration_ms: null
  }
};
```

- [ ] **Step 4: Update normalizeStore to handle scanRunState**

```typescript
// In services/api/src/store.ts, update normalizeStore function:
function normalizeStore(store) {
  const normalized = structuredClone({ ...defaultStore, ...(store || {}) });
  for (const key of Object.keys(defaultStore)) {
    if (key === "scanRunState") {
      // Ensure scanRunState is an object, not an array
      if (!normalized[key] || typeof normalized[key] !== "object" || Array.isArray(normalized[key])) {
        normalized[key] = { ...defaultStore.scanRunState };
      } else {
        normalized[key] = {
          ...defaultStore.scanRunState,
          ...normalized[key]
        };
      }
      continue;
    }
    if (!Array.isArray(normalized[key])) {
      normalized[key] = [];
    }
  }
  return normalized;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd services/api && npm test -- --test-name-pattern="userRecurringScanState"`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add services/api/src/store.ts services/api/test/store.test.ts
git commit -m "feat(store): add userRecurringScanState and scanRunState collections"
```

---

### Task 2: Update Amount Tolerance in recurrings.ts

**Files:**
- Modify: `services/api/src/recurrings.ts:10,321`
- Test: `services/api/test/recurrings.test.ts` (existing file, add tests)

- [ ] **Step 1: Write failing test for new amount tolerance**

```typescript
// In services/api/test/recurrings.test.ts
test("transactionMatchesRule uses 5% tolerance with $0.10 floor", () => {
  const rule = {
    id: "rr1",
    user_id: "user1",
    name: "Test",
    cadence: "monthly",
    amount: 100,
    merchant_pattern: "test",
    status: "active"
  };

  // Within 5% ($5 for $100)
  assert.ok(
    transactionMatchesRule(
      { ...baseTransaction, amount: -95, merchant_raw: "test" },
      rule
    ),
    "Should match within 5%"
  );

  // Outside 5%
  assert.ok(
    !transactionMatchesRule(
      { ...baseTransaction, amount: -90, merchant_raw: "test" },
      rule
    ),
    "Should not match outside 5%"
  );
});

test("transactionMatchesRule uses $0.10 floor for small amounts", () => {
  const rule = {
    id: "rr2",
    user_id: "user1",
    name: "Small",
    cadence: "monthly",
    amount: 1,
    merchant_pattern: "test",
    status: "active"
  };

  // Floor of $0.10 applies (5% of $1 is $0.05, but floor is $0.10)
  assert.ok(
    transactionMatchesRule(
      { ...baseTransaction, amount: -1.10, merchant_raw: "test" },
      rule
    ),
    "Should match within $0.10 floor"
  );

  assert.ok(
    !transactionMatchesRule(
      { ...baseTransaction, amount: -1.20, merchant_raw: "test" },
      rule
    ),
    "Should not match outside $0.10 floor"
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd services/api && npm test -- --test-name-pattern="5% tolerance"`
Expected: FAIL (existing behavior uses $0.01 fixed tolerance)

- [ ] **Step 3: Update AMOUNT_TOLERANCE and transactionMatchesRule**

```typescript
// In services/api/src/recurrings.ts, replace line 10:
const AMOUNT_TOLERANCE_MIN = 0.10;
const AMOUNT_TOLERANCE_PERCENT = 0.05;

function amountMatchesRule(transactionAmount: number, ruleAmount: number): boolean {
  const tolerance = Math.max(AMOUNT_TOLERANCE_MIN, ruleAmount * AMOUNT_TOLERANCE_PERCENT);
  return Math.abs(transactionAmount - ruleAmount) <= tolerance;
}

// In transactionMatchesRule function (around line 321), replace:
// OLD: if (Math.abs(Math.abs(Number(transaction.amount || 0)) - rule.amount) > AMOUNT_TOLERANCE) {
// NEW:
if (!amountMatchesRule(Math.abs(Number(transaction.amount || 0)), rule.amount)) {
  return false;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd services/api && npm test -- --test-name-pattern="5% tolerance"`
Expected: PASS

- [ ] **Step 5: Run all recurrings tests to ensure no regression**

Run: `cd services/api && npm test -- --test-name-pattern="recurrings"`
Expected: All PASS

- [ ] **Step 6: Commit**

```bash
git add services/api/src/recurrings.ts services/api/test/recurrings.test.ts
git commit -m "feat(recurrings): use 5% amount tolerance with $0.10 floor"
```

---

### Task 3: Update Amount Tolerance in recurring-suggestions.ts

**Files:**
- Modify: `services/api/src/recurring-suggestions.ts:5,18-20`

- [ ] **Step 1: Write failing test for new tolerance in suggestions**

```typescript
// In services/api/test/recurring-suggestions.test.ts
test("amountMatches uses 5% tolerance with $0.10 floor", () => {
  // Test is internal to the module, but we can verify via detectRecurringSuggestions
  resetForSuggestions([
    { id: "t1", user_id: USER_ID, account_id: ACCOUNT_ID, transaction_date: "2026-01-15", merchant_raw: "Test", merchant_normalized: "test", amount: -100, direction: "outflow", created_at: "2026-01-15T00:00:00Z" },
    { id: "t2", user_id: USER_ID, account_id: ACCOUNT_ID, transaction_date: "2026-02-15", merchant_raw: "Test", merchant_normalized: "test", amount: -95, direction: "outflow", created_at: "2026-02-15T00:00:00Z" } // Within 5%
  ]);

  const result = detectRecurringSuggestions(USER_ID);

  // Both should be grouped together (within 5% tolerance)
  assert.equal(result.length, 1);
  assert.equal(result[0].occurrence_count, 2);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd services/api && npm test -- --test-name-pattern="5% tolerance"`
Expected: FAIL (existing uses $0.01 fixed)

- [ ] **Step 3: Update amountMatches function**

```typescript
// In services/api/src/recurring-suggestions.ts, replace lines 5 and 18-20:
const AMOUNT_TOLERANCE_MIN = 0.10;
const AMOUNT_TOLERANCE_PERCENT = 0.05;

function amountMatches(a: number, b: number): boolean {
  const tolerance = Math.max(AMOUNT_TOLERANCE_MIN, b * AMOUNT_TOLERANCE_PERCENT);
  return Math.abs(a - b) <= tolerance;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd services/api && npm test -- --test-name-pattern="5% tolerance"`
Expected: PASS

- [ ] **Step 5: Run all recurring-suggestions tests**

Run: `cd services/api && npm test -- --test-name-pattern="recurring-suggestions"`
Expected: All PASS

- [ ] **Step 6: Commit**

```bash
git add services/api/src/recurring-suggestions.ts services/api/test/recurring-suggestions.test.ts
git commit -m "feat(recurring-suggestions): use 5% amount tolerance with $0.10 floor"
```

---

### Task 4: Create Scan State Module

**Files:**
- Create: `services/api/src/recurring-scan.ts`
- Test: `services/api/test/recurring-scan.test.ts`

- [ ] **Step 1: Write failing tests for scan state helpers**

```typescript
// In services/api/test/recurring-scan.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { resetStoreForTests, loadStore } from "../src/store.ts";
import {
  incrementUserScanCounter,
  getUserScanState,
  getAdaptiveThreshold,
  daysBetween,
  subMonths
} from "../src/recurring-scan.ts";

const USER_ID = "user_scan_1";

test("incrementUserScanCounter creates state if not exists", () => {
  resetStoreForTests({});
  incrementUserScanCounter(USER_ID);

  const store = loadStore();
  const state = store.userRecurringScanState.find(s => s.user_id === USER_ID);
  assert.ok(state, "State should be created");
  assert.equal(state.transactions_since_scan, 1);
});

test("incrementUserScanCounter increments existing state", () => {
  resetStoreForTests({});
  incrementUserScanCounter(USER_ID);
  incrementUserScanCounter(USER_ID);
  incrementUserScanCounter(USER_ID);

  const state = getUserScanState(USER_ID);
  assert.equal(state.transactions_since_scan, 3);
});

test("getAdaptiveThreshold returns correct values", () => {
  assert.equal(getAdaptiveThreshold(0), 5);
  assert.equal(getAdaptiveThreshold(5), 5);
  assert.equal(getAdaptiveThreshold(7), 3);
  assert.equal(getAdaptiveThreshold(15), 3);
  assert.equal(getAdaptiveThreshold(30), 1);
  assert.equal(getAdaptiveThreshold(100), 1);
});

test("daysBetween returns correct days", () => {
  assert.equal(daysBetween("2026-01-01T00:00:00Z", "2026-01-08T00:00:00Z"), 7);
  assert.equal(daysBetween("2026-01-01T00:00:00Z", "2026-02-01T00:00:00Z"), 31);
});

test("daysBetween returns Infinity for null", () => {
  assert.equal(daysBetween(null, "2026-01-01T00:00:00Z"), Infinity);
});

test("subMonths returns correct date", () => {
  assert.equal(subMonths("2026-03-19", 6), "2025-09-19");
  assert.equal(subMonths("2026-01-15", 1), "2025-12-15");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd services/api && npm test -- test/recurring-scan.test.ts`
Expected: FAIL with module not found

- [ ] **Step 3: Create recurring-scan.ts with helper functions**

```typescript
// services/api/src/recurring-scan.ts
import { loadStore, saveStore } from "./store.ts";
import { nowIso, createId } from "./utils.ts";

const COOLDOWN_DAYS = 30;

export interface UserRecurringScanState {
  user_id: string;
  last_recurring_scan_at: string | null;
  transactions_since_scan: number;
  updated_at: string;
}

export function incrementUserScanCounter(userId: string): void {
  const store = loadStore();
  let state = store.userRecurringScanState.find(s => s.user_id === userId);

  if (!state) {
    state = {
      user_id: userId,
      last_recurring_scan_at: null,
      transactions_since_scan: 0,
      updated_at: nowIso()
    };
    store.userRecurringScanState.push(state);
  }

  state.transactions_since_scan += 1;
  state.updated_at = nowIso();
  saveStore(store);
}

export function getUserScanState(userId: string): UserRecurringScanState {
  const store = loadStore();
  let state = store.userRecurringScanState.find(s => s.user_id === userId);

  if (!state) {
    state = {
      user_id: userId,
      last_recurring_scan_at: null,
      transactions_since_scan: 0,
      updated_at: nowIso()
    };
    store.userRecurringScanState.push(state);
    saveStore(store);
  }

  return state;
}

export function updateUserScanState(userId: string, updates: Partial<UserRecurringScanState>): void {
  const store = loadStore();
  let state = store.userRecurringScanState.find(s => s.user_id === userId);

  if (!state) {
    state = {
      user_id: userId,
      last_recurring_scan_at: null,
      transactions_since_scan: 0,
      updated_at: nowIso()
    };
    store.userRecurringScanState.push(state);
  }

  Object.assign(state, updates, { updated_at: nowIso() });
  saveStore(store);
}

export function getAdaptiveThreshold(daysSinceScan: number): number {
  if (daysSinceScan >= 30) return 1;
  if (daysSinceScan >= 7) return 3;
  return 5;
}

export function daysBetween(date1: string | null, date2: string): number {
  if (!date1) return Infinity;
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

export function subMonths(date: string, months: number): string {
  const d = new Date(date);
  d.setMonth(d.getMonth() - months);
  return d.toISOString().slice(0, 10);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd services/api && npm test -- test/recurring-scan.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add services/api/src/recurring-scan.ts services/api/test/recurring-scan.test.ts
git commit -m "feat(recurring-scan): add scan state management helpers"
```

---

### Task 5: Add Merchant Detection Helpers

**Files:**
- Modify: `services/api/src/recurring-scan.ts`
- Modify: `services/api/test/recurring-scan.test.ts`

- [ ] **Step 1: Write failing tests for merchant helpers**

```typescript
// Add to services/api/test/recurring-scan.test.ts
import { normalizeText } from "../src/utils.ts";

const ACCOUNT_ID = "acct_scan_1";

test("getUsersWithPendingScans returns only users with pending scans", () => {
  resetStoreForTests({
    users: [{ id: USER_ID, email: "test@example.com", passwordHash: "h", salt: "s", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }],
    accounts: [{ id: ACCOUNT_ID, userId: USER_ID, normalizedKey: "checking", displayName: "Checking", accountType: "checking", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }],
    transactions: [
      { id: "t1", user_id: USER_ID, account_id: ACCOUNT_ID, transaction_date: "2026-03-15", merchant_normalized: "netflix", amount: -15.99, created_at: "2026-03-15T00:00:00Z" }
    ]
  });

  // Increment scan counter for this user
  incrementUserScanCounter(USER_ID);

  const pending = getUsersWithPendingScans();
  assert.equal(pending.length, 1);
  assert.equal(pending[0].user_id, USER_ID);
});

test("getMerchantsWithNewTransactions returns merchants since last scan", () => {
  const since = "2026-03-01T00:00:00Z";
  resetStoreForTests({
    users: [{ id: USER_ID, email: "test@example.com", passwordHash: "h", salt: "s", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }],
    accounts: [{ id: ACCOUNT_ID, userId: USER_ID, normalizedKey: "checking", displayName: "Checking", accountType: "checking", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }],
    transactions: [
      { id: "t1", user_id: USER_ID, account_id: ACCOUNT_ID, transaction_date: "2026-02-15", merchant_normalized: "oldmerchant", amount: -10, created_at: "2026-02-15T00:00:00Z" },
      { id: "t2", user_id: USER_ID, account_id: ACCOUNT_ID, transaction_date: "2026-03-15", merchant_normalized: "netflix", amount: -15.99, created_at: "2026-03-15T00:00:00Z" },
      { id: "t3", user_id: USER_ID, account_id: ACCOUNT_ID, transaction_date: "2026-03-16", merchant_normalized: "spotify", amount: -9.99, created_at: "2026-03-16T00:00:00Z" }
    ],
    userRecurringScanState: [{ user_id: USER_ID, last_recurring_scan_at: since, transactions_since_scan: 2, updated_at: since }]
  });

  const merchants = getMerchantsWithNewTransactions(USER_ID);
  assert.deepEqual(merchants.sort(), ["netflix", "spotify"]);
});

test("getMerchantTransactions returns transactions within window", () => {
  resetStoreForTests({
    users: [{ id: USER_ID, email: "test@example.com", passwordHash: "h", salt: "s", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }],
    accounts: [{ id: ACCOUNT_ID, userId: USER_ID, normalizedKey: "checking", displayName: "Checking", accountType: "checking", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }],
    transactions: [
      { id: "t1", user_id: USER_ID, account_id: ACCOUNT_ID, transaction_date: "2025-09-01", merchant_normalized: "netflix", amount: -15.99, created_at: "2025-09-01T00:00:00Z" }, // Too old
      { id: "t2", user_id: USER_ID, account_id: ACCOUNT_ID, transaction_date: "2026-01-01", merchant_normalized: "netflix", amount: -15.99, created_at: "2026-01-01T00:00:00Z" }, // Within 6 months
      { id: "t3", user_id: USER_ID, account_id: ACCOUNT_ID, transaction_date: "2026-03-15", merchant_normalized: "netflix", amount: -15.99, created_at: "2026-03-15T00:00:00Z" }
    ]
  });

  const txns = getMerchantTransactions(USER_ID, "netflix", { months: 6 });
  assert.equal(txns.length, 2);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd services/api && npm test -- test/recurring-scan.test.ts`
Expected: FAIL with function not exported

- [ ] **Step 3: Add merchant helper functions to recurring-scan.ts**

```typescript
// Add to services/api/src/recurring-scan.ts exports:
export function getUsersWithPendingScans(): UserRecurringScanState[] {
  const store = loadStore();
  return store.userRecurringScanState.filter(u => u.transactions_since_scan > 0);
}

export function getMerchantsWithNewTransactions(userId: string): string[] {
  const store = loadStore();
  const state = getUserScanState(userId);
  const since = state.last_recurring_scan_at;

  const txns = store.transactions.filter(t =>
    t.user_id === userId &&
    !t.deleted_at &&
    t.merchant_normalized &&
    (since === null || t.created_at > since)
  );

  return [...new Set(txns.map(t => t.merchant_normalized).filter(Boolean))];
}

export function getMerchantTransactions(userId: string, merchant: string, options: { months: number }): any[] {
  const store = loadStore();
  const cutoff = subMonths(nowIso().slice(0, 10), options.months);

  return store.transactions.filter(t =>
    t.user_id === userId &&
    !t.deleted_at &&
    normalizeText(t.merchant_normalized) === normalizeText(merchant) &&
    t.transaction_date >= cutoff
  );
}
```

- [ ] **Step 4: Import normalizeText at top of file**

```typescript
import { loadStore, saveStore } from "./store.ts";
import { nowIso, createId, normalizeText } from "./utils.ts";
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd services/api && npm test -- test/recurring-scan.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add services/api/src/recurring-scan.ts services/api/test/recurring-scan.test.ts
git commit -m "feat(recurring-scan): add merchant detection helpers"
```

---

### Task 6: Create LLM Recurring Detection Module

**Files:**
- Create: `services/api/src/llm/recurring-detection.ts`
- Create: `services/api/test/llm/recurring-detection.test.ts`

- [ ] **Step 1: Write failing tests for LLM detection**

```typescript
// In services/api/test/llm/recurring-detection.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { validatePatterns, formatTransactionsForLlm } from "../../src/llm/recurring-detection.ts";

test("validatePatterns filters invalid cadences", () => {
  const input = [
    { is_recurring: true, amount: 15.99, cadence: "monthly" },
    { is_recurring: true, amount: 10, cadence: "bi-monthly" } // Invalid
  ];

  const result = validatePatterns(input);
  assert.equal(result.length, 1);
  assert.equal(result[0].cadence, "monthly");
});

test("validatePatterns filters negative/zero amounts", () => {
  const input = [
    { is_recurring: true, amount: 15.99, cadence: "monthly" },
    { is_recurring: true, amount: -10, cadence: "weekly" },
    { is_recurring: true, amount: 0, cadence: "monthly" }
  ];

  const result = validatePatterns(input);
  assert.equal(result.length, 1);
  assert.equal(result[0].amount, 15.99);
});

test("validatePatterns returns empty array for non-array input", () => {
  assert.deepEqual(validatePatterns(null), []);
  assert.deepEqual(validatePatterns({}), []);
  assert.deepEqual(validatePatterns("invalid"), []);
});

test("formatTransactionsForLlm formats transactions correctly", () => {
  const txns = [
    { transaction_date: "2026-03-15", amount: -15.99 },
    { transaction_date: "2026-02-15", amount: -15.99 },
    { transaction_date: "2026-01-15", amount: 16.50 }
  ];

  const result = formatTransactionsForLlm(txns);
  assert.equal(result, "- 2026-03-15: $15.99\n- 2026-02-15: $15.99\n- 2026-01-15: $16.50");
});

test("formatTransactionsForLlm limits to 50 transactions", () => {
  const txns = Array.from({ length: 60 }, (_, i) => ({
    transaction_date: `2026-${String(i % 12 + 1).padStart(2, "0")}-15`,
    amount: -10
  }));

  const result = formatTransactionsForLlm(txns);
  const lines = result.split("\n");
  assert.equal(lines.length, 50);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd services/api && npm test -- test/llm/recurring-detection.test.ts`
Expected: FAIL with module not found

- [ ] **Step 3: Create LLM recurring detection module**

```typescript
// services/api/src/llm/recurring-detection.ts
import { runStructuredLlm } from "./client.ts";
import { requireAiFeature, resolveProviderForFeature } from "../ai.ts";

const VALID_CADENCES = ["weekly", "biweekly", "monthly", "quarterly", "yearly"];

export interface RecurringPattern {
  is_recurring: boolean;
  amount: number;
  cadence: "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly";
}

const SYSTEM_PROMPT = `You analyze transaction history to detect recurring spending patterns.
Return JSON only.
Output schema:
{
  "patterns": [
    { "is_recurring": boolean, "amount": number, "cadence": "weekly"|"biweekly"|"monthly"|"quarterly"|"yearly" }
  ]
}

Rules:
- A pattern is recurring if transactions appear consistently at regular intervals across at least 2 distinct months.
- Multiple patterns can exist for the same merchant (e.g., phone bill at $80/mo, internet at $60/mo).
- Group transactions by similar amounts (within ~5%) when detecting patterns.
- If no recurring pattern exists, return empty patterns array.
- Prefer the most common/recent amount for each pattern.`;

export function formatTransactionsForLlm(transactions: any[]): string {
  return transactions
    .sort((a, b) => b.transaction_date.localeCompare(a.transaction_date))
    .slice(0, 50)
    .map(t => `- ${t.transaction_date}: $${Math.abs(t.amount).toFixed(2)}`)
    .join("\n");
}

export function validatePatterns(patterns: unknown): RecurringPattern[] {
  if (!Array.isArray(patterns)) return [];

  return patterns
    .filter(p => p && typeof p === "object")
    .filter(p => typeof (p as any).is_recurring === "boolean")
    .filter(p => typeof (p as any).amount === "number" && (p as any).amount > 0)
    .filter(p => VALID_CADENCES.includes((p as any).cadence))
    .map(p => ({
      is_recurring: (p as any).is_recurring,
      amount: Math.abs((p as any).amount),
      cadence: (p as any).cadence
    }));
}

export async function detectRecurringPatternsWithLlm({
  userId,
  merchant,
  transactions,
  existingRules = []
}: {
  userId: string;
  merchant: string;
  transactions: any[];
  existingRules?: any[];
}): Promise<{ ok: boolean; patterns: RecurringPattern[]; error?: string }> {
  try {
    const aiContext = requireAiFeature(userId, "recurring_detection");

    const userPrompt = [
      `Merchant: ${merchant}`,
      "",
      "Transactions (last 6 months):",
      formatTransactionsForLlm(transactions),
      "",
      existingRules.length > 0
        ? `Existing rules for this merchant: ${JSON.stringify(existingRules)}`
        : "Existing rules for this merchant: none"
    ].join("\n");

    const result = await runStructuredLlm({
      provider: aiContext.provider,
      apiKey: aiContext.apiKey,
      model: aiContext.model,
      systemPrompt: SYSTEM_PROMPT,
      userPrompt,
      maxTokens: 500,
      temperature: 0
    });

    if (!result.ok) {
      return { ok: false, patterns: [], error: result.error };
    }

    const validated = validatePatterns(result.data?.patterns);
    return { ok: true, patterns: validated };
  } catch (error: any) {
    return { ok: false, patterns: [], error: error?.message || "Unknown error" };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd services/api && npm test -- test/llm/recurring-detection.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add services/api/src/llm/recurring-detection.ts services/api/test/llm/recurring-detection.test.ts
git commit -m "feat(llm): add recurring pattern detection module"
```

---

### Task 7: Add existingRuleMatches Helper

**Files:**
- Modify: `services/api/src/recurring-scan.ts`
- Modify: `services/api/test/recurring-scan.test.ts`

- [ ] **Step 1: Write failing test for existingRuleMatches**

```typescript
// Add to services/api/test/recurring-scan.test.ts
import { DISMISSAL_REASON } from "../src/recurring-suggestions.ts";

test("existingRuleMatches returns true for existing rule", () => {
  resetStoreForTests({
    users: [{ id: USER_ID, email: "test@example.com", passwordHash: "h", salt: "s", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }],
    recurringRules: [{ id: "rr1", user_id: USER_ID, name: "Netflix", cadence: "monthly", amount: 15.99, merchant_pattern: "netflix", status: "active" }]
  });

  assert.ok(existingRuleMatches(USER_ID, "netflix", 16));
  assert.ok(!existingRuleMatches(USER_ID, "spotify", 9.99));
});

test("existingRuleMatches returns true for USER_DISMISSED", () => {
  resetStoreForTests({
    users: [{ id: USER_ID, email: "test@example.com", passwordHash: "h", salt: "s", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }],
    dismissedRecurringSuggestions: [{
      id: "d1",
      user_id: USER_ID,
      merchant_pattern: "netflix",
      amount: 15.99,
      dismissed_at: new Date().toISOString(),
      dismissed_reason: DISMISSAL_REASON.USER_DISMISSED
    }]
  });

  assert.ok(existingRuleMatches(USER_ID, "netflix", 16));
});

test("existingRuleMatches returns true for RULE_DELETED within cooldown", () => {
  const yesterday = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();

  resetStoreForTests({
    users: [{ id: USER_ID, email: "test@example.com", passwordHash: "h", salt: "s", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }],
    dismissedRecurringSuggestions: [{
      id: "d1",
      user_id: USER_ID,
      merchant_pattern: "netflix",
      amount: 15.99,
      dismissed_at: yesterday,
      dismissed_reason: DISMISSAL_REASON.RULE_DELETED
    }]
  });

  assert.ok(existingRuleMatches(USER_ID, "netflix", 16));
});

test("existingRuleMatches returns false for RULE_DELETED after cooldown", () => {
  const oldDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();

  resetStoreForTests({
    users: [{ id: USER_ID, email: "test@example.com", passwordHash: "h", salt: "s", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }],
    dismissedRecurringSuggestions: [{
      id: "d1",
      user_id: USER_ID,
      merchant_pattern: "netflix",
      amount: 15.99,
      dismissed_at: oldDate,
      dismissed_reason: DISMISSAL_REASON.RULE_DELETED
    }]
  });

  assert.ok(!existingRuleMatches(USER_ID, "netflix", 16));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd services/api && npm test -- --test-name-pattern="existingRuleMatches"`
Expected: FAIL with function not exported

- [ ] **Step 3: Add existingRuleMatches to recurring-scan.ts**

```typescript
// Add to services/api/src/recurring-scan.ts
import { DISMISSAL_REASON } from "./recurring-suggestions.ts";

const AMOUNT_TOLERANCE_MIN = 0.10;
const AMOUNT_TOLERANCE_PERCENT = 0.05;

function amountMatches(a: number, b: number): boolean {
  const tolerance = Math.max(AMOUNT_TOLERANCE_MIN, b * AMOUNT_TOLERANCE_PERCENT);
  return Math.abs(a - b) <= tolerance;
}

function isCooldownExpired(dismissedAt: string): boolean {
  const dismissedDate = new Date(dismissedAt);
  const expiresAt = new Date(dismissedDate.getTime() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
  return new Date() >= expiresAt;
}

export function existingRuleMatches(userId: string, merchant: string, amount: number): boolean {
  const store = loadStore();
  const rules = store.recurringRules.filter(r => r.user_id === userId);
  const dismissed = store.dismissedRecurringSuggestions.filter(d => d.user_id === userId);

  // Check for existing rule
  const hasRule = rules.some(r =>
    normalizeText(r.merchant_pattern || "") === normalizeText(merchant) &&
    amountMatches(amount, r.amount)
  );
  if (hasRule) return true;

  // Check for permanent dismissal
  const permanentlyDismissed = dismissed.some(d =>
    normalizeText(d.merchant_pattern || "") === normalizeText(merchant) &&
    amountMatches(amount, d.amount) &&
    d.dismissed_reason === DISMISSAL_REASON.USER_DISMISSED
  );
  if (permanentlyDismissed) return true;

  // Check for cooldown dismissal
  const cooldownDismissed = dismissed.some(d =>
    normalizeText(d.merchant_pattern || "") === normalizeText(merchant) &&
    amountMatches(amount, d.amount) &&
    d.dismissed_reason === DISMISSAL_REASON.RULE_DELETED &&
    !isCooldownExpired(d.dismissed_at)
  );
  if (cooldownDismissed) return true;

  return false;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd services/api && npm test -- --test-name-pattern="existingRuleMatches"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add services/api/src/recurring-scan.ts services/api/test/recurring-scan.test.ts
git commit -m "feat(recurring-scan): add existingRuleMatches helper"
```

---

### Task 8: Create Daily Task Runner

**Files:**
- Modify: `services/api/src/recurring-scan.ts`
- Modify: `services/api/test/recurring-scan.test.ts`

- [ ] **Step 1: Write failing test for daily task**

```typescript
// Add to services/api/test/recurring-scan.test.ts
test("runRecurringDetectionTask skips user without AI setup", async () => {
  resetStoreForTests({
    users: [{ id: USER_ID, email: "test@example.com", passwordHash: "h", salt: "s", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }],
    accounts: [{ id: ACCOUNT_ID, userId: USER_ID, normalizedKey: "checking", displayName: "Checking", accountType: "checking", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }],
    transactions: [
      { id: "t1", user_id: USER_ID, account_id: ACCOUNT_ID, transaction_date: "2026-03-15", merchant_normalized: "netflix", amount: -15.99, created_at: "2026-03-15T00:00:00Z" }
    ],
    userRecurringScanState: [{ user_id: USER_ID, last_recurring_scan_at: null, transactions_since_scan: 10, updated_at: "2026-01-01T00:00:00Z" }]
  });

  const result = await runRecurringDetectionTask();

  assert.equal(result.users_scanned, 0);
  assert.equal(result.suggestions_created, 0);
});

test("runRecurringDetectionTask skips merchant with < 2 transactions", async () => {
  // This test would require mocking the LLM, skip for now
  // Integration tests will cover this
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd services/api && npm test -- --test-name-pattern="runRecurringDetectionTask"`
Expected: FAIL with function not exported

- [ ] **Step 3: Add runRecurringDetectionTask function**

```typescript
// Add to services/api/src/recurring-scan.ts
import { resolveProviderForFeature } from "./ai.ts";
import { createId } from "./utils.ts";
import { detectRecurringPatternsWithLlm } from "./llm/recurring-detection.ts";

const USER_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes per user

export function hasAiSetup(userId: string): boolean {
  const result = resolveProviderForFeature(userId, "recurring_detection");
  return result.ok === true;
}

function getMatchingTransactionIds(userId: string, merchant: string, amount: number): string[] {
  const store = loadStore();
  const txns = store.transactions.filter(t =>
    t.user_id === userId &&
    !t.deleted_at &&
    normalizeText(t.merchant_normalized || "") === normalizeText(merchant) &&
    amountMatches(Math.abs(t.amount), amount)
  );
  return txns.map(t => t.id);
}

function createSuggestion(userId: string, merchant: string, amount: number, cadence: string): void {
  const store = loadStore();
  const matchingTxns = getMatchingTransactionIds(userId, merchant, amount);

  const suggestion = {
    id: createId("rsug"),
    user_id: userId,
    merchant_pattern: merchant,
    amount,
    detected_at: nowIso(),
    occurrence_count: matchingTxns.length,
    transaction_ids: matchingTxns.slice(0, 10)
  };

  store.recurringSuggestions.push(suggestion);
  saveStore(store);
}

export async function runRecurringDetectionTask(): Promise<{
  users_scanned: number;
  merchants_analyzed: number;
  suggestions_created: number;
}> {
  const store = loadStore();

  // Check overlap protection
  if (store.scanRunState.is_running) {
    console.log("[recurring-scan] Already running, skipping");
    return { users_scanned: 0, merchants_analyzed: 0, suggestions_created: 0 };
  }

  store.scanRunState.is_running = true;
  const startTime = Date.now();
  let runStatus: "success" | "partial" | "failed" = "success";
  let merchantsAnalyzed = 0;
  let suggestionsCreated = 0;

  try {
    const users = getUsersWithPendingScans();
    let usersScanned = 0;

    for (const user of users) {
      const userStartTime = Date.now();
      const daysSinceScan = daysBetween(user.last_recurring_scan_at, nowIso());
      const threshold = getAdaptiveThreshold(daysSinceScan);

      // Skip if not enough new transactions
      if (user.transactions_since_scan < threshold) {
        continue;
      }

      // Check AI setup
      if (!hasAiSetup(user.user_id)) {
        continue;
      }

      usersScanned++;

      // Get merchants with new transactions
      const newMerchants = getMerchantsWithNewTransactions(user.user_id);

      for (const merchant of newMerchants) {
        // Check per-user timeout
        if (Date.now() - userStartTime > USER_TIMEOUT_MS) {
          console.log(`[recurring-scan] User ${user.user_id} timeout, skipping remaining merchants`);
          runStatus = "partial";
          break;
        }

        // Pull 6-month history
        const history = getMerchantTransactions(user.user_id, merchant, { months: 6 });

        // Skip if fewer than 2 transactions OR fewer than 2 distinct months
        const distinctMonths = new Set(history.map(t => t.transaction_date.slice(0, 7)));
        if (history.length < 2 || distinctMonths.size < 2) {
          continue;
        }

        merchantsAnalyzed++;

        // LLM detection
        const result = await detectRecurringPatternsWithLlm({
          userId: user.user_id,
          merchant,
          transactions: history
        });

        if (!result.ok) {
          console.log(`[recurring-scan] LLM failed for ${merchant}: ${result.error}`);
          runStatus = "partial";
          continue;
        }

        // Create suggestions for detected patterns
        for (const pattern of result.patterns.filter(p => p.is_recurring)) {
          if (!existingRuleMatches(user.user_id, merchant, pattern.amount)) {
            createSuggestion(user.user_id, merchant, pattern.amount, pattern.cadence);
            suggestionsCreated++;
          }
        }
      }

      // Reset scan state
      updateUserScanState(user.user_id, {
        last_recurring_scan_at: nowIso(),
        transactions_since_scan: 0
      });
    }

    return { users_scanned: usersScanned, merchants_analyzed: merchantsAnalyzed, suggestions_created: suggestionsCreated };
  } catch (error: any) {
    console.log(`[recurring-scan] Scan failed: ${error.message}`);
    runStatus = "failed";
    return { users_scanned: 0, merchants_analyzed: merchantsAnalyzed, suggestions_created: suggestionsCreated };
  } finally {
    store.scanRunState.is_running = false;
    store.scanRunState.last_run_at = nowIso();
    store.scanRunState.last_run_status = runStatus;
    store.scanRunState.last_run_duration_ms = Date.now() - startTime;
    saveStore(store);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd services/api && npm test -- --test-name-pattern="runRecurringDetectionTask"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add services/api/src/recurring-scan.ts services/api/test/recurring-scan.test.ts
git commit -m "feat(recurring-scan): add daily task runner with LLM detection"
```

---

### Task 9: Integrate Scan Counter with Imports

**Files:**
- Modify: `services/api/src/imports.ts`

- [ ] **Step 1: Find where transactions are committed in imports.ts**

Search for `commitImport` function and identify where transactions are successfully created.

- [ ] **Step 2: Add import and call to incrementUserScanCounter**

```typescript
// At top of services/api/src/imports.ts
import { incrementUserScanCounter } from "./recurring-scan.ts";

// In commitImport function, after transactions are committed successfully
// Find the location where createdTransactions count is returned
// Add:
incrementUserScanCounter(userId);
```

- [ ] **Step 3: Write test for integration**

```typescript
// Add to services/api/test/recurring-scan.test.ts
test("commitImport increments scan counter", async () => {
  const { createImportJob, commitImport } = await import("../src/imports.ts");

  resetStoreForTests({
    users: [{ id: USER_ID, email: "test@example.com", passwordHash: "h", salt: "s", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }],
    accounts: [{ id: ACCOUNT_ID, userId: USER_ID, normalizedKey: "checking", displayName: "Checking", accountType: "checking", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }],
    transactions: [],
    userRecurringScanState: []
  });

  const csvText = "date,merchant,description,amount,account\n2026-03-15,Netflix,Subscription,-15.99,Checking";
  const job = await createImportJob({ userId: USER_ID, fileName: "test.csv", csvText });
  await commitImport(USER_ID, job.importJob.id);

  const state = getUserScanState(USER_ID);
  assert.ok(state.transactions_since_scan > 0, "Scan counter should be incremented");
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd services/api && npm test -- --test-name-pattern="commitImport increments"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add services/api/src/imports.ts services/api/test/recurring-scan.test.ts
git commit -m "feat(imports): increment scan counter on transaction commit"
```

---

### Task 10: Add Admin API Endpoint

**Files:**
- Modify: `services/api/src/server.ts`

- [ ] **Step 1: Add admin endpoint for running recurring scan**

```typescript
// In services/api/src/server.ts, find the route handlers section
// Add import at top:
import { runRecurringDetectionTask, incrementUserScanCounter } from "./recurring-scan.ts";

// Add route handler (find similar admin routes pattern):
if (req.method === "POST" && pathname === "/v1/admin/recurring-scan/run") {
  const result = await runRecurringDetectionTask();
  return res.status(200).json(result);
}
```

- [ ] **Step 2: Write test for admin endpoint**

```typescript
// Add to services/api/test/recurring-scan.test.ts or create admin test file
test("POST /v1/admin/recurring-scan/run returns scan results", async () => {
  resetStoreForTests({
    users: [{ id: USER_ID, email: "test@example.com", passwordHash: "h", salt: "s", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }]
  });

  // Would need to set up test server - skip for unit tests
  // Integration/E2E tests will cover this
});
```

- [ ] **Step 3: Commit**

```bash
git add services/api/src/server.ts
git commit -m "feat(server): add admin endpoint for recurring scan"
```

---

### Task 11: Run All Tests and Final Verification

- [ ] **Step 1: Run all recurring-related tests**

Run: `cd services/api && npm test -- --test-name-pattern="recurring"`
Expected: All PASS

- [ ] **Step 2: Run all tests to ensure no regressions**

Run: `cd services/api && npm test`
Expected: All PASS

- [ ] **Step 3: Run linting**

Run: `cd services/api && npm run lint`
Expected: No errors

- [ ] **Step 4: Final commit with all changes**

```bash
git add -A
git commit -m "feat: implement LLM-powered recurring detection

- Add userRecurringScanState and scanRunState to store
- Update amount tolerance to 5% with $0.10 floor
- Add scan state management module
- Add LLM recurring pattern detection
- Integrate scan counter with imports
- Add admin API endpoint for triggering scans

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Summary

This plan implements the LLM-powered recurring detection system in 11 tasks:

1. **Store updates** - New collections for scan state
2. **Amount tolerance** - 5% with $0.10 floor in recurrings.ts
3. **Amount tolerance** - 5% with $0.10 floor in recurring-suggestions.ts
4. **Scan state module** - Core helpers for state management
5. **Merchant helpers** - Detection helpers for merchants
6. **LLM module** - Pattern detection with LLM
7. **Rule matching** - existingRuleMatches helper
8. **Daily task** - Main runRecurringDetectionTask function
9. **Import integration** - Counter increment on commit
10. **Admin API** - Endpoint to trigger scans
11. **Final verification** - Run all tests and commit

Each task follows TDD: write failing test, implement, verify passing, commit.