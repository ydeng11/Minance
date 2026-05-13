---
# minance2-amwa
title: Normalize auth and help token usage
status: completed
type: bug
priority: normal
created_at: 2026-04-20T03:02:09Z
updated_at: 2026-04-20T03:05:30Z
---

Continue the audit cleanup by moving auth/loading and help surfaces off hard-coded dark palette classes so the selectable light theme stays legible.

## Checklist
- [x] Review auth/help surfaces and design context
- [x] Add failing token contract tests
- [x] Normalize AuthPanel and AppGate to semantic tokens
- [x] Normalize Help page to semantic tokens
- [x] Run targeted and full web verification
- [x] Append summary of changes and complete bean

## Summary of Changes

- Added a theme foundation regression test covering AuthPanel, AppGate, and Help page token usage.
- Replaced hard-coded neutral/emerald dark palette classes in auth/loading/help entry surfaces with semantic theme tokens.
- Simplified AuthPanel repeated class strings into small constants/helper while preserving behavior.
- Verified with focused theme test plus `pnpm --filter @minance/web lint`, `pnpm --filter @minance/web test`, and `pnpm --filter @minance/web build`.
