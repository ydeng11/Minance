# Self-Host Compose Nightly Image Design

**Date:** 2026-03-22

## Goal

Make the stock `docker-compose.selfhost.yml` deployment run the published `ydeng11/minance:nightly` image instead of building the combined Minance image locally.

## Approved Direction

- Keep the single-container `app` self-host shape.
- Remove the local `build:` block from the stock compose file.
- Use `image: ydeng11/minance:nightly` for the `app` service.
- Keep the existing runtime-data mount behavior and public web port mapping unchanged.

## Operator Experience

- Operators should pull the published image and then start the stack.
- The stock self-host quick-start becomes:
  - `docker compose ... pull`
  - `docker compose ... up -d`
- Local image-building remains possible only if an operator customizes the compose file outside the stock path.

## Runtime Behavior

- The stock compose stack still mounts `/var/lib/minance` from `${MINANCE_RUNTIME_DATA_SOURCE:-minance_data}`.
- The internal API remains on `127.0.0.1:3001`.
- Docker container health still reflects the internal API readiness probe.

## Documentation Scope

- Update the compose file to reference the published image.
- Update self-host docs to explain that the stock stack pulls `ydeng11/minance:nightly`.
- Replace `up -d --build` instructions with `pull` plus `up -d` in the operator docs.
