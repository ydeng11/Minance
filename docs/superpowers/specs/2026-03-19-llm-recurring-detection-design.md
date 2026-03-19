# LLM-Powered Recurring Detection Design

## Overview

Replace the existing amount-based recurring detection with an LLM-powered system that:
- Detects recurring patterns based on merchant behavior, not strict amount matching
- Runs as a daily scheduled task, triggered by new transactions
- Supports multiple recurring patterns per merchant (e.g., phone bill + internet bill)

## Architecture

```
Transaction Sources          User Scan State              Daily Task
(Import, Manual, API)  ───►  (dirty flag + count)  ───►  (check threshold,
                                                        run LLM per merchant)
                                                            │
                                                            ▼
                                                       LLM Detection
                                                       (6-month window,
                                                        pattern analysis)
                                                            │
                                                            ▼
                                                       Suggestions
                                                       (user accepts → rule)
```

## Data Model

### New Collection: `userRecurringScanState`

```typescript
interface UserRecurringScanState {
  user_id: string;
  last_recurring_scan_at: string | null;  // ISO timestamp
  transactions_since_scan: number;          // count since last scan
  updated_at: string;
}
```

### Singleton: `scanRunState`

Stored in main store as `store.scanRunState` for overlap protection:

```typescript
interface ScanRunState {
  is_running: boolean;
  last_run_at: string | null;
  last_run_status: "success" | "partial" | "failed" | null;
  last_run_duration_ms: number | null;
}
```

### Amount Tolerance

Replace `AMOUNT_TOLERANCE = 0.01` with 5% percentage-based tolerance, with a minimum floor:

```typescript
const AMOUNT_TOLERANCE_MIN = 0.10; // Minimum $0.10 tolerance for small amounts
const AMOUNT_TOLERANCE_PERCENT = 0.05; // 5% for larger amounts

function amountMatches(transactionAmount: number, ruleAmount: number): boolean {
  const tolerance = Math.max(AMOUNT_TOLERANCE_MIN, ruleAmount * AMOUNT_TOLERANCE_PERCENT);
  return Math.abs(transactionAmount - ruleAmount) <= tolerance;
}
```

| Rule Amount | Tolerance Used |
|-------------|----------------|
| $0.10       | $0.10 (floor)  |
| $10.00      | $0.50 (5%)     |
| $100.00     | $5.00 (5%)     |
| $1000.00    | $50.00 (5%)    |

### LLM Output Schema

```typescript
interface RecurringPattern {
  is_recurring: boolean;
  amount: number;
  cadence: "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly";
}

interface LlmDetectionResult {
  patterns: RecurringPattern[];
}
```

## Scheduled Task Logic

### Daily Task Flow

```typescript
async function runRecurringDetectionTask() {
  // Check overlap protection
  if (scanRunState.is_running) {
    log("Scan already running, skipping");
    return;
  }

  scanRunState.is_running = true;
  const startTime = Date.now();

  try {
    const users = getUsersWithPendingScans();

    for (const user of users) {
      const daysSinceScan = daysBetween(user.last_recurring_scan_at, now);
      const threshold = getAdaptiveThreshold(daysSinceScan);

      // Skip if not enough new transactions
      if (user.transactions_since_scan < threshold) {
        continue;
      }

      // Check AI setup
      if (!hasAiSetup(user.user_id)) {
        continue;
      }

      // Get merchants with new transactions
      const newMerchants = getMerchantsWithNewTransactions(user.user_id);

      for (const merchant of newMerchants) {
        // Pull 6-month history
        const history = getMerchantTransactions(user.user_id, merchant, { months: 6 });

        // Skip if fewer than 2 transactions OR fewer than 2 distinct months
        const distinctMonths = new Set(history.map(t => t.transaction_date.slice(0, 7)));
        if (history.length < 2 || distinctMonths.size < 2) {
          continue;
        }

        // LLM detection
        const result = await detectRecurringPatternsWithLlm({
          userId: user.user_id,
          merchant,
          transactions: history
        });

        if (!result.ok) {
          log(`LLM failed for ${merchant}: ${result.error}`);
          continue;
        }

        // Create suggestions for detected patterns
        for (const pattern of result.patterns.filter(p => p.is_recurring)) {
          if (!existingRuleMatches(user.user_id, merchant, pattern.amount)) {
            createSuggestion(user.user_id, merchant, pattern.amount, pattern.cadence);
          }
        }
      }

      // Reset scan state
      updateUserScanState(user.user_id, {
        last_recurring_scan_at: now(),
        transactions_since_scan: 0
      });
    }
  } finally {
    scanRunState.is_running = false;
    scanRunState.last_run_at = now();
    scanRunState.last_run_duration_ms = Date.now() - startTime;
    saveStore(store);
  }
}
```

