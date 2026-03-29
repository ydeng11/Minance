---
# minance2-ly56
title: Build and push new Docker image
status: completed
type: task
priority: normal
created_at: 2026-03-27T20:35:53Z
updated_at: 2026-03-27T20:40:19Z
---

## Goal

Build and push a fresh Docker image for the current minance2 codebase.

## Todo

- [x] Confirm the expected image name, registry, and tag from repo docs/config
- [x] Build the Docker image successfully
- [x] Push the image successfully
- [x] Summarize what was published and any follow-up notes

## Summary of Changes

- Confirmed the published self-host image target is `ydeng11/minance:nightly` from the repo docs and compose stack.
- Built `deploy/docker/Dockerfile.combined` locally as `minance-next-combined:test`.
- Verified the local container with an isolated Docker volume: healthcheck became `healthy`, `GET /` returned `200 OK`, and `GET /v1/system/storage` returned `401 Unauthorized` without credentials.
- Published a fresh multi-arch Docker Hub image for `linux/amd64` and `linux/arm64`.
- Confirmed the pushed manifest list digest is `sha256:4bb2f6c3e6ea792fbae3339a385f94b9cecede4592939c413294da542f22357c`.
- Cleaned up the temporary verification container and volume after the smoke test.
