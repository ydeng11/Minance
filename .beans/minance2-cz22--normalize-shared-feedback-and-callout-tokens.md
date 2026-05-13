---
# minance2-cz22
title: Normalize shared feedback and callout tokens
status: completed
type: task
priority: normal
created_at: 2026-04-21T12:17:55Z
updated_at: 2026-04-21T12:19:19Z
---

Replace remaining hard-coded rose/amber feedback and callout classes with semantic danger/warning tokens, add guard coverage, verify web checks, and commit the slice with its bean.

## Checklist

- [x] Add semantic danger and warning theme tokens
- [x] Normalize status, assistant error, and recurring suggestion callout styles
- [x] Add theme-foundation guards for remaining feedback/callout drift
- [x] Run verification
- [x] Complete bean and commit slice

## Summary of Changes

- Added semantic danger and warning theme tokens to the Tailwind theme contract for dark and light themes.
- Replaced hard-coded rose/amber classes in StatusMessage, assistant error cards, and recurring suggestion callouts with danger/warning tokens.
- Added theme-foundation guards for feedback, assistant, and suggestion callout token usage.
- Verified with targeted tests, web lint, web tests, web build, and diff check.
