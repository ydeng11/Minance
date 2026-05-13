---
phase: 04-user-feedback-error-handling
plan: 02
subsystem: frontend
tags: [recurrings, validation, sonner]
requires: [04-01]
provides: [Recurring field validation, Recurring success toasts, Recurring inline recovery guidance]
key-files:
  modified:
    - apps/web/src/app/recurrings/form.ts
    - apps/web/src/app/recurrings/page.tsx
    - apps/web/src/app/recurrings/page.test.ts
    - e2e/specs/cross-tab-parity.spec.ts
metrics:
  completed_date: 2026-04-07
---

# Phase 04 Plan 02: Recurrings validation and toast routing

**One-liner:** Split Recurrings field validation from page-level request errors, moved routine Recurrings successes to Sonner toasts, and updated the parity spec to assert toast feedback instead of inline success banners.

## Self-Check: PASSED
