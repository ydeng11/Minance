---
phase: 02-visual-consistency-table-polish
plan: 03
subsystem: frontend
tags: [loading, skeleton, spinner]
requires: []
provides: [skeleton rows, Apply spinner]
affects: [Transactions page, command bar]
key-files:
  created: []
  modified:
    - apps/web/src/app/transactions/page.tsx
    - apps/web/src/app/transactions/TransactionsCommandBar.tsx
metrics:
  completed_date: 2026-04-03
---

# Phase 02 Plan 03: Loading states

**One-liner:** Five skeleton rows while `loading`; command bar Apply shows `Loader2` and disables during load; page passes `loading` into the command bar.

## Self-Check: PASSED
