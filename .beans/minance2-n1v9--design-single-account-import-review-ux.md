---
# minance2-n1v9
title: Design single-account import review UX
status: completed
type: task
priority: normal
created_at: 2026-03-29T18:06:45Z
updated_at: 2026-03-29T19:21:30Z
---

## Goal
Design a simpler import review UX optimized for the assumption that most CSV imports are already per-account.

## Todo
- [x] Explore current import review context and constraints
- [x] Clarify desired default behavior for account selection in single-account imports
- [x] Propose design approaches with trade-offs and recommendation
- [x] Present the proposed UI design for approval

## Summary of Changes

- Explored the current import review UX and confirmed overlap between processed-row account assignment and reconciliation account assignment.
- Collected product decisions for a simpler single-account-first flow: choose one import account during review, and hide reconciliation unless issues require escalation.
- Wrote the approved design doc to `docs/plans/2026-03-29-single-account-import-review-design.md`.
- Wrote the matching implementation plan to `docs/plans/2026-03-29-single-account-import-review-implementation-plan.md`.
