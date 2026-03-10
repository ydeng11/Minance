---
# minance2-hpwd
title: Remove legacy CI, release scripts, and Quarkus rules
status: todo
type: task
priority: high
tags:
    - cleanup
    - automation
created_at: 2026-03-10T01:55:41Z
updated_at: 2026-03-10T01:55:41Z
parent: minance2-deab
blocked_by:
    - minance2-fyq8
---

Remove repo automation and local rules that still assume the Quarkus/Maven stack exists.

## Scope
- Remove Maven-based GitHub workflows for tests, Docker release, and versioning.
- Remove legacy release/build shell scripts that shell out to Maven.
- Remove Quarkus/Quinoa-specific editor or agent rule files that are no longer applicable.

## Done when
- CI and local helper scripts no longer reference Maven, Quarkus, or Quinoa for active workflows.
- Only the pnpm/Node current stack remains in active automation.
