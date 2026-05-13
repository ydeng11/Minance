---
# minance2-tqpw
title: Normalize explorer view drawer theme tokens
status: completed
type: bug
priority: normal
created_at: 2026-04-21T11:54:59Z
updated_at: 2026-04-21T11:57:34Z
---

Continue audit-debt cleanup by replacing hard-coded dark palette classes in the Explorer view drawer content and advanced filter controls with design-system tokens and visible focus-ring treatment.

## Checklist
- [x] Add regression coverage for tokenized Explorer view drawer surfaces
- [x] Normalize ExplorerViewContent and ExplorerAdvancedFilters classes
- [x] Run targeted and web verification
- [x] Append summary of changes and complete bean


## Summary of Changes

- Added Explorer view drawer regression coverage that rejects hard-coded neutral/emerald dark palette classes and requires tokenized surfaces, fields, and focus rings.
- Normalized ExplorerViewContent and ExplorerAdvancedFilters to use semantic surface, text, border, accent, and focus-ring tokens.
- Ran the required Code Simplifier pass and kept the token constants scoped to the touched drawer components.

Verification: env NODE_ENV=test pnpm exec tsx --test src/app/explorer/view-layout.test.ts; pnpm --filter @minance/web lint; pnpm --filter @minance/web test; pnpm --filter @minance/web build; git diff --check.
