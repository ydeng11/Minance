---
# minance2-qyow
title: Fix AI Assistant transcript restore across reopen and refresh
status: completed
type: bug
priority: normal
created_at: 2026-03-21T20:37:33Z
updated_at: 2026-03-21T20:46:46Z
---

## Context

AI Assistant conversation history is saved but the visible transcript disappears when the drawer closes/reopens and after refresh.

## Todo

- [x] Confirm current branch/worktree workflow and move work if needed
- [x] Add transcript snapshot helpers and tests
- [x] Keep assistant drawer mounted and wire transcript hydration
- [x] Add regression coverage for reopen/refresh/reset flows
- [x] Run quality gates and finalize handoff

## Summary of Changes

- Added browser transcript snapshot helpers with 1-hour expiry validation and stale-state cleanup for assistant conversations.
- Kept the assistant drawer mounted while hidden so close/reopen preserves in-memory state and in-flight responses.
- Added Playwright coverage for transcript restore after reload and transcript clearing via New conversation without depending on live assistant responses.

## Notes

- Remaining follow-up: `e2e/specs/assistant-placement.spec.ts` still has a pre-existing keyboard focus-order failure on this clean branch; it was not changed in this fix.
