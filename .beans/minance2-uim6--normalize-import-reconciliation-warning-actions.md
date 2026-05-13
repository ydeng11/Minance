---
# minance2-uim6
title: Normalize import reconciliation warning actions
status: completed
type: task
priority: normal
created_at: 2026-04-22T02:21:42Z
updated_at: 2026-04-22T02:22:53Z
---

Continue audit debt reduction by replacing hard-coded amber warning action classes in the import reconciliation UI with semantic warning tokens; add regression coverage and verify the web app.

## Checklist

- [x] Audit import reconciliation warning token drift
- [x] Replace hard-coded amber warning action classes with semantic tokens
- [x] Add theme-foundation regression coverage
- [x] Run targeted and web verification
- [x] Complete bean and commit slice

## Summary of Changes

Normalized import reconciliation assign-account actions from hard-coded amber classes to semantic warning tokens. Added a local warning action class recipe reused by the mobile card and table reconciliation rows. Added theme-foundation coverage to prevent amber palette regressions on the import page. Verified with targeted theme tests, lint, full web tests, production build, and diff check.
