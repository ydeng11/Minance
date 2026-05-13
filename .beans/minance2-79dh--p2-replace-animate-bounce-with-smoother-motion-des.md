---
# minance2-79dh
title: 'P2: Replace animate-bounce with smoother motion design'
status: scrapped
type: task
priority: normal
tags:
    - audit
    - motion
    - p2
created_at: 2026-04-02T21:39:00Z
updated_at: 2026-04-13T04:02:18Z
---

## Context
From frontend audit (score 10/20).

### Issue
- animate-bounce used in AssistantConversation.tsx:46 for thinking indicator
- Bounce easing is explicitly called out as 'dated and tacky' in frontend-design guidelines
- Frontend-design skill recommends exponential easing (ease-out-quart/quint/expo)

### Fix
- Replace animate-bounce with a subtle fade or pulse using exponential easing
- Use CSS custom animation with ease-out-quart/expo instead of spring physics

### Files affected
- apps/web/src/components/assistant/AssistantConversation.tsx

## Reasons for Scrapping

Cancelled by user request on 2026-04-13.
