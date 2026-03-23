---
# minance2-3v7m
title: Simplify exclude-rollups analytics implementation
status: completed
type: task
priority: normal
created_at: 2026-03-21T21:10:58Z
updated_at: 2026-03-21T21:12:18Z
---

## Goal

Clean up the recent exclude-rollups implementation on branch `codex/exclude-rollups-default` for readability and maintainability without changing behavior.

## Todo

- [x] Review the touched-file diff for safe simplifications
- [x] Apply behavior-preserving cleanup to the recent changes only
- [x] Run targeted verification and repo checks
- [x] Commit and push the cleanup changes

## Summary of Changes

- Added small helpers to centralize rollup-exclusion filter reading and analytics filter normalization in `services/api/src/analytics.ts`.
- Replaced repeated assistant-side `include_excluded = false` setup with one helper in `services/api/src/llm/tool-executor.ts`.
- Kept behavior and external contracts unchanged while making the recent exclude-rollups code easier to follow.

## Handoff

- Branch: `codex/exclude-rollups-default`
- Commit: `66b048c`
- Verification: `pnpm exec tsx --test services/api/test/analytics.test.ts`, `pnpm exec tsx --test services/api/test/llm/tool-executor.test.ts`, `just check`
- Open questions: none identified.
