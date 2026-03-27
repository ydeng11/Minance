---
# minance2-f0kf
title: IHE-13 Fix assistant missing tools behavior
status: completed
type: bug
priority: normal
created_at: 2026-03-26T03:30:14Z
updated_at: 2026-03-26T03:48:19Z
parent: minance2-nccz
---

## Goal

Fix the assistant so account-specific spend questions use the right tools/data instead of returning false negatives.

## Todo

- [x] Reproduce the assistant failure
- [x] Identify missing tool/data wiring
- [x] Add a failing test
- [x] Implement the minimal fix
- [x] Verify the assistant response path

## Linear

- Issue: IHE-13
- URL: https://linear.app/ihelio/issue/IHE-13/ai-assistant-missing-tools

## Summary of Changes

- Exposed `account` as a first-class optional filter in QA tool definitions so the LLM can request account-scoped analytics and transaction queries.
- Updated `getAvailableTools` metadata to include `account` for scoped analytics tools and `list_transactions`, aligning runtime filters with advertised schemas.
- Added focused tests that (1) assert account filter visibility in QA tool schemas/metadata and (2) prove `list_transactions` returns account-scoped results by account name and account id.
- Verified with focused test runs for tool executor and agent integration suites.
