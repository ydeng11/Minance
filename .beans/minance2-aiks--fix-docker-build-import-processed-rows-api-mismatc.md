---
# minance2-aiks
title: Fix Docker build import processed rows API mismatch
status: completed
type: bug
priority: normal
created_at: 2026-05-21T01:10:01Z
updated_at: 2026-05-21T01:10:52Z
---

Next.js Docker build fails because apps/web/src/app/import/page.tsx calls api.imports.updateProcessedRows, but the imports client type only exposes updateProcessedRow.\n\n- [x] Inspect imports API client and import page usage\n- [x] Patch the API surface or caller to match intended bulk update behavior\n- [x] Run targeted build/type verification\n- [x] Summarize changes and complete bean

## Summary of Changes\n\nExposed importsApi.updateProcessedRows through useApi so the import page can call the existing bulk processed-row PATCH helper. Verified with pnpm --filter @minance/web build.
