---
# minance2-2qtk
title: Normalize explorer heatmap theme tokens
status: completed
type: bug
priority: normal
created_at: 2026-04-21T04:55:49Z
updated_at: 2026-04-21T04:58:11Z
---

Continue audit cleanup by moving explorer heatmap widgets off hard-coded neutral/emerald dark palette classes and onto semantic surface, border, text, and accent tokens.

## Checklist
- [x] Add failing token contract coverage for explorer heatmap widgets
- [x] Normalize SpendingHeatmap, WeekdaySpendSummary, CategoryWeekdayHeatmap, and shared heat tone classes
- [x] Run Code Simplifier pass on touched code
- [x] Run targeted and full web verification
- [x] Append summary of changes and complete bean

## Summary of Changes

- Added theme-foundation regression coverage for explorer heatmap widgets and shared heat-tone presentation classes.
- Replaced hard-coded neutral/emerald heatmap panels, legends, cells, skeletons, tooltips, and text with semantic surface, border, text, accent, and ring tokens.
- Simplified duplicated heat tone logic by sharing the exported weekday heat tone scale with SpendingHeatmap.

Verification: env NODE_ENV=test pnpm exec tsx --test src/app/theme-foundation.test.ts; pnpm --filter @minance/web lint; pnpm --filter @minance/web test; pnpm --filter @minance/web build.
