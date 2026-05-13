---
# minance2-n7bc
title: Normalize transaction empty state tokens
status: completed
type: task
priority: normal
created_at: 2026-04-23T00:07:31Z
updated_at: 2026-04-23T00:08:38Z
---

Continue audit debt reduction by replacing the Transactions empty-state title, helper copy, and clear-filters action hard-coded neutral/emerald classes with semantic text, accent, and focus tokens; add focused regression coverage and verify the web app.

## Checklist

- [x] Audit empty-state token drift
- [x] Replace empty-state copy and action classes with semantic tokens
- [x] Add focused regression coverage
- [x] Run targeted and web verification
- [x] Complete bean and commit slice

## Summary of Changes

- Replaced the Transactions empty-state title, helper copy, and clear-filters action classes with semantic text, accent, and focus-ring token recipes.
- Added theme-foundation coverage to prevent the removed hard-coded neutral/emerald empty-state classes from returning.
- Verified with targeted theme tests, web lint, full web unit tests, production build, pattern scan, and git diff whitespace checks.
