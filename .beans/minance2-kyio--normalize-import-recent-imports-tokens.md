---
# minance2-kyio
title: Normalize import recent imports tokens
status: completed
type: task
priority: normal
created_at: 2026-04-25T14:33:27Z
updated_at: 2026-04-25T14:34:21Z
---

Finish the Import route audit debt pass by replacing Recent Imports panel, list rows, copy, and open action raw neutral palette classes with semantic theme tokens; add scoped coverage and verify.



Checklist:
- [x] Audit recent imports token drift
- [x] Replace recent imports panel, rows, copy, and action with semantic tokens
- [x] Add focused recent imports regression coverage
- [x] Run targeted and web verification
- [x] Complete bean and commit slice



Completed:
- Replaced Recent Imports panel shell, list rows, filename/meta copy, and Open action with semantic theme tokens.
- Added focused Recent Imports coverage plus a route-wide guard preventing neutral/emerald utility drift in apps/web/src/app/import/page.tsx.
- Verification passed: focused theme foundation test, git diff --check, @minance/web lint, @minance/web test, @minance/web build.
