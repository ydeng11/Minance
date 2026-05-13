---
# minance2-0lrp
title: Normalize explorer summary band tokens
status: completed
type: task
priority: normal
created_at: 2026-04-21T12:14:55Z
updated_at: 2026-04-21T12:17:02Z
---

Replace hard-coded ExplorerSummaryBand stone/rose/sky/amber palettes with semantic design tokens, update contract tests, run simplification and web checks, and commit the slice with its bean.

## Checklist

- [x] Normalize ExplorerSummaryBand surfaces, text, icon, context, skeleton, and sparkline classes
- [x] Update flagship/theme contract coverage for summary band token usage
- [x] Run Code Simplifier pass for the larger component edit
- [x] Run targeted and web verification
- [x] Complete bean and commit slice

## Summary of Changes

- Normalized ExplorerSummaryBand hero, support cards, context bands, skeletons, icons, and sparklines to semantic surface, text, border, accent, and gradient tokens.
- Replaced the old flagship-polish refined-stone assertion with semantic token coverage.
- Added theme-foundation coverage that blocks hard-coded stone, rose, sky, amber, black, and rgba palette drift in the summary band.
- Ran Code Simplifier pass and verified with targeted contracts, web lint, web tests, web build, and diff check.
