---
# minance2-bs22
title: Remove CSV reprocess UI and add generated import API docs
status: completed
type: feature
priority: normal
created_at: 2026-03-29T19:17:09Z
updated_at: 2026-03-29T19:23:08Z
---

Implement the approved plan to remove the CSV import Reprocess UI control, keep the backend endpoint, and add generated Markdown docs for import endpoints.

- [x] Add failing tests for removing the reprocess UI and for generated import API docs
- [x] Remove the web reprocess UI/client flow
- [x] Add import API docs manifest, generator, generated Markdown, and README link
- [x] Run simplification pass on touched code if needed
- [x] Run relevant verification commands and summarize results

## Summary of Changes

Removed the CSV import Reprocess control and the unused frontend reprocess client flow while keeping the backend `/v1/imports/:id/reprocess` endpoint intact. Added a generated import API reference sourced from a small manifest, committed the generated `docs/api/imports.md`, linked it from the README, and added drift-check coverage so docs stay in sync with the renderer. Verified the final change set with `just check` and `just build-web`.
