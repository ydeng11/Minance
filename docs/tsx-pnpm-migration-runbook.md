# TSX and pnpm Migration Runbook

This runbook describes contributor workflow for the `migrate-to-tsx-and-pnpm` standard.

## 1. Wave Order

Follow changes in this order:

1. `apps/web` (UI source migration)
2. `packages/domain` and `services/api` (shared and backend migration)
3. `e2e` and `scripts` (test/support tooling migration)
4. CI/workflow and lockfile enforcement hardening

Do not run later-wave cleanups before earlier waves are stable in `pnpm check`.

## 2. Daily Contributor Flow

```bash
pnpm install
pnpm check
```

If you touch `src/main/webui`, use local pnpm mode for that package:

```bash
cd src/main/webui
pnpm install --ignore-workspace --frozen-lockfile
pnpm lint
pnpm test -- --run
```

## 3. Exception Process

Use exceptions only when a JS-family file cannot be migrated immediately.

1. Add a `bd` issue with rationale and timeline.
2. Add exact path to `config/guardrails/js-extension-allowlist.txt`.
3. Keep scope minimal and remove the allowlist entry once migrated.
4. Link follow-up issue with `discovered-from:<parent-issue>`.

## 4. Lockfile Policy

- `pnpm-lock.yaml` is canonical for workspace packages.
- `src/main/webui/pnpm-lock.yaml` is canonical for the legacy webui package.
- `package-lock.json` files are forbidden and blocked by `scripts/run-guardrails.ts`.

## 5. Rollback Guidance

If a migration wave introduces instability:

1. Revert only the wave-specific commit(s).
2. Keep prior validated waves in place.
3. Re-run `pnpm check` and affected package tests.
4. Record blocker details in `bd` and create follow-up issues.

## 6. CI Expectations

- GitHub Actions workflows must use pnpm setup and pnpm cache.
- New non-pnpm commands in maintained docs/automation are blocked by guardrails.
