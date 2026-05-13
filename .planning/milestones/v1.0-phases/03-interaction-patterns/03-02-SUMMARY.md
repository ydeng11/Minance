---
phase: 03-interaction-patterns
plan: 02
subsystem: frontend
tags: [validation, blur, transactions, a11y]
requires: [03-01]
provides: [Per-field blur validation on transaction forms]
key-files:
  modified:
    - apps/web/src/app/transactions/form.ts
    - apps/web/src/app/transactions/TransactionEditorFields.tsx
    - apps/web/src/app/transactions/page.tsx
metrics:
  completed_date: 2026-04-03
---

# Phase 03 Plan 02: Inline blur validation

**One-liner:** Validated fields (date, description, amount, category, tags, type) re-run `validateTransactionDraft` on blur and merge/clear that field’s error; invalid inputs get `aria-invalid` and rose borders. Submit failure still preserves all field values (unchanged).

## Self-Check: PASSED
