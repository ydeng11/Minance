---
# minance2-e541
title: IHE-15 Improve account identifiers
status: completed
type: feature
priority: normal
created_at: 2026-03-26T03:30:14Z
updated_at: 2026-03-26T03:47:29Z
parent: minance2-nccz
---

## Goal

Make account identifiers easier to distinguish, likely including stronger uniqueness and clearer labels.

## Todo

- [x] Inspect current account naming and selection flows
- [x] Confirm whether schema changes are required
- [x] Design the safest fix
- [x] Implement and test the chosen approach
- [x] Verify import/edit UX and data constraints

## Linear

- Issue: IHE-15
- URL: https://linear.app/ihelio/issue/IHE-15/improve-account-identifier

## Summary of Changes

- Added a derived `displayIdentifier` to account API responses so account labels include institution and account type context without schema changes.
- Updated account contract coverage to assert `displayIdentifier` and to confirm duplicate account names are still rejected even when institution/type differ.
- Updated the Accounts page cards to surface the disambiguated identifier label for easier account recognition.
- Verified with focused API contract tests and full web test suite.
