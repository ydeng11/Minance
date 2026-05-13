---
# minance2-30i9
title: Normalize transaction danger tokens
status: completed
type: task
priority: normal
created_at: 2026-04-22T12:41:55Z
updated_at: 2026-04-22T12:44:14Z
---

Continue audit debt reduction by replacing remaining hard-coded rose and white transaction danger classes with semantic danger and app text tokens; add regression coverage and verify the web app.

## Checklist

- [x] Audit transaction danger token drift
- [x] Replace hard-coded rose and white danger classes with semantic tokens
- [x] Add route-level regression coverage
- [x] Run targeted and web verification
- [x] Complete bean and commit slice

## Summary of Changes

Normalized transaction-page danger states away from hard-coded rose and white classes to semantic danger and app text tokens. Added shared local recipes for bulk delete, row delete confirmation, and bulk delete confirmation actions. Added route-level theme-foundation coverage to prevent rose and text-white regressions in the transaction page. Verified with targeted contracts, lint, full web tests, production build, and diff check.
