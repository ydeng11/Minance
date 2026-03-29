---
# minance2-m0jt
title: Unify Account Type usage across app flows
status: completed
type: bug
priority: normal
created_at: 2026-03-28T02:18:52Z
updated_at: 2026-03-28T02:29:37Z
---

## Goal

Make Account Type usage consistent across transaction filters, transaction creation, CSV imports, and the accounts page.

## Todo

- [x] Audit current Account Type models, labels, and option sets across the web app and shared packages
- [x] Identify the canonical Account Type contract and the inconsistencies across filters, creation, imports, and accounts
- [x] Implement fixes and add/update regression coverage
- [x] Run relevant verification and summarize the changes

## Summary of Changes

- Updated transaction account reconciliation to recognize the same display identifiers used by import and creation flows.
- Switched transaction filter account labels to preserve display identifiers so account type context stays visible in filters.
- Tightened manual account validation to reject unsupported account types when the supported-type list is available.
- Added regression coverage for the transaction account-label consistency path and verified the change with focused and full project checks.
