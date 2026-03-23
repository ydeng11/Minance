---
# minance2-b98a
title: Simplify recent web test coverage cleanup
status: completed
type: task
priority: normal
created_at: 2026-03-22T23:52:19Z
updated_at: 2026-03-22T23:52:55Z
---

## Context

The recent `minance2-mb72` changes fixed nested web test coverage and exposed a hidden chat adapter issue. A small cleanup pass is needed to make the new code clearer without changing behavior.

## Todo

- [x] Review the recent diff for behavior-preserving simplifications
- [x] Simplify the touched code without changing behavior or contracts
- [x] Re-run the relevant verification commands
- [x] Summarize the cleanup and close the bean



## Summary of Changes

- Simplified `assistantQueryToMessage` by replacing inline conditional object spreads with an explicit message object plus straightforward optional-property assignment.
- Simplified the script-policy test by extracting a small `readJson` helper instead of repeating file-read and parse logic.
- Re-verified with `node --test scripts/check-root-script-binaries.test.mjs`, `cd apps/web && pnpm exec tsx --test src/lib/chat/adapter.test.ts src/lib/chat/conversation.test.ts`, and `just check`.
