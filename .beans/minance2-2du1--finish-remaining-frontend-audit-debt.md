---
# minance2-2du1
title: Finish remaining frontend audit debt
status: completed
type: task
priority: normal
created_at: 2026-05-02T01:55:26Z
updated_at: 2026-05-10T03:47:04Z
---

Close the remaining frontend audit debt after the 2026-05-01 audit follow-up: harden modal focus management, normalize legacy touch targets and decorative icons, reduce remaining dense responsive/gradient-shell issues, run simplification review and verification.\n\n- [x] Harden Accounts modal focus management\n- [x] Harden Categories modal focus management\n- [x] Normalize legacy touch targets and decorative icons\n- [x] Distill remaining gradient shell and dense responsive debt\n  - [x] Worker C: add source-contract checks for import/help/heatmap debt\n  - [x] Worker C: normalize owned import/help/heatmap surfaces\n  - [x] Worker C: run focused verification\n- [x] Run Code Simplifier review\n- [x] Run verification\n- [x] Complete tracking

Worker A note: Started Accounts audit debt cleanup. Scope limited to apps/web/src/app/accounts/page.tsx and focused accounts tests; will update checklist after verification.

## Worker C Notes\n\nCompleted import/help/heatmap audit debt cleanup. Focused tests passed; web build is blocked by unrelated in-progress accounts page type error at apps/web/src/app/accounts/page.tsx:439.

Worker A summary: Accounts page dialogs now capture/restore focus, focus the first dialog control, close via Escape, and trap Tab/Shift+Tab within the active wizard/settings dialog. Accounts controls touched in this scope now use 44px-ish minimum hit targets and decorative account icons are aria-hidden. Verification: focused accounts tests, web tests, and just check passed; web build was blocked by an existing process holding apps/web/.next/lock (PID 47446).

Worker A verification update: After the .next lock cleared, pnpm --filter @minance/web build passed. Direct pnpm --filter @minance/web exec tsc --noEmit no longer reports accounts errors; it still fails on out-of-scope test typing issues in import/page.test.ts, StatusMessage.test.ts, chat/adapter.test.ts, and sharedFilters.test.ts.

## Summary of Changes

Completed the remaining frontend audit debt: categories dialogs now use focus trapping and restoration, legacy touch targets and decorative icons are normalized across touched pages, shared filter synchronization is covered by unit/E2E tests, Code Simplifier removed redundant comments in the shared-filter guard, and just check passed before commit.
