---
# minance2-l583
title: Normalize dashboard route theme tokens
status: completed
type: task
priority: normal
created_at: 2026-04-22T00:36:49Z
updated_at: 2026-04-22T00:39:38Z
---

Replace Dashboard route hard-coded stone/sky/rose/amber palettes and inline gradients with semantic theme tokens, add guard coverage, run required simplification and web checks, and commit the slice with its bean.

## Checklist

- [x] Normalize dashboard route semantic surfaces, text, borders, accents, and focus rings
- [x] Add theme/design contract coverage for dashboard token usage
- [x] Run Code Simplifier pass for the large route edit
- [x] Run targeted and web verification
- [x] Complete bean and commit slice

## Summary of Changes

- Normalized the Dashboard route away from hard-coded stone/sky/rose/amber palette classes and inline rgba gradient/shadow recipes.
- Added shared class recipes for dashboard panels, controls, KPI cards, drill-down rows, focus rings, and text styles using semantic surface, text, border, accent, danger, and warning tokens.
- Added theme-foundation coverage that blocks dashboard regression to the old hard-coded dark palettes.
- Ran Code Simplifier pass and verified with targeted contracts, web lint, web tests, web build, and diff check.
