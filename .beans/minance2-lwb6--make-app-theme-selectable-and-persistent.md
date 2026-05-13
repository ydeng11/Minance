---
# minance2-lwb6
title: Make app theme selectable and persistent
status: completed
type: bug
priority: normal
created_at: 2026-04-19T18:46:33Z
updated_at: 2026-04-19T18:52:06Z
---

Resolve the remaining audit finding that light theme is unreachable by adding real theme state, persistence, and a settings control.

## Checklist
- [x] Review current theme plumbing and settings surfaces
- [x] Add failing tests for selectable theme behavior and contracts
- [x] Implement persistent app theme state and provider wiring
- [x] Add settings controls for theme selection
- [x] Run targeted and full web verification
- [x] Append summary of changes and complete bean

## Summary of Changes

- Replaced the hard-coded app theme constant with a real theme utility layer, client ThemeProvider, and hydration-safe layout init script backed by localStorage.
- Updated shared overlay plumbing so the toaster follows the selected theme.
- Added explicit dark and light theme controls to `/settings` and normalized both settings routes plus the shared settings menu onto semantic token-backed surfaces so light mode remains legible there.
- Added theme utility and source-contract tests, then verified with targeted theme tests plus `pnpm --filter @minance/web lint`, `pnpm --filter @minance/web test`, and `pnpm --filter @minance/web build`.
