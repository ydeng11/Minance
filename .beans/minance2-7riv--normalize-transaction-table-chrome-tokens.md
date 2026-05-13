---
# minance2-7riv
title: Normalize transaction table chrome tokens
status: completed
type: task
priority: normal
created_at: 2026-04-22T23:54:41Z
updated_at: 2026-04-22T23:56:26Z
---

Continue audit debt reduction by replacing the Transactions table scroll focus ring, table/head text, sticky header, and selection checkbox chrome with semantic focus, surface, border, accent, and text tokens; add focused regression coverage and verify the web app.

## Checklist

- [x] Audit table chrome token drift
- [x] Replace table scroll, header, and checkbox classes with semantic tokens
- [x] Add focused regression coverage
- [x] Run targeted and web verification
- [x] Complete bean and commit slice

## Summary of Changes

- Replaced the Transactions table scroll region, base table text, sticky header, body dividers, and row-selection checkboxes with semantic theme token recipes.
- Added a theme-foundation regression test that guards against the removed hard-coded neutral/emerald table chrome patterns.
- Verified with targeted theme tests, web lint, full web unit tests, production build, pattern scan, and git diff whitespace checks.
