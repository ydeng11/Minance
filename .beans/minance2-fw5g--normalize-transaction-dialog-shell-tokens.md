---
# minance2-fw5g
title: Normalize transaction dialog shell tokens
status: completed
type: task
priority: normal
created_at: 2026-04-22T12:46:48Z
updated_at: 2026-04-22T12:48:00Z
---

Continue audit debt reduction by replacing the transaction create and bulk-delete dialog overlays, panels, close controls, and primary/secondary actions with semantic theme tokens while preserving behavior and adding focused regression coverage.

## Checklist

- [x] Audit transaction dialog token drift
- [x] Replace dialog overlay, panel, and control classes with semantic tokens
- [x] Add focused regression coverage
- [x] Run targeted and web verification
- [x] Complete bean and commit slice

## Summary of Changes

Normalized the Transactions create and bulk-delete dialog shell to semantic app backdrop, panel, text, border, accent, and shadow tokens. Added shared local dialog class recipes for overlays, panels, close controls, secondary actions, and the create primary action. Added theme-foundation coverage to prevent the old hard-coded modal overlay and rgba shadow recipes from returning. Verified with focused theme contracts, lint, full web tests, production build, token scan, and diff check.
