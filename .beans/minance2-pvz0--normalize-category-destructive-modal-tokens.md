---
# minance2-pvz0
title: Normalize category destructive modal tokens
status: completed
type: task
priority: normal
created_at: 2026-04-22T02:24:52Z
updated_at: 2026-04-22T02:26:09Z
---

Continue audit debt reduction by replacing hard-coded rose destructive and black modal overlay classes in the categories route with semantic danger and backdrop tokens; add regression coverage and verify the web app.

## Checklist

- [x] Audit categories destructive and modal token drift
- [x] Replace hard-coded rose and black classes with semantic tokens
- [x] Add theme-foundation regression coverage
- [x] Run targeted and web verification
- [x] Complete bean and commit slice

## Summary of Changes

Normalized categories destructive actions, form error copy, delete dialog, and modal backdrops away from hard-coded rose and black classes to semantic danger and app backdrop tokens. Added a targeted theme-foundation contract for destructive dialog tokens without claiming the broader categories shell is fully normalized. Verified with targeted theme tests, lint, full web tests, production build, and diff check.
