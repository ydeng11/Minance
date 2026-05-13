---
# minance2-czj3
title: Normalize transaction row and pagination action tokens
status: completed
type: task
priority: normal
created_at: 2026-04-22T23:58:37Z
updated_at: 2026-04-22T23:59:56Z
---

Continue audit debt reduction by replacing Transactions row edit/delete/cancel controls and pagination footer controls with semantic surface, border, text, and hover tokens; add regression coverage, verify, and commit the slice.

## Checklist

- [x] Audit row and pagination action token drift
- [x] Replace action and pagination controls with semantic tokens
- [x] Add focused regression coverage
- [x] Run targeted and web verification
- [x] Complete bean and commit slice

## Summary of Changes

- Replaced row edit/delete/cancel controls with semantic surface, border, hover, and text token recipes.
- Replaced the Transactions pagination footer, summary, page indicator, and previous/next buttons with semantic token recipes.
- Added theme-foundation coverage to guard against the removed hard-coded row and pagination action classes.
- Verified with targeted theme tests, web lint, full web unit tests, production build, pattern scan, and git diff whitespace checks.
