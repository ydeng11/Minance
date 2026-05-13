---
# minance2-tihx
title: Normalize explorer insight widget tokens
status: completed
type: bug
priority: normal
created_at: 2026-04-21T12:08:05Z
updated_at: 2026-04-21T12:10:11Z
---

Continue audit-debt cleanup by replacing hard-coded stone palette classes in Explorer merchant/anomaly insight widgets with semantic theme tokens and focus-ring treatment.

## Checklist
- [x] Add theme-foundation coverage for merchant/anomaly widgets
- [x] Normalize MerchantAnalysis and Anomalies classes
- [x] Run Code Simplifier pass
- [x] Run targeted and web verification
- [x] Append summary of changes and complete bean


## Summary of Changes

- Added theme-foundation coverage for Explorer merchant/anomaly insight widgets.
- Normalized MerchantAnalysis and Anomalies from hard-coded stone palette classes to semantic surface, text, border, accent, and gradient tokens.
- Added focus-ring treatment to merchant row interactions.
- Ran the required Code Simplifier pass and made a small readability cleanup to the merchant description class.

Verification: env NODE_ENV=test pnpm exec tsx --test src/app/theme-foundation.test.ts; pnpm --filter @minance/web lint; pnpm --filter @minance/web test; pnpm --filter @minance/web build; git diff --check.
