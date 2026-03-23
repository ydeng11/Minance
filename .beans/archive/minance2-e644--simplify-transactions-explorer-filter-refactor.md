---
# minance2-e644
title: Simplify transactions explorer filter refactor
status: completed
type: task
created_at: 2026-03-22T15:00:49Z
updated_at: 2026-03-22T15:00:49Z
---

Behavior-preserving cleanup pass for the recent Transactions Explorer-style filter refactor.

## Checklist
- [x] Review the recent Transactions filter diff
- [x] Simplify recently modified code without changing behavior
- [x] Re-run focused verification for the simplified code

## Summary of Changes

- Removed the invented tag suggestion block from the Transactions advanced filters modal to keep the refactor closer to the original Transactions behavior.
- Consolidated duplicated filter validation and commit logic in the Transactions page into a single helper.
- Re-ran the six relevant Playwright specs and a fresh web build after the cleanup pass.
- Resolved the stale generated .next-e2e artifact before the final successful build verification.
