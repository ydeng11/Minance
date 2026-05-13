---
# minance2-avz6
title: Fix recurring Evaluate links matching
status: completed
type: bug
priority: normal
created_at: 2026-05-12T22:08:10Z
updated_at: 2026-05-13T02:15:51Z
---

Investigate and fix why creating a recurring phone bill rule with amount 250, merchant pattern AT&T, and Bills & Utilities category does not surface related expenses when Evaluate links is used.

- [x] Trace recurring rule evaluation flow
- [x] Reproduce AT&T phone bill matching against local data
- [x] Implement matching fix
- [x] Add/update tests
- [x] Verify checks and browser/API behavior

Notes: Evaluation flows through services/api/src/recurrings.ts transactionMatchesRule. The root issue is merchant pattern comparison treating AT&T and ATT*BILL PAYMENT as different strings. Patched matching with a punctuation-insensitive compact fallback while preserving direction, account, category, and amount filters.


## Summary of Changes

- Added merchant matching normalization for punctuation variants and HTML-escaped AT&T names.
- Added recurring evaluation regression coverage for AT&T phone and internet merchant forms.
- Verified exact live-data rule settings: AT&T Internet matches 8 Chase Unlimited rows, and AT&T Phone matches 8 Chase CSP rows.


## Reopened May 13

User reported AT&T Phone still links unrelated transactions in the running app. Investigating whether the live API process is stale or the saved recurring rule is missing merchant/account constraints.

- [x] Inspect saved AT&T recurring rule in live store
- [x] Verify running API code path
- [x] Fix or restart as needed
- [x] Re-evaluate rule and verify linked rows


## Follow-up Summary

- Found the live page had edited AT&T Phone fields in the draft while the persisted rule was still the old phone bill / $250 record.
- Changed Evaluate links to validate and save the visible draft before evaluating links.
- Added frontend regression coverage that evaluation persists the visible draft before linking, plus shared draft serialization coverage.
- Reconfirmed backend merchant matching handles AT&T punctuation and HTML-escaped AT&amp;T names.
- Verification passed: recurring backend test, @minance/web test, just build-web, and just check.
