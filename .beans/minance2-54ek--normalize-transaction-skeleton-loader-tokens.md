---
# minance2-54ek
title: Normalize transaction skeleton loader tokens
status: completed
type: task
priority: normal
created_at: 2026-04-22T23:56:51Z
updated_at: 2026-04-22T23:58:07Z
---

Continue audit debt reduction by replacing Transactions table loading skeleton hard-coded neutral backgrounds with semantic surface tokens, add regression coverage, verify, and commit the slice.

## Checklist

- [x] Audit skeleton token drift
- [x] Replace hard-coded skeleton backgrounds with semantic tokens
- [x] Add focused regression coverage
- [x] Run targeted and web verification
- [x] Complete bean and commit slice

## Summary of Changes

- Replaced Transactions table loading skeleton row, line, and pill styles with semantic surface token recipes.
- Added a theme-foundation regression test to prevent raw neutral skeleton fills from returning.
- Verified with targeted theme tests, web lint, full web unit tests, production build, pattern scan, and git diff whitespace checks.
