---
# minance2-2xmr
title: Normalize transaction row content tokens
status: completed
type: task
priority: normal
created_at: 2026-04-23T00:04:59Z
updated_at: 2026-04-23T00:07:01Z
---

Continue audit debt reduction by replacing Transactions table row hover, text hierarchy, mobile metadata chips, category badge, inflow amount, and recurring badge hard-coded palettes with semantic surface, text, border, and accent tokens; add focused regression coverage and verify the web app.

## Checklist

- [x] Audit row content token drift
- [x] Replace row hover, text hierarchy, metadata chips, and badges with semantic tokens
- [x] Add focused regression coverage
- [x] Run targeted and web verification
- [x] Complete bean and commit slice

## Summary of Changes

- Replaced Transactions row hover, secondary cell copy, primary text, helper text, metadata chips, category badge, inflow amount, and recurring badge classes with semantic token recipes.
- Added focused theme-foundation coverage to prevent the removed hard-coded neutral/emerald row content patterns from returning.
- Ran the Code Simplifier workflow for the large diff; no behavior-preserving cleanup was clearer than the current named recipes.
- Verified with targeted theme tests, web lint, full web unit tests, production build, pattern scan, and git diff whitespace checks.
