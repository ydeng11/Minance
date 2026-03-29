---
# minance2-zwp1
title: Address account-identity review findings
status: completed
type: bug
priority: high
created_at: 2026-03-27T23:22:09Z
updated_at: 2026-03-27T23:25:22Z
---

Fix the review findings on legacy account identity handling:

- [x] Preserve institution-specific legacy account identities when names repeat
- [x] Make startup repair skip distinct legacy accounts and keep survivor keys stable
- [x] Cover filter-compatibility behavior through tests and verification

## Summary of Changes

Added regression tests for repeated legacy account names and safer startup repair behavior, restored institution-qualified legacy loader keys, and narrowed account-identity repair so it only merges true drift duplicates while preserving the survivor's existing key. Verified the related API suites with a focused tsx test run covering legacy loader, imports, transaction normalization, and account-identity repair.
