---
# minance2-zpeg
title: Fix command palette a11y label and offline-safe font loading
status: completed
type: bug
priority: normal
created_at: 2026-04-19T17:36:26Z
updated_at: 2026-04-19T17:55:53Z
---

Address the two P1 audit findings accepted by the user.

## Checklist
- [x] Add failing tests for command palette labeling and offline-safe font usage
- [x] Implement explicit accessible naming for command palette search
- [x] Replace network-dependent Google font loading with offline-safe local font setup
- [x] Run targeted web verification commands
- [x] Append summary of changes and complete bean

## Summary of Changes

Added an explicit `aria-label` to the shared command palette search input and updated the regression contract tests to enforce it. Replaced `next/font/google` in `apps/web/src/app/layout.tsx` with `next/font/local`, vendoring offline-safe Latin font binaries for the existing IBM Plex Sans body font and Fraunces display font into `apps/web/src/app/fonts/`. Verified the fixes with targeted contract tests, the full `@minance/web` test suite, and a successful `@minance/web` production build outside the sandbox; `@minance/web` lint still reports pre-existing unrelated issues in BottomNav, ViewController, and `useDebouncedSearch.test.ts`.
