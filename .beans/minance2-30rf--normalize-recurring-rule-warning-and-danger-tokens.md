---
# minance2-30rf
title: Normalize recurring rule warning and danger tokens
status: completed
type: task
priority: normal
created_at: 2026-04-22T02:23:16Z
updated_at: 2026-04-22T02:24:26Z
---

Continue audit debt reduction by replacing hard-coded amber and rose classes in the recurring rules route with semantic warning and danger tokens; add regression coverage and verify the web app.

## Checklist

- [x] Audit recurring rules warning and danger token drift
- [x] Replace hard-coded amber and rose classes with semantic tokens
- [x] Add theme-foundation regression coverage
- [x] Run targeted and web verification
- [x] Complete bean and commit slice

## Summary of Changes

Normalized recurring-rule warning and danger UI from hard-coded amber and rose palettes to semantic warning and danger tokens. Added shared local recipes for error controls, error text, and destructive buttons. Tightened theme-foundation coverage to reject rose and amber palette regressions in the recurring rules route. Verified with targeted theme tests, lint, full web tests, production build, and diff check.
