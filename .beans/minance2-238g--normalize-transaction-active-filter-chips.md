---
# minance2-238g
title: Normalize transaction active filter chips
status: completed
type: task
priority: normal
created_at: 2026-04-22T13:25:11Z
updated_at: 2026-04-22T13:26:21Z
---

Continue audit debt reduction by replacing Transactions active-filter chip and empty-summary pill styling with semantic surface, border, and text tokens; add focused regression coverage and verify the web app.

## Checklist

- [x] Audit active-filter chip token drift
- [x] Replace chip and empty-summary pill classes with semantic tokens
- [x] Add focused regression coverage
- [x] Run targeted and web verification
- [x] Complete bean and commit slice

## Summary of Changes

Normalized the Transactions active-filter chip buttons, remove icon, and empty active-filter pill to semantic surface, border, and text tokens. Added theme-foundation coverage to prevent the previous hard-coded neutral chip and empty pill recipes from returning. Verified with focused theme contracts, lint, full web tests, production build, targeted token scan, and diff check.
