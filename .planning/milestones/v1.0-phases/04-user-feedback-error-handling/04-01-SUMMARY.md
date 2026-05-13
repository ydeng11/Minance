---
phase: 04-user-feedback-error-handling
plan: 01
subsystem: frontend
tags: [import, feedback, sonner]
requires: []
provides: [Import success toasts, Import inline recovery guidance, Import feedback helper]
key-files:
  modified:
    - apps/web/src/app/import/page.tsx
    - apps/web/src/app/import/page.test.ts
    - apps/web/src/app/import/ProcessedRecordsToolbar.tsx
    - apps/web/src/lib/feedback/requestFeedback.ts
    - apps/web/src/lib/import/reducer.ts
    - apps/web/src/lib/import/reducer.test.ts
    - e2e/specs/helpers.ts
    - e2e/specs/import-existing-account-transactions.spec.ts
    - e2e/specs/import-direction-positive-expense.spec.ts
    - e2e/specs/imports-upload-process.spec.ts
    - e2e/specs/readability-contrast.spec.ts
metrics:
  completed_date: 2026-04-07
---

# Phase 04 Plan 01: Import feedback routing

**One-liner:** Added a small shared request-feedback helper, moved Import routine successes to Sonner toasts, kept the `global-message` region for blocking errors or persistent next-step guidance, and migrated import-facing tests/specs to the new feedback contract.

## Self-Check: PASSED
