---
# minance2-616w
title: 'P3: Final polish pass -- aria-labels, duplicate configs, bulk dropdown labels, sparkline evaluation'
status: scrapped
type: task
priority: low
tags:
    - audit
    - polish
    - p3
created_at: 2026-04-02T21:39:16Z
updated_at: 2026-04-13T04:02:18Z
---

## Context
From frontend audit (score 10/20). Collection of minor issues for a final quality pass.

### Issues

1. Dashboard KPI buttons lack descriptive aria-labels (page.tsx:273-291)
   - Screen readers get jumbled child text
   - Fix: Add aria-label like 'Net Flow: $1,234.56 -- View transactions'

2. Bulk dropdown selects lack explicit labels (transactions/page.tsx:986-990, 1029-1035)
   - Screen readers announce select/input without context
   - Fix: Add aria-label to each dropdown

3. HelpMenu panel missing role (components/layout/HelpMenu.tsx:108-113)
   - Panel div has aria-label but no role
   - Fix: Add role=menu or role=dialog

4. Duplicate PostCSS config files
   - postcss.config.mjs and postcss.config.ts are identical
   - Fix: Delete one

5. Decorative sparklines in explorer (ExplorerMiniSparkline.tsx)
   - Properly marked aria-hidden but add visual noise
   - Evaluate whether they add real value; if kept, add tooltips

6. Duplicate sidebar/bottom-nav route definitions
   - Sidebar.tsx:17-27 and BottomNav.tsx:16-25 define near-identical arrays
   - Fix: Extract shared NAV_ITEMS constant

### Files affected
- apps/web/src/app/page.tsx
- apps/web/src/app/transactions/page.tsx
- apps/web/src/components/layout/HelpMenu.tsx
- apps/web/postcss.config.mjs or postcss.config.ts
- apps/web/src/app/explorer/components/ExplorerMiniSparkline.tsx
- apps/web/src/components/layout/Sidebar.tsx, BottomNav.tsx

## Reasons for Scrapping

Cancelled by user request on 2026-04-13.
