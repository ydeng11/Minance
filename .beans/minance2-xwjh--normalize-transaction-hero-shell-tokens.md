---
# minance2-xwjh
title: Normalize transaction hero shell tokens
status: completed
type: task
priority: normal
created_at: 2026-04-22T13:23:28Z
updated_at: 2026-04-22T13:24:46Z
---

Continue audit debt reduction by replacing the Transactions page hero shell, badges, summary note, and top-level action buttons with semantic surface, border, accent, shadow, and text tokens; add focused regression coverage and verify the web app.

## Checklist

- [x] Audit transaction hero token drift
- [x] Replace hero shell and action classes with semantic tokens
- [x] Add focused regression coverage
- [x] Run targeted and web verification
- [x] Complete bean and commit slice

## Summary of Changes

Normalized the Transactions page hero shell, eyebrow, active-filter badge, row-count note, create action, and export action to semantic surface, border, accent, text, and shadow tokens. Added theme-foundation coverage to prevent the previous hard-coded rgba hero gradient and emerald hero button recipe from returning. Verified with focused theme contracts, lint, full web tests, production build, targeted token scan, and diff check.
