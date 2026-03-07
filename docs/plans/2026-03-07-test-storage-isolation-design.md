# Test Storage Isolation Design

## Scope

Isolate test storage from local development storage so standard test runs cannot read from or write to the live local SQLite or JSON store paths configured for `pnpm dev`.

## Goals

- Keep local development using the storage locations configured in `.env.local`
- Make test runs resolve storage from test-only env or safe test defaults
- Remove the need to manually set and unset `NODE_ENV` between dev and test flows
- Preserve explicit test overrides for integration and E2E runners

## Decisions

### Environment file split

- Non-test runtime loads `.env.local`
- Test runtime loads `.env.test`

`NODE_ENV=test` is the switch.

### Storage path split

When `NODE_ENV === "test"`:

- `MINANCE_DATA_FILE_TEST` is used for JSON storage
- `MINANCE_SQLITE_FILE_TEST` is used for SQLite storage
- `MINANCE_SQLITE_SCHEMA_FILE_TEST` is used first for schema, then the shared schema path

Safe defaults when test-specific env vars are unset:

- JSON: `services/api/tmp/test-store.json`
- SQLite: `services/api/tmp/test-minance.sqlite`
- Schema: `services/api/sql/schema.sql`

When `NODE_ENV !== "test"`:

- `MINANCE_DATA_FILE` and `MINANCE_SQLITE_FILE` keep their current meaning
- existing local `.env.local` behavior remains the source of truth

The key rule is that test mode must not fall back to live data paths.

## Script behavior

- `pnpm dev` and `pnpm dev:api` set `NODE_ENV=development`
- `pnpm test` and related Node/API test scripts set `NODE_ENV=test`
- `pnpm e2e` and related Playwright scripts set `NODE_ENV=test`

This keeps normal command usage simple:

- local dev: `pnpm dev`
- tests: `pnpm test`
- E2E: `pnpm e2e`

## Affected files

- `services/api/src/config.ts`
- `services/api/src/runtime-env.ts` (new helper module)
- `services/api/test/runtime-env.test.ts`
- `services/api/test/api-contract.test.ts`
- `playwright.config.mjs`
- `package.json`
- `.env.local`
- `.env.test`
- `README.md`

## Verification

- Unit tests for runtime env resolution
- Existing API contract tests continue to boot with explicit test storage overrides
- Direct local verification:
  - `pnpm test`
  - `pnpm e2e` entry points resolve isolated test storage
  - `pnpm dev` continues to use `.env.local`
