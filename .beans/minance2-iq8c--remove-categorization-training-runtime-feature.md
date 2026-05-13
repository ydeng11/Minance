---
# minance2-iq8c
title: Remove categorization training runtime feature
status: completed
type: task
priority: normal
created_at: 2026-05-13T02:43:06Z
updated_at: 2026-05-13T02:47:56Z
---

Remove the private backup-database categorization training runtime feature.\n\n- [x] Remove backend training runtime and API endpoint\n- [x] Remove web client/UI training status wiring\n- [x] Update tests and docs\n- [x] Run required verification

## Summary of Changes\n\n- Removed the runtime categorization training module, status endpoint, web client helper, and Settings > AI training panel.\n- Updated categorization to flow from rules to merchant memory to AI agent to keyword fallback.\n- Removed backup training context from LLM categorization prompts.\n- Updated docs and tests, including prompt coverage that backup training context is gone.\n- Verified with focused backend tests, @minance/web test, just build-web, and just check.
