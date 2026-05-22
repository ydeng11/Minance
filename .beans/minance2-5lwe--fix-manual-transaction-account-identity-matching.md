---
# minance2-5lwe
title: Fix manual transaction account identity matching
status: completed
type: bug
priority: normal
created_at: 2026-05-22T15:43:34Z
updated_at: 2026-05-22T15:45:35Z
---

Investigate why creating a new transaction for COSTCO (CITI | CREDIT) creates a new account instead of using the existing account.\n\n- [x] Reproduce or trace transaction creation account resolution\n- [x] Implement focused fix\n- [x] Add targeted regression coverage\n- [x] Run focused verification

## Summary of Changes\n\nManual transaction account resolution now uses the shared account identity resolver, and that resolver treats generated display identifiers like COSTCO (CITI | CREDIT) as aliases for the stored account. Added a regression test that creates a manual transaction with the Costco display label and verifies no duplicate account is created.\n\nVerification: env NODE_ENV=test pnpm exec tsx --test services/api/test/transactions-normalization.test.ts; just check.
