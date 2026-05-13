---
# minance2-xv7b
title: Normalize import processed row tokens
status: completed
type: task
priority: normal
created_at: 2026-04-25T14:28:43Z
updated_at: 2026-04-25T14:30:45Z
---

Continue Import route audit debt reduction by replacing processed row editor table/card/shell classes and shared processed field classes hard-coded neutral/emerald palettes with semantic surface, border, text, accent, and focus tokens; add scoped regression coverage and verify.



Checklist:
- [x] Audit import processed row token drift
- [x] Replace processed row table, cards, fields, and panel classes with semantic tokens
- [x] Add focused processed-row regression coverage
- [x] Run targeted and web verification
- [x] Complete bean and commit slice



Completed:
- Replaced processed-row editor fields, empty state, status badge, desktop table rows, mobile cards, and processed-panel chrome with semantic theme tokens.
- Added focused regression coverage for the processed records editor source slices.
- Verification passed: focused theme foundation test, git diff --check, @minance/web lint, @minance/web test, @minance/web build.
