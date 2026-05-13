---
# minance2-j79q
title: 'P1: Break AI aesthetic signature with custom typography and visual identity'
status: completed
type: feature
priority: high
tags:
    - audit
    - anti-pattern
    - p1
created_at: 2026-04-02T21:38:45Z
updated_at: 2026-04-15T01:26:48Z
---

## Context
From frontend audit (score 10/20). Anti-Patterns scored 1/4.

### AI slop tells identified
1. Dark mode with emerald glow accents (emerald-500/10, emerald-500/20, emerald-300)
2. backdrop-blur-xl glassmorphism on sidebar, bottom nav, assistant, shell
3. Hero metric KPI template on dashboard (big number + small label + accent badge x4)
4. Identical card grids (Top Categories / Top Merchants are visual clones)
5. System default fonts -- no custom fonts, no next/font, no @font-face
6. animate-bounce in assistant thinking state
7. Uniform rounded-[28px] + heavy shadows across all surfaces

### Fix
1. Introduce custom typography via next/font (distinctive display + refined body)
2. Break card grid monotony with varied layouts and visual differentiation
3. Reduce or remove backdrop-blur-xl usage -- use solid surfaces instead
4. Give dashboard KPI cards distinct visual treatments
5. Consider a light or dual-mode theme
6. Add visual personality and intentional design decisions

### Reference
See DON'T guidelines in .claude/skills/frontend-design/SKILL.md


## Todo
- [x] Confirm the visual direction for the bolder pass
- [x] Present the dashboard and explorer redesign plan
- [x] Write the design and implementation docs
- [x] Implement the approved visual redesign test-first
- [x] Verify the redesigned experience with tests and build

## Summary of Changes

Added editorial typography with `Fraunces` and `IBM Plex Sans`, wired through `next/font` and theme tokens. Rebuilt the dashboard into a hero-led editorial layout with differentiated KPI treatments, stronger category and merchant sections, and a cleaner ledger handoff. Reworked explorer summary, trend, merchant, and anomaly surfaces to break the repeated dark-card pattern while preserving existing interaction and test contracts. Added a source-level design contract test and verified the redesign with focused Playwright coverage, `just check`, and `just build-web`.
