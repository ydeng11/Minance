---
# minance2-wr3y
title: Delete legacy Quarkus code and old frontend
status: todo
type: task
priority: high
tags:
    - cleanup
    - legacy-removal
created_at: 2026-03-10T01:55:41Z
updated_at: 2026-03-10T01:55:41Z
parent: minance2-deab
blocked_by:
    - minance2-fyq8
---

Remove the legacy Quarkus application and old frontend from the repository.

## Scope
- Delete legacy Java backend sources, resources, tests, and Quarkus Dockerfiles.
- Delete the old frontend under `src/main/webui`.
- Remove Maven wrapper/build entrypoints and the root legacy compose file tied to the Quarkus app.

## Done when
- No maintained code path depends on `src/main/java`, `src/main/resources`, `src/test`, or `src/main/webui`.
- `pom.xml`, `mvnw`, `mvnw.cmd`, `.mvn/`, and the legacy compose entrypoint are removed.
