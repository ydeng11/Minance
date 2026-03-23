---
# minance2-063q
title: Simplify UI filter fix diff
status: completed
type: task
priority: normal
created_at: 2026-03-22T22:58:49Z
updated_at: 2026-03-22T22:59:34Z
---

## Scope
- [x] Review the touched Explorer and Transactions files for behavior-preserving simplifications
- [x] Apply any small readability cleanups that do not change behavior
- [x] Re-run verification for the cleanup pass

## Summary of Changes
- Scoped the Explorer merchant-field assertion to the advanced-filters modal so the test describes intent more directly.
- Reused a single `rowCells` locator in the Transactions ledger test instead of repeating the same cell lookup.
- Re-ran the targeted Playwright checks and `just check` after the cleanup pass.
