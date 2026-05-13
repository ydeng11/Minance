---
# minance2-8ajy
title: Normalize transaction bulk action tokens
status: completed
type: task
priority: normal
created_at: 2026-04-22T23:51:48Z
updated_at: 2026-04-22T23:53:08Z
---

Continue audit debt reduction by replacing Transactions bulk action buttons, dropdown panels, inputs, helper copy, and apply/review actions with semantic surface, border, accent, text, and shadow tokens; add focused regression coverage and verify the web app.

## Checklist

- [x] Audit bulk action token drift
- [x] Replace bulk action controls and dropdown classes with semantic tokens
- [x] Add focused regression coverage
- [x] Run targeted and web verification
- [x] Complete bean and commit slice

## Summary of Changes

Normalized Transactions bulk action controls, dropdown panels, category/tag fields, helper copy, apply buttons, and review menu options to semantic surface, border, accent, text, gradient, and shadow tokens. Added theme-foundation coverage to prevent the previous hard-coded neutral and emerald bulk action recipes from returning. Verified with focused theme contracts, lint, full web tests, production build, targeted token scan, and diff check.
