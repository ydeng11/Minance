---
# minance2-9t0c
title: 'P1: Re-enable color-contrast checks and fix failing contrast ratios'
status: completed
type: bug
priority: high
tags:
    - audit
    - a11y
    - p1
created_at: 2026-04-02T21:38:29Z
updated_at: 2026-04-13T03:22:49Z
---

## Context
From frontend audit (score 10/20).

### Issue
- e2e/specs/accessibility-core-routes.spec.ts:18 disables color-contrast rule
- text-neutral-500 (~rgb(115,115,115)) on bg-neutral-950 (~rgb(10,10,10)) yields ~4.2:1, borderline
- text-neutral-600 (~rgb(82,82,82)) on dark backgrounds definitely fails at ~2.8:1
- Violates WCAG 2.0 AA SC 1.4.3 (Contrast Minimum 4.5:1)

### Fix
1. Re-enable color-contrast rule in e2e accessibility test
2. Bump text-neutral-600 usages to text-neutral-400
3. Audit text-neutral-500 usages and bump where below 4.5:1

### Files affected
- e2e/specs/accessibility-core-routes.spec.ts
- apps/web/src/components/layout/Shell.tsx (text-neutral-600 env label)
- Multiple components using text-neutral-500 on dark backgrounds

## Summary of Changes

- Re-enabled axe `color-contrast` coverage in the core accessibility route spec.
- Promoted key low-contrast text treatments and shared status banners onto the accessible `StatusMessage` component used across affected pages.
- Verified the dark-theme readability and route accessibility checks now pass with contrast enforcement enabled.

## Verification

- `pnpm exec playwright test e2e/specs/accessibility-core-routes.spec.ts`
- `pnpm exec playwright test e2e/specs/readability-contrast.spec.ts`
