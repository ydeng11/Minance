---
# minance2-fjz2
title: Fix exclude-from-rollups defaults across analytics
status: completed
type: bug
priority: normal
created_at: 2026-03-21T20:56:22Z
updated_at: 2026-03-21T21:00:34Z
---

## Goal

Make coarse groups marked `Exclude from rollups` omit their transactions from default Dashboard, Explorer, and assistant analytics behavior.

## Todo

- [x] Add failing tests for excluded-group analytics defaults
- [x] Implement shared default exclusion in analytics/assistant paths
- [x] Verify targeted tests and checks
- [x] Commit, push, and capture handoff notes

## Summary of Changes

- Added regression coverage proving excluded coarse groups stay visible in general transaction filtering but are omitted from default overview/explorer analytics and assistant tool results.
- Added opt-in `include_excluded` handling in analytics filtering, with analytics endpoints defaulting to exclusion while general transaction listing remains inclusive.
- Updated assistant tool execution paths that bypass analytics to also exclude rollup-excluded transactions by default.

## Handoff

- Branch: `codex/exclude-rollups-default`
- Commit: `c916bc0`
- Verification: `pnpm exec tsx --test services/api/test/analytics.test.ts`, `pnpm exec tsx --test services/api/test/llm/tool-executor.test.ts`, `just check`
- Open questions: none identified.
- Next steps: if we want power users to opt excluded groups back into Explorer or assistant queries, expose the new `include_excluded` override through API/UI controls.
