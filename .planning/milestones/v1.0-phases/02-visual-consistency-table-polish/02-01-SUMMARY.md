---
phase: 02-visual-consistency-table-polish
plan: 01
subsystem: frontend
tags: [filters, date-range, constants]
requires: []
provides: [RANGE_OPTIONS presets, computeDateRange this_month/this_year]
affects: [Explorer, Transactions, API]
tech-stack:
  added: []
  patterns:
    - Shared RANGE_OPTIONS includes custom; UI uses single source
key-files:
  created:
    - apps/web/src/lib/constants.test.ts
  modified:
    - apps/web/src/lib/constants.ts
    - apps/web/src/app/transactions/TransactionsCommandBar.tsx
    - apps/web/src/app/explorer/components/FilterSidebar.tsx
    - apps/web/src/app/explorer/page.tsx
    - apps/web/src/app/transactions/filters.ts
    - apps/web/src/app/explorer/filters.ts
    - services/api/src/utils.ts
    - services/api/test/utils-date.test.ts
decisions:
  - Backend computeDateRange extended for this_month (UTC month start) and this_year (Jan 1 UTC)
  - Explorer date label uses RANGE_OPTIONS lookup instead of a hardcoded map
metrics:
  duration: inline
  completed_date: 2026-04-03
---

# Phase 02 Plan 01: Date range presets (RANGE_OPTIONS)

**One-liner:** Added This Month, This Year, and Custom to shared `RANGE_OPTIONS`, wired `computeDateRange` for the new presets, removed duplicate custom entries in Transactions and Explorer UIs, and added unit tests.

## Tasks Completed

| Task | Name | Files |
|------|------|-------|
| 1 | Extend RANGE_OPTIONS | constants.ts, filters.ts, CommandBar, FilterSidebar, explorer page, utils.ts |
| 2 | Unit tests | constants.test.ts, utils-date.test.ts |

## Verification

- `pnpm exec tsx --test src/lib/constants.test.ts` (apps/web) — pass
- `pnpm exec tsx --test test/utils-date.test.ts` (services/api) — pass

## Self-Check: PASSED
