---
# minance2-2jid
title: Publish Docker image to ydeng11/minance:nightly
status: completed
type: task
priority: normal
created_at: 2026-03-23T01:52:26Z
updated_at: 2026-03-23T02:28:07Z
---

## Goal

Build and publish the requested Docker image from the current branch to `ydeng11/minance:nightly`.

## Todo

- [x] Confirm which combined-image runtime shape should ship under the single nightly tag
- [x] Verify Docker Hub auth and current repo/tag state
- [x] Build the publishable image
- [x] Push the image to Docker Hub
- [x] Record the pushed digest and complete the bean

## Summary of Changes

- Added a new combined-image packaging flow with `deploy/docker/Dockerfile.combined` and `deploy/docker/start-combined.sh` so the current Next web app and Node API can run together in one container.
- Verified the combined image locally against the existing runtime data directory mounted at `/var/lib/minance`, including successful web startup on port `3000`, internal API readiness, `/v1/system/storage` proxying through the web server, and a matching `users` row count of `2` in the mounted SQLite file.
- Published `ydeng11/minance:nightly` to Docker Hub with manifest digest `sha256:9f2818de85473f9117096c615f3fe6471ebf9c1553c09c7ff4a19a4afe0fba8a`.

- Republished `ydeng11/minance:nightly` as a multi-arch manifest list with final digest `sha256:3eb284112c3ff6ab91d8a9dd3fa0b1317b3426ebb3e1db73e5bf1961b57b308e`, verified via `docker buildx imagetools inspect` to include both `linux/amd64` and `linux/arm64`.
