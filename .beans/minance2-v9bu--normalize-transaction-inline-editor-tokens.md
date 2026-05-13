---
# minance2-v9bu
title: Normalize transaction inline editor tokens
status: completed
type: task
priority: normal
created_at: 2026-04-22T12:48:32Z
updated_at: 2026-04-22T12:49:45Z
---

Continue audit debt reduction by replacing the transaction inline edit row background and action buttons with semantic surface, border, accent, and text tokens; add focused regression coverage and verify the web app.

## Checklist

- [x] Audit inline editor token drift
- [x] Replace inline editor surface and action button classes with semantic tokens
- [x] Add focused regression coverage
- [x] Run targeted and web verification
- [x] Complete bean and commit slice

## Summary of Changes

Normalized the Transactions inline edit row surface and update/cancel actions to semantic surface, border, accent, and text tokens. Renamed the dialog action recipes into shared transaction action button recipes so dialogs and inline edit controls use the same token-backed styling. Added theme-foundation coverage to prevent the previous hard-coded inline editor surface and emerald button recipes from returning. Verified with focused theme contracts, lint, full web tests, production build, token scan, and diff check.
