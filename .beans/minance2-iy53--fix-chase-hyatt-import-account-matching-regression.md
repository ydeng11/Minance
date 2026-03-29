---
# minance2-iy53
title: Fix Chase Hyatt import account matching regression
status: completed
type: bug
priority: high
created_at: 2026-03-28T01:34:12Z
updated_at: 2026-03-28T01:39:54Z
---

Importing Chase activity CSVs and assigning to an existing account like "Hyatt | (Chase | Credit)" can incorrectly create a new account instead of reusing the existing one.

## Tasks
- [x] Reproduce and identify the root cause in import/account identity matching
- [x] Add a failing test that captures the regression
- [x] Fix account type handling across import, accounts UI, and related filters
- [x] Run targeted verification and document the result

## Summary of Changes

- Root cause: import reconciliation and commit still matched accounts by raw display-name-derived keys, so legacy or institution-qualified keys like `chase hyatt` were treated as missing when staged rows only carried `Hyatt`.
- Fixed `services/api/src/imports.ts` to resolve canonical account identity during staged fingerprinting, reconciliation, and commit, so imports now reuse the existing account and persist the canonical account key and fingerprint.
- Fixed `apps/web/src/app/import/accountAssignment.ts` so import dropdown reconciliation also recognizes `displayIdentifier` labels like `Hyatt (Chase | Credit)` and snaps them back to the stored account value.
- Added regression coverage in `services/api/test/imports.test.ts` and `apps/web/src/app/import/accountAssignment.test.ts`, then verified with targeted tests plus `just check`.
