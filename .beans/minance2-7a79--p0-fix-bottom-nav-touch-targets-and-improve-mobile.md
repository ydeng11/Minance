---
# minance2-7a79
title: 'P0: Fix bottom nav touch targets and improve mobile table experience'
status: completed
type: bug
priority: critical
tags:
    - audit
    - responsive
    - a11y
    - p0
created_at: 2026-04-02T21:38:19Z
updated_at: 2026-04-09T12:48:42Z
---

## Context
From frontend audit (score 10/20). Two blocking responsive/a11y issues:

### 1. Bottom nav touch targets below 44x44px
- Location: components/layout/BottomNav.tsx:46
- min-w-[62px] with py-1.5 and text-[10px] yields ~62x32px tap area
- WCAG 2.5.8 (Target Size) and Apple HIG require minimum 44x44px
- Fix: Increase py-1.5 to py-3 and add min-h-[44px] to each nav link

### 2. Transaction table forces horizontal scroll on mobile
- Location: transactions/page.tsx:1112 -- min-w-[1160px]
- Functional but poor UX on phones
- Fix: Consider card-based layout at mobile breakpoints, or collapse less-important columns

### Files affected
- apps/web/src/components/layout/BottomNav.tsx
- apps/web/src/app/transactions/page.tsx

## Summary of Changes

Raised the mobile bottom-navigation hit area to meet the 44px target-size floor, and tightened the transactions ledger for phones by removing the forced wide minimum below the desktop breakpoint, collapsing secondary metadata into the details cell, and reducing mobile action-button footprint without changing desktop behavior.

## Verification

- Passed: `env NODE_ENV=test pnpm --filter @minance/web exec tsx --test src/components/layout/BottomNav.test.ts src/app/transactions/filter-controls-ui.test.ts src/app/transactions/filters.test.ts src/app/transactions/ledger.test.ts src/app/transactions/form.test.ts src/app/transactions/selection.test.ts src/components/layout/shellWidth.test.ts`
- Passed: `just build-web`