### Adaptive Threshold

```typescript
function getAdaptiveThreshold(daysSinceScan: number): number {
  if (daysSinceScan >= 30) return 1;
  if (daysSinceScan >= 7) return 3;
  return 5;
}
```

| Days Since Scan | Minimum New Transactions |
|-----------------|-------------------------|
| 0-6             | 5                       |
| 7-29            | 3                       |
| 30+             | 1                       |

### Scan State Triggers

Increment `transactions_since_scan` when transactions are created via:
- `commitImport()` - after transactions committed (excluding duplicates skipped)
- Manual transaction creation API
- Any other transaction creation endpoint

**What counts as "new":**
- Transactions created after `last_recurring_scan_at` (or all if never scanned)
- Only non-deleted transactions
- Duplicates (skipped during import) do NOT increment the counter

### Race Conditions

**New transactions during scan:**
- Counter is incremented atomically before scan starts
- Scan reads counter value at start, resets to 0 when done
- Any transactions created during scan will be captured in next cycle

**User actions during scan:**
- If user dismisses a suggestion while scan is creating it: suggestion may briefly appear then be removed on next render
- If user creates a rule while scan is running: `existingRuleMatches` check is done at suggestion creation time, so rule will be detected

**Concurrent scans:**
- `scanRunState.is_running` flag prevents overlapping runs
- If flag is stuck (previous run crashed), admin can clear via API

## Scheduling Mechanism

The recurring detection task runs daily via the application server:

- **Trigger:** Scheduled internally via `setInterval` or external cron calling an admin endpoint
- **Time:** Runs at 3:00 AM server time (configurable)
- **Timeout:** Maximum 30 minutes per run
- **Overlap protection:** `scanRunState.is_running` flag prevents concurrent runs
- **Failure handling:** Log errors, continue with remaining users, report to audit log
- **Per-user timeout:** 5 minutes max; if exceeded, skip remaining merchants for that user and log as "partial"

### API Endpoint (Admin/Internal)

```
POST /v1/admin/recurring-scan/run
Authorization: Bearer <admin_token or internal>
```

Returns: `{ users_scanned: number, merchants_analyzed: number, suggestions_created: number }`

## Helper Functions

