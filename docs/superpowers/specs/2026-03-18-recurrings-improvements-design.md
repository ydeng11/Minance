# Recurrings Improvements Design

**Date:** 2026-03-18
**Status:** Draft
**Author:** Claude

## Problem Statement

The Recurrings page exists but is disconnected from the rest of the application:

1. **Dashboard and Explorer** display "Recurring Spend" calculated via heuristic (merchants appearing in 2+ months), ignoring user-created recurring rules
2. **Transactions page** has no visibility into recurring status - no filter, no indicator, no way to create rules from transactions
3. **Recurrings page** lacks discovery mechanisms - users must manually create rules without suggestions
4. **No feedback loop** - rules created don't affect what's shown as "recurring" in analytics

Users cannot effectively track and manage their recurring expenses because the feature is siloed and disconnected.

## Solution Overview

**Core Principle:** "Recurring Spend" equals transactions matched by user-defined rules. Users control what counts as recurring. The heuristic becomes a discovery tool (suggestions) rather than the source of truth.

### User Value

Based on research of personal finance apps (Rocket Money, Monarch, YNAB), users want recurring tracking for:

1. **Know their floor** - How much income is already committed each month
2. **Find forgotten subscriptions** - Opportunities to save money
3. **Cash flow forecasting** - When bills are due
4. **Actionable insights** - See exactly what's recurring to cancel/switch

## Changes by Page

### Dashboard & Explorer

**Recurring Spend Calculation:**
- Change from heuristic to rule-based: `sum(amount) WHERE recurring_rule_id IS NOT NULL`
- The number reflects what the user has explicitly defined as recurring
- Accurate and actionable

**Suggestions Callout:**
- Subtle indicator near the Recurring Spend KPI when suggestions exist
- Design: Pulsing ✨ emoji next to label, "+N untracked" text with tooltip
- Clicking navigates to Recurrings page
- Disappears when no suggestions remain

**Drill-down:**
- Clicking Recurring Spend KPI navigates to Transactions page with recurring filter applied

### Transactions Page

**Recurring Filter:**
- Add "Recurring" filter option alongside type, category, account filters
- Backend already supports `recurring_rule_id` query parameter
- Shows only transactions that have a linked recurring rule

**Recurring Badge:**
- Visual indicator (small icon/badge) on transactions with a recurring rule
- Hover shows which rule; click could filter to related transactions

**Create Rule from Transaction:**
- Action menu option to create a new recurring rule
- Pre-fills: amount, merchant_pattern, category, account from the transaction
- User adjusts cadence and saves

### Recurrings Page

**Suggestions Section:**
- New section showing heuristic-detected potential recurring items
- Each suggestion shows: merchant, amount, frequency
- "Create rule" button pre-fills the rule editor
- "Dismiss" button removes from suggestions (stored in dismissed registry)

**Monthly/Yearly Totals:**
- Summary band at top showing active commitment
- Format: "Active recurring: $X/month · $Y/year"
- Updates based on active rules only

**Expanded Rule Fields:**
- Backend already supports `category_final`, `account_id`, `direction` filters
- Add these as dropdowns to the rule editor form
- Enables more precise matching (e.g., "Netflix on Credit Card only")

## Backend Architecture

### Server-side Detection

Run detection on transaction import rather than on-demand:

```
On transaction import (async, non-blocking):
  1. Run heuristic to detect potential recurring
  2. Store results in recurring_suggestions collection
  3. Filter against dismissed_recurring_suggestions registry
```

**Detection Algorithm:**
- Uses the same heuristic as current analytics: merchant appears in 2+ distinct months
- Groups by (merchant_normalized, amount) where amount matches within $0.01 tolerance
- Minimum 2 occurrences to qualify as suggestion
- Detection runs asynchronously after import completes (non-blocking)

**Detection Timing:**
- Runs after each transaction import completes
- Does not block the import response
- Failures logged but don't affect import success

### New Data Collections

**recurring_suggestions:**
```typescript
{
  id: string;
  user_id: string;
  merchant_pattern: string;
  amount: number;
  detected_at: string;
  occurrence_count: number;
  transaction_ids: string[];  // Last 10 matching transactions, capped
}
```

