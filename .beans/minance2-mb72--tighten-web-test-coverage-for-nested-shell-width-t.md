---
# minance2-mb72
title: Tighten web test coverage for nested shell width tests
status: completed
type: task
priority: normal
created_at: 2026-03-22T23:02:51Z
updated_at: 2026-03-22T23:40:57Z
---

## Context

`pnpm --filter @minance/web test src/components/layout/shellWidth.test.ts` passes and directly verifies the Transactions shell-width regression, but the default `just check` / `pnpm --filter @minance/web test` flow did not visibly surface that nested test file in its summary.

## Goal

Make the normal web test workflow reliably include and clearly surface nested layout regression tests such as `src/components/layout/shellWidth.test.ts`.

## Todo

- [x] Inspect the current `@minance/web` test command and file glob behavior
- [x] Reproduce why nested shell width tests are not obvious in the default web test run
- [x] Update the test command, glob, or structure so nested layout tests are covered by the standard workflow
- [x] Verify with `pnpm --filter @minance/web test` and `just check`
- [x] Summarize the change and close the bean



## Summary of Changes

- Reproduced that `/bin/sh` expands the unquoted `src/**/*.test.ts` glob only one directory deep, which caused the default web test script to miss nested tests such as `src/components/layout/shellWidth.test.ts`.
- Added a root script-policy regression test that requires the `@minance/web` test script to quote its recursive glob.
- Updated `apps/web/package.json` so the standard web test workflow uses `tsx --test "src/**/*.test.ts"`, allowing `tsx` to expand nested tests correctly.
- Fixed the hidden frontend suite failure uncovered by the broader test run by making `assistantQueryToMessage` omit absent optional fields instead of materializing them as `undefined`.
- Verified with `node --test scripts/check-root-script-binaries.test.mjs`, `cd apps/web && pnpm exec tsx --test src/lib/chat/adapter.test.ts src/lib/chat/conversation.test.ts`, `pnpm --filter @minance/web test`, `just build-web`, and `just check`.
