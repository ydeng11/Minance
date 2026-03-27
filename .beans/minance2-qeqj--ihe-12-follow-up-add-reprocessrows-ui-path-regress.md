---
# minance2-qeqj
title: 'IHE-12 follow-up: Add reprocessRows UI-path regression coverage'
status: completed
type: task
priority: normal
created_at: 2026-03-27T02:03:35Z
updated_at: 2026-03-27T02:25:36Z
parent: minance2-nccz
---

Residual follow-up from IHE-12 (`minance2-4sch`).

The current fix is covered by focused account-assignment and backend import tests, but we still do not have a higher-level automated test that exercises the actual `reprocessRows` UI path.

## Desired outcome
- add automated coverage for the page-level reprocess interaction
- assert the success notice and refreshed import state after reprocess
- catch regressions in the client wiring around the reprocess action

## Summary of Changes

- Extracted the import-page reprocess orchestration into `runReprocessRowsFlow` so the real refresh-and-notice sequence is directly testable.
- Updated `ImportPage` to call that helper for the actual reprocess action without changing the user-visible flow.
- Added regression coverage that verifies the orchestration order: reprocess, refresh processed rows, refresh imports, then publish the success notice.

## Verification

- `pnpm --filter @minance/web test -- src/app/import/accountAssignment.test.ts`
- `just build-web`
- `just check`
