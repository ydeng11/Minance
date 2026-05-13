---
# minance2-i9nj
title: Harden shared dialog and multiselect accessibility
status: completed
type: bug
priority: normal
created_at: 2026-04-13T12:20:22Z
updated_at: 2026-04-13T12:28:40Z
---

## Goal
Address the first audit recommendation by fixing shared dialog accessibility and searchable multiselect labeling/focus behavior.

## Todo
- [x] Add failing tests for shared dialog and searchable multiselect accessibility expectations
- [x] Implement the minimal accessibility fixes in shared dialog/filter components
- [x] Run targeted verification and summarize the result

## Summary of Changes
- Added shared dialog focus utilities and used them to move focus into the shell view dialog and transactions advanced filters panel, with escape-to-close and focus restoration.
- Added explicit accessible names for searchable multiselect inputs and passed them through Explorer and Transactions filter surfaces.
- Added regression coverage for dialog semantics and focus behavior, then verified with `just check`, `just build-web`, and focused Playwright runs for the two dialog flows.
