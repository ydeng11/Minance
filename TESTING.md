# Local Testing & E2E Strategy

## Quick Commands

```bash
pnpm test
pnpm e2e
```

Useful targeted runs:

```bash
pnpm --filter @minance/web test
env NODE_ENV=test tsx --test services/api/test/**/*.test.ts
env NODE_ENV=test playwright test e2e/specs/<spec>.spec.ts
```

## Current Test Stack

### Frontend

- Route and component tests live under `apps/web/src/**/*.test.ts`.
- The frontend package runs them with `tsx --test`.
- Lint for the web app runs with `pnpm --filter @minance/web lint`.

### Backend

- API tests live under `services/api/test/**/*.test.ts`.
- They run with the root `pnpm test` command under `NODE_ENV=test`.
- These tests cover storage, auth, imports, analytics, and API-layer behavior for the TypeScript service in `services/api/src`.

### End-to-End

- Playwright specs live under `e2e/specs/**/*.spec.ts`.
- E2E runs exercise the current Next.js frontend (`apps/web`) and TypeScript API (`services/api`).
- The main commands are:

```bash
pnpm e2e
pnpm e2e:headed
pnpm e2e:ci
```

## What `pnpm test` Includes

The root test command runs:

- root guardrail checks from `scripts/check-root-script-binaries.test.mjs`
- the frontend test-first guard from `scripts/check-frontend-test-first.ts`
- backend tests in `services/api/test/**/*.test.ts`
- frontend tests in `apps/web/src/**/*.test.ts`

## CI

GitHub Actions runs the current workspace stack from [`.github/workflows/ci.yml`](/Users/ihelio/code/minance2/.github/workflows/ci.yml):

- install workspace dependencies with pnpm
- run `pnpm test`
- install Playwright Chromium
- run `pnpm e2e:ci`

## Local Runtime Notes

- `pnpm dev` starts the web app on `http://localhost:3000` and the API on `http://localhost:3001`.
- E2E runs use isolated storage via `MINANCE_SQLITE_FILE_TEST=services/api/tmp/e2e-minance.sqlite`.
- Backend tests default to test-mode storage under `services/api/tmp/` unless a suite overrides the path.
