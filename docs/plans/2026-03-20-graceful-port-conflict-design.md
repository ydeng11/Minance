# Graceful Port Conflict Handling Design

## Scope

Make the normal combined startup flows choose open ports automatically when the default web or API port is already occupied, and print a clear warning showing the reassigned ports.

## Goals

- Keep `just dev` usable when `3000` or `3001` is already in use.
- Keep `just start` usable under the same condition.
- Preserve the existing developer expectation that web prefers `3000` and API prefers `3001`.
- Ensure the web app always points at the actual API port after reassignment.

## Non-Goals

- Change the direct `pnpm dev:web`, `pnpm dev:api`, `pnpm start:web`, or `pnpm start:api` behavior.
- Introduce random-port behavior when the next open port can be chosen deterministically.
- Move port-selection logic into frontend or API application code.

## Decisions

### 1. Use a small TypeScript orchestration script for the combined startup flow

The current conflict is not isolated to one process. The web app and API start together, and the web rewrite configuration depends on the API origin. A single orchestration script under `scripts/` is the smallest place that can resolve both ports together and launch both processes with coordinated environment values.

### 2. Choose the next open port instead of a random port

The script should try `3000` for web and `3001` for API first, then increment until it finds an available port. This keeps the behavior predictable, keeps logs readable, and matches the user expectation that the app stays close to the standard local ports.

### 3. Feed the resolved API origin into the web process

`apps/web/next.config.ts` already reads `MINANCE_API_ORIGIN`, so the wrapper should pass `http://127.0.0.1:<resolved-api-port>` into the web process. This avoids any frontend code changes and keeps the rewrite behavior centralized where it already lives.

### 4. Keep the direct service commands unchanged

The fix should target the combined flows invoked by `just dev` and `just start`. Individual direct commands can remain as-is for now so this change stays focused on the documented happy path for local development.

## Architecture

### New script

Add a script such as `scripts/run-with-open-ports.ts` that:

- accepts a mode argument of `dev` or `start`
- checks whether the preferred web and API ports are available
- increments each preferred port until a free one is found
- prints warnings when a preferred port had to move
- spawns the API and web child processes with inherited stdio
- forwards termination signals to both children

### Existing integrations

- `just dev` should keep `pnpm install`, then call the new script in `dev` mode.
- `just start` should call the new script in `start` mode.
- `apps/web/next.config.ts` should remain unchanged and continue using `MINANCE_API_ORIGIN`.

## Data Flow

1. `just dev` or `just start` launches the orchestration script.
2. The script resolves the API port starting from `3001`.
3. The script resolves the web port starting from `3000`.
4. The script starts the API with `PORT=<resolved-api-port>`.
5. The script starts the web with `MINANCE_API_ORIGIN=http://127.0.0.1:<resolved-api-port>` and `--port <resolved-web-port>`.
6. Users see warnings when a reassignment happened and can use the printed final URLs.

## Error Handling And State Integrity

- If a preferred port is occupied, the script should warn and continue with the next available port.
- If no open port can be found within a reasonable incrementing search window, the script should fail with a clear message.
- If either child process exits, the script should terminate the sibling process so the combined workflow remains easy to stop and reason about.

## Testing Strategy

- Add a focused test for the new script using a dry-run mode or exported helpers so port selection can be verified without launching long-lived app processes.
- Verify that occupied default ports cause reassignment to the next open port.
- Verify that the generated web process environment points to the reassigned API origin.

## Risks

- Port probing can race if another process grabs the port after probing but before launch.
  Mitigation: keep the probe-and-launch window small and continue to rely on the child process exit path for rare races.

- Process orchestration in `just` can become brittle if too much logic is embedded there.
  Mitigation: keep the logic in a TypeScript script and let `just` stay a thin entrypoint.
