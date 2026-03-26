---
# minance2-tj0h
title: Remove unused src folder
status: completed
type: task
priority: normal
created_at: 2026-03-24T03:57:14Z
updated_at: 2026-03-24T03:59:15Z
---

Remove the legacy root src folder if unused, verify the repo still passes relevant checks, update AGENTS.md or README.md if references need cleanup, and prepare a PR if changes are made.

- [x] Remove the unused root src folder
- [x] Check AGENTS.md and README.md for needed updates
- [x] Run verification for the cleanup
- [x] Prepare commit and PR details if changes are made (no tracked repo changes beyond bean bookkeeping, so no PR opened)

## Summary of Changes
- Removed the unused local root `src/` folder from the working tree.
- Confirmed `AGENTS.md` and `README.md` do not reference that legacy root folder, so no doc updates were needed.
- Ran `just check` after the cleanup; guardrails, backend tests, and web tests all passed.
