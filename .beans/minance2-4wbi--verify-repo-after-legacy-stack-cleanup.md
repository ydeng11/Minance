---
# minance2-4wbi
title: Verify repo after legacy stack cleanup
status: completed
type: task
priority: high
tags:
    - cleanup
    - verification
created_at: 2026-03-10T01:55:41Z
updated_at: 2026-04-13T03:58:29Z
parent: minance2-deab
blocked_by:
    - minance2-l060
    - minance2-tbbk
---

Run the current verification suite and a final reference sweep after the cleanup lands.

## Verification
- `pnpm install --frozen-lockfile`
- `pnpm guardrails`
- `pnpm test`
- `pnpm e2e:ci`
- Repo-wide grep for `src/main/webui|src/main/java|src/test/java|pom.xml|mvnw|quarkus|quinoa`

## Done when
- Current pnpm validation passes.
- Remaining legacy references, if any, are only intentional historical mentions.

## Verification Notes

Verification rerun on 2026-03-21 produced mixed results. `pnpm install --frozen-lockfile` succeeded, `just check` succeeded, the legacy-reference sweeps only found intentional historical mentions, but `pnpm e2e:ci` failed with 12 Playwright specs. Follow-up bug `minance2-tbbk` now tracks that failure set.

## Verification Notes

Verification rerun on 2026-04-12 in the current working tree succeeded end-to-end. `pnpm install --frozen-lockfile` succeeded, `pnpm guardrails` passed, `pnpm test` passed, and `CI=1 pnpm e2e:ci` finished green with `50 passed, 1 skipped`. Repo-wide legacy-reference sweeps still only find intentional historical mentions in docs.

## Summary of Changes

- Re-ran the full legacy-cleanup verification suite on the current repository state.
- Confirmed the previous Playwright blocker tracked in `minance2-tbbk` is resolved on the current checkout.
- Reconfirmed that remaining Quarkus/Maven references are historical documentation only, not active implementation or guardrail drift.
