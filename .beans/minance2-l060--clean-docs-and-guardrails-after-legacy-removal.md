---
# minance2-l060
title: Clean docs and guardrails after legacy removal
status: todo
type: task
priority: normal
tags:
    - cleanup
    - docs
created_at: 2026-03-10T01:55:41Z
updated_at: 2026-03-10T01:55:41Z
parent: minance2-deab
blocked_by:
    - minance2-wr3y
    - minance2-hpwd
---

Update repo documentation and guardrail/config references after the legacy stack is removed.

## Scope
- Remove dead references to deleted legacy paths from active docs and repo guidance.
- Keep `docs/plans/` and treat it as historical/current-stack planning material rather than legacy runtime code.
- Update testing and architecture docs so the current Node stack is the only active path.

## Done when
- Active docs no longer tell contributors to use Quarkus/Maven or `src/main/webui`.
- `docs/plans/` is still present and explicitly not removed as part of this cleanup.
