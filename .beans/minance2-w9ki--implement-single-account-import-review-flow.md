---
# minance2-w9ki
title: Implement single-account import review flow
status: completed
type: feature
priority: normal
created_at: 2026-03-29T19:22:29Z
updated_at: 2026-03-30T02:44:54Z
---

## Goal
Implement the approved single-account-first import review flow.

## Todo
- [x] Task 1: Add import review state helpers for default-account and issue escalation
- [x] Task 2: Replace duplicate account assignment UI with one import-level selector
- [x] Task 3: Make issues and reconciliation conditional instead of always-primary
- [x] Task 4: Add end-to-end coverage for the single-account default path and issue escalation
- [x] Task 5: Run full verification and update documentation references

## Summary of Changes

- added import review e2e coverage for the quiet single-account path and issue-escalation path
- aligned the implementation plan with the real Playwright invocation and balanced-fixture requirement
- extracted import/accounts page-only helper exports into separate modules so Next.js production builds pass cleanly
- verified the work with focused web tests, combined Playwright coverage, `just build-web`, and `just check`
