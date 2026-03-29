---
# minance2-53g1
title: Fix legacy account identity drift in imports
status: completed
type: bug
priority: high
created_at: 2026-03-27T21:15:18Z
updated_at: 2026-03-27T23:40:52Z
---

## Context

Legacy-loaded accounts can have institution-prefixed normalized keys like `chase hyatt`, while current import/manual flows resolve by display name like `Hyatt`. This creates duplicate accounts and mis-linked imported transactions.

## Todo

- [x] Add shared backend account identity resolver and use it in imports/manual transactions
- [x] Add startup repair for duplicate display-name accounts with legacy drift
- [x] Align legacy loader to current display-name account identity model
- [x] Update transactions UI to render resolved account labels
- [x] Add regression tests for import/manual/repair/legacy loader/UI
- [x] Run targeted verification and `just check`
- [x] Add summary and close bean if all work completes

## Summary of Changes

- Added shared account identity resolution and canonical transaction fingerprint helpers so imports and manual transactions reuse drifted legacy accounts instead of creating duplicates.
- Added an API startup repair that merges duplicate display-name accounts, reassigns transactions and recurring rules, rewrites dedupe fingerprints, and records an audit event.
- Aligned the legacy loader to use display-name normalized keys and updated the transactions ledger to show resolved account labels from account metadata.
- Added regression coverage for import matching, manual transaction reuse, startup repair behavior, legacy loader normalization, ledger account rendering, and soft-deleted transaction re-import behavior.
- Fixed import commit so a matching soft-deleted transaction is restored instead of invisibly blocking re-import as a duplicate.
- Verified with targeted API and web tests and `just check`.
