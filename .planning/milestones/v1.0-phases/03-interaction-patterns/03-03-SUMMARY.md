---
phase: 03-interaction-patterns
plan: 03
subsystem: frontend
tags: [optimistic, undo, transactions, sonner]
requires: [03-01]
provides: [Optimistic transaction deletes, restore API client, undo toasts]
key-files:
  modified:
    - apps/web/src/lib/api/endpoints.ts
    - apps/web/src/lib/api/endpoints.test.ts
    - apps/web/src/hooks/useApi.ts
    - apps/web/src/app/transactions/page.tsx
metrics:
  completed_date: 2026-04-03
---

# Phase 03 Plan 03: Optimistic deletes + undo

**One-liner:** Transaction single and bulk deletes update the ledger immediately; failed requests roll back list, selection, and inline edit state. Successful deletes show a Sonner toast for ~5s with an **Undo** action that calls `POST /v1/transactions/:id/restore` (wired as `api.transactions.restore`) and reloads the list.

## Self-Check: PASSED