```typescript
// Date utilities
function daysBetween(date1: string | null, date2: string): number {
  if (!date1) return Infinity; // Never scanned = infinite days ago
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

function subMonths(date: string, months: number): string {
  const d = new Date(date);
  d.setMonth(d.getMonth() - months);
  return d.toISOString().slice(0, 10);
}

// Check if user has AI setup (wraps existing resolveProviderForFeature)
function hasAiSetup(userId: string): boolean {
  const result = resolveProviderForFeature(userId, "recurring_detection");
  return result.ok === true;
}

// Get users with pending scans (transactions_since_scan > 0)
function getUsersWithPendingScans(): UserRecurringScanState[] {
  return store.userRecurringScanState.filter(u => u.transactions_since_scan > 0);
}

// Get merchants with transactions created since last scan
// "New" = transactions where created_at > last_recurring_scan_at (or all if never scanned)
function getMerchantsWithNewTransactions(userId: string): string[] {
  const state = getUserScanState(userId);
  const since = state.last_recurring_scan_at;
  const txns = store.transactions.filter(t =>
    t.user_id === userId &&
    !t.deleted_at &&
    (since === null || t.created_at > since)
  );
  return [...new Set(txns.map(t => t.merchant_normalized).filter(Boolean))];
}

// Pull transactions for a merchant within rolling window
function getMerchantTransactions(userId: string, merchant: string, options: { months: number }): Transaction[] {
  const cutoff = subMonths(now(), options.months);
  return store.transactions.filter(t =>
    t.user_id === userId &&
    !t.deleted_at &&
    t.merchant_normalized === merchant &&
    t.transaction_date >= cutoff
  );
}

// Check if existing rule matches merchant + amount (within 5%)
function existingRuleMatches(userId: string, merchant: string, amount: number): boolean {
  const rules = store.recurringRules.filter(r => r.user_id === userId);
  const dismissed = store.dismissedRecurringSuggestions.filter(d => d.user_id === userId);

  // Check for existing rule
  const hasRule = rules.some(r =>
    normalizeText(r.merchant_pattern) === normalizeText(merchant) &&
    amountMatches(amount, r.amount)
  );
  if (hasRule) return true;

  // Check for permanent dismissal
  const permanentlyDismissed = dismissed.some(d =>
    normalizeText(d.merchant_pattern) === normalizeText(merchant) &&
    amountMatches(amount, d.amount) &&
    d.dismissed_reason === DISMISSAL_REASON.USER_DISMISSED
  );
  if (permanentlyDismissed) return true;

  // Check for cooldown dismissal
  const cooldownDismissed = dismissed.some(d =>
    normalizeText(d.merchant_pattern) === normalizeText(merchant) &&
    amountMatches(amount, d.amount) &&
    d.dismissed_reason === DISMISSAL_REASON.RULE_DELETED &&
    !isCooldownExpired(d.dismissed_at)
  );
  if (cooldownDismissed) return true;

  return false;
}

// Create a suggestion from detected pattern
function createSuggestion(userId: string, merchant: string, amount: number, cadence: string): RecurringSuggestion {
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
  return suggestion;
}

// Get transaction IDs matching merchant + amount (within 5% tolerance)
function getMatchingTransactionIds(userId: string, merchant: string, amount: number): string[] {
  const txns = store.transactions.filter(t =>
    t.user_id === userId &&
    !t.deleted_at &&
    normalizeText(t.merchant_normalized) === normalizeText(merchant) &&
    amountMatches(Math.abs(t.amount), amount)
  );
  return txns.map(t => t.id);
}

// Update user's scan state after processing
function updateUserScanState(userId: string, updates: Partial<UserRecurringScanState>): void {
  let state = store.userRecurringScanState.find(s => s.user_id === userId);
  if (!state) {
    state = { user_id: userId, last_recurring_scan_at: null, transactions_since_scan: 0, updated_at: nowIso() };
    store.userRecurringScanState.push(state);
  }
  Object.assign(state, updates, { updated_at: nowIso() });
  saveStore(store);
}
```

## LLM Integration

### New File: `services/api/src/llm/recurring-detection.ts`

```typescript
import { runStructuredLlm } from "./client.ts";
import { requireAiFeature } from "../ai.ts";

interface RecurringPattern {
  is_recurring: boolean;
  amount: number;
  cadence: "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly";
}

export async function detectRecurringPatternsWithLlm({
  userId,
  merchant,
  transactions
}): Promise<{ ok: boolean; patterns: RecurringPattern[]; error?: string }> {
  try {
    const aiContext = requireAiFeature(userId, "recurring_detection");

    const systemPrompt = `...`; // See System Prompt section
    const userPrompt = formatUserPrompt(merchant, transactions);

    const result = await runStructuredLlm({
      provider: aiContext.provider,
      apiKey: aiContext.apiKey,
      model: aiContext.model,
      systemPrompt,
      userPrompt,
      maxTokens: 500,
      temperature: 0
    });

    if (!result.ok) {
      return { ok: false, patterns: [], error: result.error };
    }

    // Validate LLM output schema
    const validated = validatePatterns(result.data.patterns);
    return { ok: true, patterns: validated };
  } catch (error) {
    return { ok: false, patterns: [], error: error.message };
  }
}

// Validate LLM output: filter invalid patterns
function validatePatterns(patterns: unknown): RecurringPattern[] {
  if (!Array.isArray(patterns)) return [];

  const VALID_CADENCES = ["weekly", "biweekly", "monthly", "quarterly", "yearly"];

  return patterns
    .filter(p => p && typeof p === "object")
    .filter(p => typeof p.is_recurring === "boolean")
    .filter(p => typeof p.amount === "number" && p.amount > 0)
    .filter(p => VALID_CADENCES.includes(p.cadence))
    .map(p => ({
      is_recurring: p.is_recurring,
      amount: Math.abs(p.amount),
      cadence: p.cadence
    }));
}
```

### Transaction History Format for LLM

Transactions are formatted as a simple list for the LLM:

```typescript
function formatTransactionsForLlm(transactions: Transaction[]): string {
  return transactions
    .sort((a, b) => b.transaction_date.localeCompare(a.transaction_date))
    .slice(0, 50) // Maximum 50 transactions per merchant
    .map(t => `- ${t.transaction_date}: $${Math.abs(t.amount).toFixed(2)}`)
    .join("\n");
}
```

