---
# minance2-pmtq
title: Normalize categories taxonomy tokens
status: completed
type: task
priority: normal
created_at: 2026-04-23T13:09:39Z
updated_at: 2026-04-23T13:12:26Z
---

Continue audit debt reduction in the Categories route by replacing the taxonomy management section, reorder table, grouped category lists, and add-group controls hard-coded neutral/emerald classes with semantic surface, border, text, accent, and focus tokens; add focused regression coverage and verify.

## Checklist

- [x] Audit taxonomy-management token drift
- [x] Replace taxonomy shell, table, grouped list, and add-group classes with semantic tokens
- [x] Add focused regression coverage
- [x] Run targeted and web verification
- [x] Complete bean and commit slice

## Summary of Changes

Normalized the Categories taxonomy management shell, action buttons, reorder table, grouped category list cards, reassignment controls, and add-group controls from hard-coded neutral/emerald classes to semantic surface, border, text, accent, and focus tokens. Added section-scoped theme-foundation coverage to prevent neutral/emerald class regressions inside the taxonomy block while leaving modal cleanup as a separate follow-up slice.
