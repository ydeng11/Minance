---
# minance2-37gp
title: 'P0: Add prefers-reduced-motion support and ARIA live regions for status messages'
status: completed
type: bug
priority: critical
tags:
    - audit
    - a11y
    - p0
created_at: 2026-04-02T21:38:08Z
updated_at: 2026-04-09T13:03:58Z
---

## Context
From frontend audit (score 10/20). Two blocking accessibility issues:

### 1. No prefers-reduced-motion support
- animate-bounce in AssistantConversation.tsx:46
- animate-pulse in 15+ skeleton loading components
- animate-spin in 10+ loading spinners
- Violates WCAG 2.1 SC 2.3.3 (Animation from Interactions)
- Fix: Add motion-reduce:animate-none to all animated elements, or add global CSS rule

### 2. Status/error messages not announced to screen readers
- Every page uses {message ? <p>...</p> : null} with no ARIA announcement
- Only Shell.tsx route announcer uses aria-live
- Violates WCAG 2.0 AA SC 4.1.3 (Status Messages)
- Fix: Add role=status or role=alert to message elements

### Files affected
- apps/web/src/app/globals.css (global reduced-motion rule)
- apps/web/src/components/assistant/AssistantConversation.tsx
- All page.tsx files with message state pattern
- 15+ components using animate-pulse skeletons

## Summary of Changes

Added a shared `StatusMessage` live-region component and switched the current page, assistant, and auth message surfaces over to it so informational updates announce politely and errors announce assertively. Added a global `prefers-reduced-motion: reduce` override in `apps/web/src/app/globals.css` that disables the current shared `animate-bounce`, `animate-pulse`, and `animate-spin` utility animations for reduced-motion users.

## Verification

- Passed: `env NODE_ENV=test pnpm --filter @minance/web test`
- Passed: `just build-web`
