---
phase: 03-interaction-patterns
plan: 04
subsystem: frontend
tags: [cmdk, command-palette, navigation]
requires: [03-01]
provides: [Global ⌘K / Ctrl+K command palette with main routes]
key-files:
  modified:
    - apps/web/package.json
    - pnpm-lock.yaml
    - apps/web/src/components/providers/AppProviders.tsx
  added:
    - apps/web/src/components/command-palette/CommandPalette.tsx
metrics:
  completed_date: 2026-04-03
---

# Phase 03 Plan 04: Command palette

**One-liner:** Added `cmdk`, `CommandPalette` with `Command.Dialog`, mounted in `AppProviders`; **⌘K** / **Ctrl+K** toggles search to jump to Dashboard, Explorer, Transactions, Accounts, Categories, Recurrings, Import, Settings, AI settings, Assistant, and Help.

## Self-Check: PASSED
