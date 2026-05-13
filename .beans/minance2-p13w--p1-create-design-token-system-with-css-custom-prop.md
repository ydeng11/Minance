---
# minance2-p13w
title: 'P1: Create design token system with CSS custom properties'
status: completed
type: feature
priority: high
tags:
    - audit
    - theming
    - p1
created_at: 2026-04-02T21:38:36Z
updated_at: 2026-04-14T02:59:37Z
---

## Context
From frontend audit (score 10/20). Theming scored 1/4.

### Issue
- globals.css is 7 lines with no @theme block and no CSS custom properties
- All colors are inline Tailwind utilities repeated across 40+ files
- Arbitrary gradient rgba values differ per component with no single source of truth:
  - rgba(10,16,18,0.95) vs rgba(12,16,18,0.95) vs rgba(15,18,20,0.96)
- No way to change theme without touching every component
- Dark mode is hard-coded with no toggle

### Fix
1. Define a @theme block in globals.css with CSS custom properties
2. Create tokens for: primary, surface, accent, text, border colors
3. Consolidate gradient backgrounds into 2-3 named tokens
4. Replace inline arbitrary values with token references
5. Consider supporting light mode in the future

### Files affected
- apps/web/src/app/globals.css (add @theme block)
- All component files using inline color values
- ExplorerCard.tsx, TransactionsCommandBar.tsx, TransactionsAdvancedFilters.tsx (gradients)

## Todo
- [x] Confirm scoped token rollout for the first theming pass
- [x] Add semantic theme tokens in globals.css
- [x] Replace audited gradient and accent values in the initial shared components
- [x] Verify the web app still builds cleanly

## Summary of Changes

- Added a semantic CSS custom property theme foundation in `apps/web/src/app/globals.css`, including dark and light token sets, shared gradient recipes, and shared panel/dialog shadows.
- Switched the app shell to a `data-theme` contract via `APP_THEME`, and routed shared overlays through that same theme source.
- Migrated the shared shell, sidebar, bottom nav, view dialog, Explorer card, and Transactions filter surfaces from hard-coded neutral/emerald recipes to semantic surface, text, border, and accent tokens.
- Added source-level regression coverage for the token foundation and verified behavior with `just check`, `just build-web`, and focused Playwright coverage for shell view dialog and mobile more navigation flows.
