---
# minance2-udwd
title: Normalize transaction filter overlay tokens
status: completed
type: task
priority: normal
created_at: 2026-04-22T12:45:01Z
updated_at: 2026-04-22T12:46:05Z
---

Continue audit debt reduction by replacing the remaining hard-coded black overlay in the transactions advanced filters with semantic overlay/backdrop tokens, then add regression coverage and verify the web app.

## Checklist

- [x] Audit advanced filter overlay token drift
- [x] Replace hard-coded black backdrop with semantic tokens
- [x] Add regression coverage
- [x] Run targeted and web verification
- [x] Complete bean and commit slice

## Summary of Changes

Replaced the transactions advanced filter backdrop's hard-coded black overlay with the shared bg-app-bg semantic overlay token. Strengthened the theme-foundation contract to assert the semantic backdrop and prevent bg-black from returning in the filter shell. Verified with focused theme contracts, lint, full web tests, production build, and token scan.
