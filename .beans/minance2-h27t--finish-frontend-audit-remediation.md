---
# minance2-h27t
title: Finish frontend audit remediation
status: completed
type: task
priority: normal
created_at: 2026-05-11T21:38:08Z
updated_at: 2026-05-11T21:43:58Z
---

Resolve all findings from the 2026-05-11 frontend audit and re-run verification.\n\n- [x] Fix processed import focus contrast\n- [x] Normalize small touch targets\n- [x] Harden multiselect keyboard semantics\n- [x] Improve narrow import processed-row editing\n- [x] Reduce repeated explorer gradient metric shells\n- [x] Run Code Simplifier on touched code\n- [x] Re-run focused audit checks

## Summary of Changes\n\nFinished all 2026-05-11 frontend audit remediation. Raised processed import editor border contrast so the dark-theme focus-border audit passes, normalized secondary touch targets in recurring suggestions and settings shortcuts, added keyboard navigation and ARIA wiring to shared multiselect filters, preserved mobile processed-row card editing with stronger include controls, and removed the repeated gradient from the Explorer hero summary card. Verification passed: pnpm --filter @minance/web exec eslint ., pnpm --filter @minance/web test, pnpm --filter @minance/web build, and env NODE_ENV=test pnpm exec playwright test e2e/specs/accessibility-core-routes.spec.ts e2e/specs/readability-contrast.spec.ts e2e/specs/transactions-ledger-responsive.spec.ts --project=chromium.
