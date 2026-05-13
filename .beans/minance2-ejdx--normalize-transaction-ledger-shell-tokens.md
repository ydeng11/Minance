---
# minance2-ejdx
title: Normalize transaction ledger shell tokens
status: completed
type: task
priority: normal
created_at: 2026-04-22T13:26:50Z
updated_at: 2026-04-22T13:27:45Z
---

Continue audit debt reduction by replacing the Transactions ledger shell and visible-selection toolbar wrapper with semantic surface, border, text, shadow, and gradient tokens; add focused regression coverage and verify the web app.

## Checklist

- [x] Audit ledger shell token drift
- [x] Replace ledger shell and selection toolbar classes with semantic tokens
- [x] Add focused regression coverage
- [x] Run targeted and web verification
- [x] Complete bean and commit slice

## Summary of Changes

Normalized the Transactions ledger shell and visible-selection toolbar wrapper to semantic panel, border, text, shadow, and gradient tokens. Added theme-foundation coverage to prevent the previous hard-coded neutral ledger shell and selected-count toolbar recipes from returning. Verified with focused theme contracts, lint, full web tests, production build, targeted token scan, and diff check.
