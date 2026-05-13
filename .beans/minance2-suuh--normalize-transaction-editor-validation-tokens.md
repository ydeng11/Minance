---
# minance2-suuh
title: Normalize transaction editor validation tokens
status: completed
type: task
priority: normal
created_at: 2026-04-22T00:45:16Z
updated_at: 2026-04-22T00:46:33Z
---

Continue audit debt reduction by replacing hard-coded validation error palette classes in the shared transaction editor fields with semantic danger tokens; add regression coverage and verify the web app.

## Checklist

- [x] Audit transaction editor validation token drift
- [x] Replace hard-coded validation error classes with semantic danger tokens
- [x] Add theme-foundation regression coverage
- [x] Run targeted and web verification
- [x] Complete bean and commit slice

## Summary of Changes

Normalized shared transaction editor validation states from hard-coded rose palette classes to semantic danger tokens. Consolidated repeated validation control and helper text classes into local recipes. Tightened theme-foundation coverage to reject rose palette regressions in import and transaction form helpers. Verified with targeted theme tests, lint, full web tests, production build, and diff check.
