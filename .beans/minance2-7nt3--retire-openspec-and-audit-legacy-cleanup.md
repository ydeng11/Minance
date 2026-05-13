---
# minance2-7nt3
title: Retire OpenSpec and audit legacy cleanup
status: completed
type: task
priority: high
created_at: 2026-03-21T21:38:39Z
updated_at: 2026-04-09T12:45:36Z
---

Audit whether the legacy Quarkus/frontend cleanup is already finished on latest main, create or adjust beans for any unfinished work that remains, then remove deprecated OpenSpec artifacts and references.

## Checklist
- [x] Audit latest main for remaining legacy cleanup work
- [x] Update existing legacy-cleanup beans and create any new follow-up beans needed
- [x] Remove deprecated OpenSpec files and references
- [x] Run focused verification for bean and repo state

## Summary of Changes

Re-audited the repo on 2026-04-09 and confirmed there are no remaining active OpenSpec artifacts or references, and the legacy Quarkus/frontend cleanup remains complete. Reviewed the related cleanup beans and confirmed the only remaining open follow-up is Playwright investigation in `minance2-tbbk`; no new legacy-cleanup bean was needed. Ran focused verification with repo-wide `rg` sweeps for OpenSpec and legacy-stack references plus `just check`, which passed on 2026-04-09.
