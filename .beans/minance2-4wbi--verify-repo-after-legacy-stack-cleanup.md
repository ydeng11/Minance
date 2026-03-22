---
# minance2-4wbi
title: Verify repo after legacy stack cleanup
status: todo
type: task
priority: high
tags:
    - cleanup
    - verification
created_at: 2026-03-10T01:55:41Z
updated_at: 2026-03-21T21:49:26Z
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
