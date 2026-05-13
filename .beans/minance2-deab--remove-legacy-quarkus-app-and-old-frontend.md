---
# minance2-deab
title: Remove legacy Quarkus app and old frontend
status: completed
type: feature
priority: high
tags:
    - cleanup
    - legacy-removal
created_at: 2026-03-10T01:55:14Z
updated_at: 2026-04-13T03:58:34Z
blocked_by:
    - minance2-tbbk
---

Legacy Quarkus removal plan for the repo.

## Summary
- Standardize the repo on the active pnpm workspace stack: `apps/web`, `services/api`, and `packages/domain`.
- Remove the legacy Quarkus backend, old Vite frontend, Maven wrapper/build files, and Quarkus-specific automation.
- Keep `docs/plans/` in place as current-stack design history.
- Remove legacy release/version automation for now instead of replacing it in this change.

## Acceptance
- Legacy implementation roots under `src/` that belong to the Quarkus app are removed.
- Maven and Quarkus release/test automation is removed.
- Current docs and guardrails no longer point at deleted legacy paths.
- `docs/plans/` remains in the repo.
- Current pnpm test and e2e flows remain the source of truth.

## Notes

Audit on 2026-03-21 confirmed the legacy Quarkus/frontend removal work itself is already finished on latest `origin/main`. The remaining open item is repo-wide Playwright verification, tracked in `minance2-tbbk`, before this feature can be cleanly closed.

## Summary of Changes

- Confirmed the legacy Quarkus app, old frontend, and associated Maven/Quarkus automation remain removed from the active repository.
- Verified the remaining cleanup follow-up (`minance2-4wbi`) is now green on the current checkout, including `CI=1 pnpm e2e:ci` with `50 passed, 1 skipped`.
- Reconfirmed that remaining Quarkus references are limited to intentional historical documentation, so this cleanup feature can be closed.
