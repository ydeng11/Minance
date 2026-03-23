---
# minance2-u5v6
title: Make Transactions page width consistent with app pages
status: completed
type: bug
priority: normal
created_at: 2026-03-22T15:39:21Z
updated_at: 2026-03-22T23:00:07Z
---

## Context

The Transactions page uses a different content width than the rest of the app.

## Todo

- [x] Inspect the shared shell/page layout and confirm the root cause
- [x] Add a regression test for the width rule
- [x] Update the implementation so Transactions matches the standard page width
- [x] Run targeted verification
- [x] Summarize the change and close the bean if all tasks are complete

## Summary of Changes

- Removed the Transactions-only wide shell override so the page now uses the same `max-w-6xl` container as the rest of the app.
- Updated the shared shell width regression test to assert that `/transactions` and nested transactions routes stay on the standard app width.
- Verified the change with `pnpm --filter @minance/web test src/components/layout/shellWidth.test.ts`, `just build-web`, and `just check`.

## Follow-up

The fixed `max-w-6xl` container is still too rigid. The user wants the Transactions page width to scale proportionally with available browser space.


## Follow-up Todo

- [x] Write the approved responsive-width design note
- [x] Create an implementation plan for the responsive shell width change
- [x] Implement the responsive width rule and tests
- [x] Verify the responsive width change
- [x] Summarize the follow-up work and close the bean



## Follow-up Summary of Changes

- Added a design note documenting the approved UX choice: Transactions should use a fluid shell with a wider cap, not the standard fixed page width.
- Added an implementation plan for the responsive shell-width follow-up.
- Restored the Transactions route width helper and regression test so `/transactions` and nested Transactions routes use `max-w-[96rem]` while other pages stay at `max-w-6xl`.
- Verified the change with `pnpm --filter @minance/web test src/components/layout/shellWidth.test.ts`, `just build-web`, and `just check`.
