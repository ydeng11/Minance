---
# minance2-o9yg
title: 'P1: Break up transactions page into smaller components'
status: scrapped
type: task
priority: high
tags:
    - audit
    - performance
    - p1
created_at: 2026-04-02T21:38:50Z
updated_at: 2026-04-13T04:02:18Z
---

## Context
From frontend audit (score 10/20).

### Issue
- app/transactions/page.tsx is ~1470 lines in a single component
- 25+ useState hooks, 150+ lines of imports/utility functions
- Entire component re-renders on any state change
- Difficult to test, maintain, and optimize independently
- No code-splitting benefit since everything is one chunk

### Fix
Extract into separate components:
1. Ledger table (the <table> with rows) -> TransactionLedger.tsx
2. Bulk actions bar -> TransactionBulkActions.tsx
3. Create transaction dialog -> TransactionCreateDialog.tsx
4. Bulk delete dialog -> TransactionBulkDeleteDialog.tsx
5. Move business logic into custom hooks (useTransactionFilters, useTransactionCrud, etc.)

### Files affected
- apps/web/src/app/transactions/page.tsx (break apart)
- New component files in apps/web/src/app/transactions/

## Reasons for Scrapping

Cancelled by user request on 2026-04-13.
