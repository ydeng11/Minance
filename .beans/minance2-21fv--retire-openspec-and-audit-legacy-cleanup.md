---
# minance2-21fv
title: Retire OpenSpec and audit legacy cleanup
status: completed
type: task
priority: high
created_at: 2026-03-21T21:39:27Z
updated_at: 2026-03-21T21:49:34Z
---

Audit whether the legacy Quarkus/frontend cleanup is already finished on latest main, create or adjust beans for any unfinished work that remains, then remove deprecated OpenSpec artifacts and references.

## Checklist
- [x] Audit latest main for remaining legacy cleanup work
- [x] Update existing legacy-cleanup beans and create any new follow-up beans needed
- [x] Remove deprecated OpenSpec files and references
- [x] Run focused verification for bean and repo state

## Summary of Changes

Audited latest `origin/main` and confirmed the legacy Quarkus/frontend cleanup is already complete. Scrapped the stale OpenSpec task, completed the legacy cleanup subtasks that the audit proved done, removed the deprecated `openspec/` change files plus remaining active OpenSpec references, and captured the still-failing Playwright suite in follow-up bug `minance2-tbbk` after `pnpm install --frozen-lockfile` and `just check` passed but `pnpm e2e:ci` failed.
