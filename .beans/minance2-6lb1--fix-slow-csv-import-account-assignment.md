---
# minance2-6lb1
title: Fix slow CSV import account assignment
status: completed
type: bug
priority: normal
created_at: 2026-05-20T22:03:26Z
updated_at: 2026-05-20T22:06:55Z
---

Implement and test a bulk processed-row account assignment path so CSV import account assignment does not issue one full rebuild per row.\n\n- [x] Add backend bulk processed-row update behavior\n- [x] Wire API route and client endpoint\n- [x] Update import UI to use bulk assignment\n- [x] Add backend and frontend tests\n- [x] Run targeted tests and simplifier

## Summary of Changes\n\nAdded a bulk processed-row update path for CSV import account assignment. The API now accepts multiple row IDs, applies account-name overrides in one store mutation, rebuilds processed rows once, saves once, and records a bulk audit event. The web import account selector now calls the bulk endpoint instead of one PATCH per row. Added backend coverage for bulk assignment plus frontend API/page contract tests. Verified with targeted tests and just check.
