---
# minance2-9565
title: Investigate slow CSV import account assignment
status: completed
type: bug
priority: normal
created_at: 2026-05-20T21:56:50Z
updated_at: 2026-05-20T21:58:34Z
---

Investigate why CSV import takes a long time when account assignment is needed.\n\n- [x] Trace frontend import assignment flow\n- [x] Trace backend import assignment/reconciliation flow\n- [x] Identify likely performance bottleneck\n- [x] Report findings and recommended fix

## Summary of Changes\n\nInvestigated CSV import account assignment latency. The frontend assigns an account by issuing one processed-row PATCH per affected row, then reloads import context. Each backend PATCH rebuilds every processed row for the import, recomputes duplicate/category/account-derived fields, saves the whole store, and returns a summary. This makes account assignment roughly O(row_count^2) for import-level or reconciliation-level assignment, with additional refresh/reconciliation reads after the batch.
