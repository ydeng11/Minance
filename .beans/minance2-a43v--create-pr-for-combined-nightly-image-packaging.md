---
# minance2-a43v
title: Create PR for combined nightly image packaging
status: completed
type: task
priority: normal
created_at: 2026-03-23T02:30:22Z
updated_at: 2026-03-23T02:34:36Z
---

## Goal

Commit the local combined-image Docker packaging changes, verify them, and open a new PR now that #20 is merged.

## Todo

- [x] Refresh the branch against the merged base branch
- [x] Run fresh verification for the combined-image changes
- [x] Commit the source changes and bean metadata
- [x] Push the branch and create the PR
- [x] Record the PR URL and complete the bean

## Summary of Changes

- Rebased the combined-image work onto `origin/main` after PR #20 landed so the follow-up branch only carries the new single-image packaging files.
- Verified the combined Docker image with `pnpm test:test-first`, a fresh `docker build`, and a runtime smoke test against the existing SQLite data mount, including container health, `GET /`, proxied `/v1/system/storage`, and a matching `users` count of `2`.
- Pushed `codex/combined-nightly-image-pr` and opened PR #21: https://github.com/ydeng11/minance2/pull/21
