---
# minance2-uu4x
title: Use shared account type fallback on accounts page
status: completed
type: task
priority: normal
created_at: 2026-03-29T17:27:56Z
updated_at: 2026-03-29T17:29:02Z
---

## Goal

Replace the accounts page hard-coded fallback account-type list with the shared domain helper so the fallback path matches the API-backed contract.

## Todo

- [x] Add a focused regression test for the accounts page fallback account-type resolver
- [x] Switch the accounts page fallback to the shared account-type helper
- [x] Run targeted and relevant project verification
- [x] Summarize the change and close the follow-up bean

## Summary of Changes

- Added a focused accounts-page regression test for the fallback account-type resolver.
- Replaced the accounts page hard-coded fallback list with the shared domain helper so fallback behavior matches the canonical account-type contract.
- Re-ran targeted frontend tests, the frontend build, and the full repo check after the change.
