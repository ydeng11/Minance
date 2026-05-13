---
# minance2-bz52
title: Pay down frontend audit debt
status: completed
type: task
priority: normal
created_at: 2026-05-02T00:33:17Z
updated_at: 2026-05-02T01:07:41Z
---

Address the findings from the 2026-05-01 frontend technical audit using subagents where work can be split safely.\n\n- [x] Harden transaction modal focus management and bulk control labels\n- [x] Improve shared multiselect and touch target accessibility\n- [x] Normalize/distill repeated visual shell debt\n- [x] Run Code Simplifier review for large frontend changes\n- [x] Run frontend tests/build checks\n- [x] Complete audit debt tracking

## Progress\n\nSpawned three workers: A owns transaction modal/bulk/touch-target fixes, B owns multiselect and assistant touch targets, C owns Explorer/dashboard visual normalization. Existing uncommitted transactions shared-filter work is being preserved.

Worker C update: normalized ExplorerCard ring token and reduced dashboard secondary gradient shell repetition; focused editorial design contract and web build pass.

## Code Simplifier Review\n\nReviewed the recently modified frontend files for behavior-preserving simplification. No additional safe cleanup was taken; the remaining modal focus handlers intentionally mirror the local dialog patterns.

## Verification\n\nPassed targeted contract tests, pnpm --filter @minance/web test, pnpm --filter @minance/web build, and just check. The first just check attempt failed only because sandboxed tsx could not create its IPC pipe; rerunning with approval passed.

## Summary of Changes\n\nPaid down the 2026-05-01 audit debt: hardened transaction dialogs with focus trapping and restore behavior, labeled bulk dropdown fields, raised small action controls to touch-friendly minimums, restored visible multiselect focus rings, enlarged the assistant send control, marked decorative icons hidden, and reduced repeated visual shell tells with semantic Explorer/dashboard token cleanup. Used subagents for disjoint slices and completed integration locally after two workers stalled during final reporting.
