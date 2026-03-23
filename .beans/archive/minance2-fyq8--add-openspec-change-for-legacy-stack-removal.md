---
# minance2-fyq8
title: Add OpenSpec change for legacy stack removal
status: scrapped
type: task
priority: high
tags:
    - cleanup
    - openspec
created_at: 2026-03-10T01:55:41Z
updated_at: 2026-03-21T21:40:34Z
parent: minance2-deab
---

Create the spec/change-management artifacts for the cleanup so the implementation has a tracked source of truth.

## Deliverables
- Add an OpenSpec change for removing the legacy Quarkus stack.
- Write `proposal.md` describing the cleanup, impact, and non-goals.
- Write `tasks.md` with implementation-ready steps aligned to the approved cleanup plan.

## Done when
- The OpenSpec change exists under `openspec/changes/`.
- The task list covers legacy code removal, automation cleanup, docs cleanup, and verification.

## Reasons for Scrapping

OpenSpec is deprecated for this repo, so adding a new legacy-stack removal change is no longer the right source of truth. The cleanup was instead audited directly on latest `origin/main`, and remaining repo maintenance is tracked in beans.