Example output:
```
- 2026-03-15: $15.99
- 2026-02-15: $15.99
- 2026-01-15: $15.99
- 2025-12-15: $15.99
```

### LLM Call Orchestration

- Process merchants sequentially within a user scan (avoid rate limiting)
- Log each merchant's result for debugging
- If LLM fails for one merchant, continue with remaining merchants
- Total timeout per user: 5 minutes (configurable)

### System Prompt

```
You analyze transaction history to detect recurring spending patterns.
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
- Prefer the most common/recent amount for each pattern.
```

### User Prompt Template

```
Merchant: {merchant}

Transactions (last 6 months):
{formatted_transactions}

Existing rules for this merchant: {existing_rules_or_none}
```

## Rule Changes

### Amount for Projection

When a rule is created from a suggestion:
- Store the `amount` from the detected pattern
- Use most recent matched transaction's amount for UI projection
- Amount is not a strict filter (5% tolerance applies)

### Transaction Matching

Update `transactionMatchesRule()` in `recurrings.ts`:
- Remove fixed `AMOUNT_TOLERANCE = 0.01`
- Apply 5% tolerance with $0.10 floor (use `amountMatches()` function defined in Data Model)
- Merchant matching remains unchanged (substring match on normalized text)

## Conflict Resolution

| Scenario                                  | Action                                    |
|-------------------------------------------|-------------------------------------------|
| Rule exists for merchant + amount         | Skip suggestion (within 5% tolerance)     |
| Rule deleted within 30 days (RULE_DELETED)| Skip during cooldown period                |
| User dismissed suggestion (USER_DISMISSED)| Skip permanently                          |

## Error Handling

### LLM Failures

| Error Type          | Action                                    |
|---------------------|-------------------------------------------|
| Timeout/error       | Log, skip merchant, continue with others  |
| Invalid JSON        | Retry once, then skip                     |
| Rate limiting       | Backoff, continue next cycle              |

### Pre-LLM Checks

- Skip merchant if `< 2 transactions` in 6-month window
- Skip merchant if transactions are all in same month (need 2+ distinct months)
- Skip user if no AI credentials configured
- Exclude soft-deleted transactions (`deleted_at` is set)
- Maximum 50 transactions per merchant sent to LLM

## Files to Create/Modify

### New Files
- `services/api/src/llm/recurring-detection.ts` - LLM detection logic
- `services/api/src/recurring-scan.ts` - scheduled task + scan state management
- `services/api/test/recurring-scan.test.ts` - tests for scan state

### Modified Files
- `services/api/src/recurrings.ts` - update `transactionMatchesRule()` with 5% tolerance
- `services/api/src/imports.ts` - increment scan counter on `commitImport()`
- `services/api/src/server.ts` - add scan counter increment endpoints
- `services/api/src/store.ts` - add `userRecurringScanState` collection

## Migration

1. Add `userRecurringScanState` collection to store (empty initially)
2. Add `scanRunState` singleton to store for overlap protection:
   - `is_running: false`, `last_run_at: null`, `last_run_status: null`
3. For existing users, initialize scan state:
   - `last_recurring_scan_at: null`
   - `transactions_since_scan`: count of non-deleted transactions (`deleted_at` is null)
4. **Note:** This triggers immediate scans for all existing users on first daily run (intentional - runs LLM detection for all existing history)
5. Existing `recurringSuggestions` and `recurringRules` remain unchanged
6. Update `transactionMatchesRule()` with new tolerance logic (5% with $0.10 floor)

## Test Requirements

### `services/api/test/recurring-scan.test.ts`

- Scan state increment/decrement on transaction create
- Adaptive threshold calculation
- LLM called only when threshold met
- Suggestions created for detected patterns
- Existing rules skipped (no duplicate suggestions)
- Cooldown respected (RULE_DELETED within 30 days)
- Permanent dismissal respected (USER_DISMISSED)
- Merchant with < 2 transactions skipped
- User without AI setup skipped
- Amount tolerance (5% with floor) works correctly

### `services/api/test/llm/recurring-detection.test.ts`

- LLM returns valid patterns
- LLM returns empty patterns for non-recurring
- LLM returns multiple patterns for same merchant
- Invalid JSON handled gracefully
- Timeout handled gracefully
- Invalid cadence filtered out
- Negative/zero amounts filtered out
- Missing patterns array returns empty