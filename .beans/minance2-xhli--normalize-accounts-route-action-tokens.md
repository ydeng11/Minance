---
# minance2-xhli
title: Normalize accounts route action tokens
status: completed
type: task
priority: normal
created_at: 2026-04-22T00:40:52Z
updated_at: 2026-04-22T00:42:43Z
---

Continue audit debt reduction by replacing hard-coded danger, warning, and overlay palette classes in the accounts route with semantic design tokens; add regression coverage and verify the web app.

## Checklist

- [x] Audit current accounts route token drift
- [x] Replace hard-coded danger, warning, and overlay classes with semantic tokens
- [x] Add theme-foundation regression coverage
- [x] Run targeted and web verification
- [x] Complete bean and commit slice

## Summary of Changes

Normalized the accounts route's remaining hard-coded danger, warning, and black overlay classes to semantic theme tokens. Added shared class recipes for dialog backdrops, validation text, danger alerts, warning actions, and destructive actions. Tightened theme-foundation coverage to reject rose, amber, and black palette regressions in the accounts route. Verified with targeted theme tests, lint, full web tests, production build, and diff check.
