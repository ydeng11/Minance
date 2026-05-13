---
phase: 02-visual-consistency-table-polish
plan: 02
subsystem: frontend
tags: [transactions, table, empty-state]
requires: []
provides: [sticky thead, rose expense amounts, empty state CTA]
affects: [Transactions ledger]
key-files:
  created: []
  modified:
    - apps/web/src/app/transactions/page.tsx
metrics:
  completed_date: 2026-04-03
---

# Phase 02 Plan 02: Table visual polish

**One-liner:** Expense amounts use `text-rose-400`, sticky table header with shadow, empty state with guidance and “Clear filters” when filters are active.

## Self-Check: PASSED