**transaction_ids lifecycle:**
- Stores up to 10 most recent matching transaction IDs
- Updated on each detection run (newest first)
- Cleared when transactions are deleted
- Used for "Create rule" preview, not exhaustive tracking

**dismissed_recurring_suggestions:**
```typescript
{
  id: string;
  user_id: string;
  merchant_pattern: string;
  amount: number;
  dismissed_at: string;
  dismissed_reason: "user_dismissed" | "rule_deleted";
  cooldown_until: string | null;  // null for permanent dismissals
}
```

### API Endpoints

**GET /v1/recurrings/suggestions**
- Returns list of active suggestions
- Query param: `?count_only=true` returns just the count (for Dashboard)

**POST /v1/recurrings/suggestions/:id/dismiss**
- Dismisses a suggestion
- Adds to dismissed registry with appropriate reason

**POST /v1/recurrings/suggestions/:id/create-rule**
- Creates a rule from a suggestion
- Removes from suggestions, links matching transactions

### Detection Lifecycle

| Event | Action |
|-------|--------|
| New transactions imported | Run detection, update suggestions |
| User creates rule from suggestion | Remove from suggestions, link transactions |
| User dismisses suggestion | Add to dismissed registry (permanent) |
| User deletes a rule | Add to dismissed registry (30-day cooldown) |
| Cooldown expires | Remove from registry, eligible for re-detection |

### Cooldown Logic

- **User dismisses suggestion** → Permanent. Never re-suggest.
- **User deletes a rule** → 30-day cooldown. After 30 days, if transactions match the heuristic again, re-suggest.

This handles the common case where a user cancels a subscription (deletes rule), then resubscribes later. The 30-day window aligns with typical monthly billing cycles.

## Implementation Phases

### Phase 1: Foundation
- Create `recurring_suggestions` and `dismissed_recurring_suggestions` collections
- Add detection logic to transaction import flow
- Add `/v1/recurrings/suggestions` endpoint
- Change Recurring Spend calculation to rule-based

### Phase 2: Recurrings Page
- Add suggestions section with create/dismiss actions
- Add monthly/yearly totals summary
- Add category, account, direction fields to rule editor

### Phase 3: Transactions Page
- Add recurring filter to header filters
- Add recurring badge to transaction rows
- Add "Create rule from transaction" action

### Phase 4: Dashboard & Explorer
- Add suggestions callout component
- Wire up drill-down to filtered transactions

## Error Handling

**Detection failure during import:**
- Log error but don't fail the import
- Retry detection on next import
- User can manually trigger detection from Recurrings page

**Suggestion API failure:**
- Return appropriate error codes (404, 500)
- UI shows error message in suggestions section
- Retry button available

**Rule creation from suggestion failure:**
- Return validation errors to user
- Keep suggestion in list until successfully created

## Migration Consideration

Changing "Recurring Spend" from heuristic to rule-based will change the numbers users see in Dashboard and Explorer:

- **Before launch:** Users with no rules will see $0 recurring spend
- **Mitigation:** The suggestions callout will immediately surface potential recurring items
- **Communication:** Consider in-app notice: "Recurring spend now shows only items you've explicitly marked as recurring"

## Edge Cases

**Rule deleted, user resubscribes:**
- Rule deletion adds entry to dismissed registry with 30-day cooldown
- After 30 days, new transactions will be detected and suggested again

**User dismisses, then changes mind:**
- Currently no way to restore dismissed suggestions
- Future: Add "View dismissed" option on Recurrings page

**Transaction matches multiple rules:**
- First rule wins (by creation date)
- UI should warn if creating overlapping rules

**Amount varies slightly:**
- Detection uses exact amount matching (within $0.01 tolerance)
- Future: Add amount range support to rules

## Success Metrics

1. **Adoption:** % of users with at least one active recurring rule
2. **Coverage:** % of detected suggestions converted to rules
3. **Accuracy:** User-reported false positives in suggestions
4. **Engagement:** Frequency of Recurrings page visits after feature launch

## Out of Scope (Future)

- Next expected date visualization on Recurrings page
- Bulk operations on rules
- Amount range matching for rules
- Manual transaction-to-rule linking (Evaluate covers this)
- Cash flow calendar view of upcoming recurring charges