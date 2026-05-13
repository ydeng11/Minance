---
# minance2-goqa
title: Normalize import reconciliation tokens
status: completed
type: task
priority: normal
created_at: 2026-04-25T14:31:12Z
updated_at: 2026-04-25T14:33:05Z
---

Continue Import route audit debt reduction by replacing reconciliation panel, table, mobile card, select, refresh, and no-action raw neutral palettes with semantic theme tokens; add focused regression coverage and verify.



Checklist:
- [x] Audit reconciliation token drift
- [x] Replace reconciliation panel, cards, table, controls, and copy with semantic tokens
- [x] Add focused reconciliation regression coverage
- [x] Run targeted and web verification
- [x] Complete bean and commit slice



Completed:
- Replaced reconciliation panel, refresh action, helper copy, desktop table rows/cells/selects, mobile cards, metric labels, badges, and no-action copy with semantic tokens.
- Added focused source-slice coverage for reconciliation panel and mobile card tokenization.
- Verification passed: focused theme foundation test, git diff --check, @minance/web lint, @minance/web test, @minance/web build.
