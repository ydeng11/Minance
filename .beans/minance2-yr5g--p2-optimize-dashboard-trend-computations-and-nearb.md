---
# minance2-yr5g
title: 'P2: Optimize dashboard trend computations and nearby render hotspots'
status: completed
type: task
priority: normal
created_at: 2026-04-14T03:01:03Z
updated_at: 2026-04-14T03:29:16Z
---

## Context
From the frontend audit recommendation 4 (`/optimize`). The dashboard trend chart recomputes the full max net magnitude inside each mapped bar render, creating avoidable repeated work on every dashboard render.

## Goals
- Remove repeated trend normalization work from the dashboard render path
- Keep behavior and visuals unchanged
- Review adjacent dashboard render hotspots and address only low-risk wins in the same pass
- Verify with targeted tests plus standard frontend checks

## Todo
- [x] Confirm the scoped optimization approach for the dashboard pass
- [x] Add a failing test for the dashboard trend derivation performance contract
- [x] Implement the minimal dashboard optimization and any nearby low-risk render cleanup
- [x] Verify with focused tests, repo checks, and production build

## Summary of Changes

- Added a pure dashboard presentation helper to derive visible trend bars and compute the net normalization baseline once per render pass instead of once per bar.
- Updated the dashboard page to consume the helper and added source-level regression coverage so the inline nested `Math.max(...trend.map(...))` pattern does not come back.
- Added an explorer presentation helper that precomputes spend, income, and net sparkline series in one pass, and updated `ExplorerSummaryBand` to consume those shared arrays.
- Verified the optimization with focused frontend tests, `just check`, and `just build-web`.
