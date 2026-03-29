---
# minance2-6l3b
title: Add Chase existing-account import Transactions regression spec
status: completed
type: task
priority: normal
created_at: 2026-03-28T01:09:53Z
updated_at: 2026-03-28T01:11:59Z
---

## Goal

Add focused Playwright coverage for importing Chase8457_Activity20260101_20260325_20260326.CSV against an existing Hyatt (Chase | Credit) account and verifying Transactions page visibility/filtering.

## Todo

- [x] Add failing Playwright spec for existing-account Chase import flow
- [x] Make the spec pass reliably
- [x] Run focused verification for the new spec
- [x] Record summary of changes

## Summary of Changes

- Added a dedicated Playwright regression spec at `e2e/specs/import-existing-account-transactions.spec.ts`.
- The spec creates or reuses the existing `Hyatt (Chase | Credit)` account, imports `Chase8457_Activity20260101_20260325_20260326.CSV`, reassigns the processed row to that account, commits the import, and verifies Transactions visibility plus account filtering.
- Verified with `pnpm exec playwright test e2e/specs/import-existing-account-transactions.spec.ts`.
