---
# minance2-djpb
title: 'P2: Consolidate inconsistent gradient rgba values across components'
status: scrapped
type: task
priority: normal
tags:
    - audit
    - theming
    - p2
created_at: 2026-04-02T21:39:07Z
updated_at: 2026-04-13T04:02:18Z
---

## Context
From frontend audit (score 10/20).

### Issue
Cards that should look the same have subtly different gradient backgrounds:
- ExplorerCard.tsx: rgba(19,22,25,0.98) to rgba(10,12,14,0.94)
- TransactionsCommandBar.tsx: rgba(15,18,20,0.96) to rgba(10,12,14,0.92)
- TransactionsAdvancedFilters.tsx: rgba(15,18,20,0.98) to rgba(8,10,12,0.94)
- ExplorerAdvancedFilters.tsx: rgba(15,18,20,0.98) to rgba(8,10,12,0.94)
- Dashboard page.tsx: rgba(10,16,18,0.95) to rgba(7,11,13,0.78)
- Transactions header: rgba(12,16,18,0.95) to rgba(7,11,13,0.82)

### Fix
1. Define 2-3 gradient surface tokens (e.g. surface-card, surface-command, surface-modal)
2. Replace all inline bg-[linear-gradient(...)] with shared classes or tokens
3. Pairs well with the design token system bean (minance2-p13w)

### Files affected
- ExplorerCard.tsx, TransactionsCommandBar.tsx, TransactionsAdvancedFilters.tsx
- ExplorerAdvancedFilters.tsx, ExplorerCommandBar.tsx
- apps/web/src/app/page.tsx, apps/web/src/app/transactions/page.tsx

## Reasons for Scrapping

Cancelled by user request on 2026-04-13.
