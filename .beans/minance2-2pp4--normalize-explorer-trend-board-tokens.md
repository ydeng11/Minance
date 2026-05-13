---
# minance2-2pp4
title: Normalize explorer trend board tokens
status: completed
type: task
priority: normal
created_at: 2026-04-21T12:11:40Z
updated_at: 2026-04-21T12:14:09Z
---

Replace hard-coded TrendChart stone palettes with semantic theme tokens, preserve chart meaning with tokenized accents, add theme-foundation coverage, run simplification and web checks, and commit the slice with its bean.

## Checklist

- [x] Add theme-foundation coverage for TrendChart
- [x] Normalize TrendChart semantic surfaces, text, borders, chart accents, and focus states
- [x] Run Code Simplifier pass for the larger component edit
- [x] Run targeted and web verification
- [x] Complete bean and commit slice

## Summary of Changes

- Added theme-foundation coverage for the Explorer TrendChart token contract.
- Replaced hard-coded dark chart palettes, shadows, and detail surfaces with semantic surface, text, border, accent, and focus-ring tokens.
- Added keyboard focus treatment to trend month buttons and the month filter action.
- Ran Code Simplifier pass and verified with theme-foundation test, web lint, web tests, web build, and diff check.
