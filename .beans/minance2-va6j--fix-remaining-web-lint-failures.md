---
# minance2-va6j
title: Fix remaining web lint failures
status: completed
type: bug
priority: normal
created_at: 2026-04-19T18:31:10Z
updated_at: 2026-04-19T18:37:44Z
---

Resolve the current `@minance/web` lint errors and warnings that remain after the font/a11y fixes.

## Checklist
- [x] Review existing coverage for the linted code paths
- [x] Fix BottomNav set-state-in-effect warning without changing mobile nav behavior
- [x] Fix ViewController set-state-in-effect warning without changing view-shell behavior
- [x] Fix test file lint violation in useDebouncedSearch.test.ts
- [x] Run targeted and full web verification
- [x] Append summary of changes and complete bean

## Summary of Changes

- Reworked `BottomNav` so the mobile More tray is keyed to the pathname instead of being force-closed from an effect.
- Moved `ViewController` cleanup into `registerView(null)` and removed the effect-driven reset.
- Fixed the remaining transactions lint warnings and the `useDebouncedSearch` test variable name.
- Added contract coverage for the lint-sensitive paths and verified `pnpm --filter @minance/web lint`, `pnpm --filter @minance/web test`, and `pnpm --filter @minance/web build`.
