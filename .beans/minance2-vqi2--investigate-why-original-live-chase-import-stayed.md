---
# minance2-vqi2
title: Investigate why original live Chase import stayed staged
status: completed
type: bug
priority: normal
created_at: 2026-03-28T01:25:37Z
updated_at: 2026-03-28T01:27:41Z
---

## Goal

Determine why the original live-user import for Chase8457_Activity20260101_20260325_20260326.CSV remained at staged processed rows without creating a committed transaction.

## Todo

- [x] Gather SQLite evidence for the original import lifecycle
- [x] Trace the import status and commit code path
- [x] Identify the most likely root cause with supporting evidence
- [x] Record summary of findings

## Summary of Changes

Confirmed in `/Users/ihelio/code/minance2/services/api/data/minance.sqlite` that import `imp_437d742f-b3f1-4a76-b846-4abd29c95625` remained in a staged `needs_review` state with a processed-row override assigning `Hyatt`, but no committed transaction rows and no `commit_summary_json`. Traced `/Users/ihelio/code/minance2/services/api/src/imports.ts` to verify `updateImportProcessedRow()` only saves staged overrides and emits `import.processed_row.updated`, while `commitImport()` is the only path that pushes to `store.transactions`, sets `commitSummary`, saves the store, and emits `import.committed`. The stored audit trail contains `import.created` and `import.processed_row.updated`, but no `import.committed`, so the most likely root cause is that the original live-user import was reviewed and reassigned but never actually committed.
