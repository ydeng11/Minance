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

### Updated Rule Matching

Replace `AMOUNT_TOLERANCE = 0.01` with 5% percentage-based tolerance:

```typescript
function amountMatches(transactionAmount: number, ruleAmount: number): boolean {
  return Math.abs(transactionAmount - ruleAmount) <= ruleAmount * 0.05;
}
```

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

      // Skip if fewer than 2 transactions
      if (history.length < 2) {
        continue;
      }

      // LLM detection
      const patterns = await detectRecurringPatternsWithLlm(merchant, history);

      // Create suggestions for detected patterns
      for (const pattern of patterns.filter(p => p.is_recurring)) {
        if (!existingRuleMatches(merchant, pattern.amount)) {
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
- `commitImport()` - after transactions committed
- Manual transaction creation API
- Any other transaction creation endpoint

## LLM Integration

### New File: `services/api/src/llm/recurring-detection.ts`

```typescript
export async function detectRecurringPatternsWithLlm({
  merchant,
  transactions,
  aiContext
}): Promise<LlmDetectionResult> {
  // Uses existing runStructuredLlm infrastructure
  // Returns { patterns: [...] }
}
```

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
- A pattern is recurring if transactions appear consistently at regular intervals (at least 2 occurrences).
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
- Apply 5% tolerance: `Math.abs(txnAmount - ruleAmount) <= ruleAmount * 0.05`
- Merchant matching remains unchanged (substring match on normalized text)

## Conflict Resolution

| Scenario                           | Action                                    |
|------------------------------------|-------------------------------------------|
| Rule exists for merchant + amount  | Skip suggestion (within 5% tolerance)     |
| Rule deleted within 30 days        | Skip (cooldown from dismissed registry)   |
| User dismissed suggestion          | Skip permanently                          |

## Error Handling

### LLM Failures

| Error Type          | Action                                    |
|---------------------|-------------------------------------------|
| Timeout/error       | Log, skip merchant, continue with others  |
| Invalid JSON        | Retry once, then skip                     |
| Rate limiting       | Backoff, continue next cycle              |

### Pre-LLM Checks

- Skip merchant if `< 2 transactions` in 6-month window
- Skip user if no AI credentials configured
- Exclude soft-deleted transactions (`deleted_at` is set)

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
2. For existing users, set `last_recurring_scan_at: null`, `transactions_since_scan: total_txn_count`
3. Existing `recurringSuggestions` and `recurringRules` remain unchanged
4. Update `transactionMatchesRule()` with new tolerance logic

## Open Questions

None - design is complete.