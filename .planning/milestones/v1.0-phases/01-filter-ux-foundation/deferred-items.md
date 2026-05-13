# Deferred Items for Plan 01-02

**Logged:** 2026-04-03

## Pre-existing TypeScript Error

**File:** `apps/web/src/app/transactions/TransactionsCommandBar.tsx`
**Line:** 115
**Error:** `Type 'TransactionsFilterState' is not assignable to type 'Record<string, unknown>'.`

**Context:** This error is from previous plan 01-01 that added ActiveFilterBadges integration to TransactionsCommandBar but did not spread the filters object for type compatibility.

**Fix needed:** Change `filters={filters}` to `filters={{ ...filters }}` when passing to ActiveFilterBadges component.

**Scope:** Out of scope for plan 01-02 (Explorer filter consolidation). Will be addressed in plan 01-03 (Transactions filter UX).

---

*This file tracks out-of-scope issues discovered during execution per deviation rules.*