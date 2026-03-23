---
# minance2-vhts
title: Simplify recent filter polish changes
status: completed
type: task
priority: normal
created_at: 2026-03-23T00:55:08Z
updated_at: 2026-03-23T00:55:47Z
---

## Goal
Simplify the recent Explorer and Transactions filter polish changes without changing behavior.

## Todo
- [x] Review touched filter files for redundant logic or avoidable complexity
- [x] Apply a narrow simplification pass to the recent changes
- [x] Run verification for the simplified code and summarize the result

## Summary of Changes
- Removed the duplicate recurring filter pass from `services/api/src/transactions.ts` so `listTransactions` now relies on the shared recurring filter logic already applied inside `filterUserTransactions`.
- Kept the cleanup scoped to the recent filter polish diff and left the rest of the new Explorer and Transactions behavior unchanged.
- Verified the simplification with `just check`.
