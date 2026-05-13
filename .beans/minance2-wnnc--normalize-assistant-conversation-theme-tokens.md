---
# minance2-wnnc
title: Normalize assistant conversation theme tokens
status: completed
type: bug
priority: normal
created_at: 2026-04-21T00:07:01Z
updated_at: 2026-04-21T00:10:51Z
---

Continue audit cleanup by moving AssistantConversation off hard-coded neutral/emerald dark palette classes so assistant page and panel surfaces stay legible in both selectable themes.

## Checklist
- [x] Add failing token contract test for AssistantConversation
- [x] Normalize message, header, panel, input, and action surfaces
- [x] Run Code Simplifier pass on touched code
- [x] Run targeted and full web verification
- [x] Append summary of changes and complete bean

## Summary of Changes

- Verified the two review findings are already fixed in current code: command palette search has an aria-label and production build uses local fonts.
- Normalized AssistantConversation surfaces, controls, message bubbles, skeletons, and input controls onto semantic theme tokens.
- Added a theme-foundation regression test covering AssistantConversation hard-coded neutral/emerald palette debt.

Verification: env NODE_ENV=test pnpm exec tsx --test src/app/theme-foundation.test.ts; pnpm --filter @minance/web lint; pnpm --filter @minance/web test; pnpm --filter @minance/web build.
