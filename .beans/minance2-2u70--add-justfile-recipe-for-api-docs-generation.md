---
# minance2-2u70
title: Add Justfile recipe for API docs generation
status: completed
type: task
priority: normal
created_at: 2026-03-29T20:03:21Z
updated_at: 2026-03-29T20:03:42Z
---

Add a Just recipe that runs the generated API docs command.

- [x] Add a failing test that expects a Justfile recipe for API docs generation
- [x] Add the Justfile recipe
- [x] Verify the test and the recipe execution
- [x] Summarize the change

## Summary of Changes

Added a `docs-api` recipe to the root `Justfile` that delegates to `pnpm docs:api`, so generated import API docs can be refreshed through `just`. Added regression coverage in the existing root script test file to ensure the recipe stays present and points at the correct command. Verified with the targeted root test and a real `just docs-api` run.
