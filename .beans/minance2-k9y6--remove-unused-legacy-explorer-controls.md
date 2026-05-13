---
# minance2-k9y6
title: Remove unused legacy explorer controls
status: completed
type: bug
priority: normal
created_at: 2026-04-21T11:51:56Z
updated_at: 2026-04-21T11:53:58Z
---

Continue audit cleanup by deleting unused ExplorerCommandBar and FilterSidebar components that are no longer imported by the Explorer route and still contain hard-coded dark palette debt.

## Checklist
- [x] Add failing guard that legacy explorer controls are removed
- [x] Delete unused ExplorerCommandBar and FilterSidebar files
- [x] Run targeted and full web verification
- [x] Append summary of changes and complete bean


## Summary of Changes

- Added a source guard proving the legacy explorer command bar and sidebar controls are removed from the active codebase.
- Deleted unused ExplorerCommandBar and FilterSidebar components, removing dead hard-coded dark palette UI.
- Verified Explorer view layout still renders shell dialog content and that the full web gate passes.

Verification: env NODE_ENV=test pnpm exec tsx --test src/app/explorer/view-layout.test.ts; pnpm --filter @minance/web lint; pnpm --filter @minance/web test; pnpm --filter @minance/web build.
