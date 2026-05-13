---
# minance2-qkru
title: Normalize shared overlay and warning tokens
status: completed
type: task
priority: normal
created_at: 2026-04-22T00:43:07Z
updated_at: 2026-04-22T00:44:46Z
---

Continue audit debt reduction by replacing remaining small hard-coded black overlay and amber warning classes in shared chrome, help, AI settings, and import helper components with semantic tokens; add regression coverage and verify the web app.

## Checklist

- [x] Audit current small overlay and warning token drift
- [x] Replace hard-coded black and amber classes with semantic tokens
- [x] Add theme-foundation regression coverage
- [x] Run targeted and web verification
- [x] Complete bean and commit slice

## Summary of Changes

Normalized the remaining small shared overlay and warning callout drift in help, AI settings, import helper components, the View dialog, Shell assistant overlay, and BottomNav overlay. Replaced hard-coded black and amber palette classes with app background and warning semantic tokens. Tightened theme-foundation coverage for these areas and verified with targeted theme tests, lint, full web tests, production build, and diff check.
