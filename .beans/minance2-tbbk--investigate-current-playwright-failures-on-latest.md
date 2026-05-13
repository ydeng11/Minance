---
# minance2-tbbk
title: Investigate current Playwright failures on latest main
status: completed
type: bug
priority: high
created_at: 2026-03-21T21:49:20Z
updated_at: 2026-04-12T21:50:24Z
---

`pnpm e2e:ci` failed during the legacy-cleanup verification pass on 2026-03-21, so repo-wide verification is not currently green on latest `origin/main`.

## Failing specs observed
- `e2e/specs/accessibility-core-routes.spec.ts` assistant dialog close expectation
- `e2e/specs/ai-gating.spec.ts` missing AI setup banner
- `e2e/specs/assistant-and-analytics.spec.ts` assistant request returned `User not found`
- `e2e/specs/assistant-placement.spec.ts` focus order assertion
- `e2e/specs/categories-taxonomy-emoji.spec.ts` login/readiness and settings emoji picker failures
- `e2e/specs/explorer-upgrade.spec.ts` login/readiness and missing category bars
- `e2e/specs/full-user-flow.spec.ts` manual transaction delete expectation
- `e2e/specs/import-and-transactions.spec.ts` manual transaction row expectation
- `e2e/specs/readability-contrast.spec.ts` login/readiness failure
- `e2e/specs/transactions-multiselect-filters.spec.ts` missing category filter search control

## Checklist
- [x] Triage assistant and AI-gating failures
- [x] Triage auth/login readiness failures in shared helpers
- [x] Triage explorer/transactions/category interaction failures
- [x] Re-run `pnpm e2e:ci` and capture a green result

## Summary of Changes

- Updated shared Playwright helpers to match the current auth, import, assistant, and transactions UI contracts.
- Reworked import-related specs to wait on durable current UI state instead of removed toast-only assertions.
- Aligned explorer, contrast, and transactions specs with the current shell/dialog and URL-driven filtering behavior.
- Verified the focused failure clusters and completed a green `CI=1 pnpm e2e:ci` run (`50 passed, 1 skipped`).
