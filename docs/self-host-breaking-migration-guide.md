# Self-Host Breaking Release Migration Guide

This guide defines the operator playbook for migrating self-hosted Minance Next instances to the upcoming breaking release.

Companion docs:
- [`self-host-operations-runbook.md`](./self-host-operations-runbook.md)
- [`json-to-sqlite-migration-runbook.md`](./json-to-sqlite-migration-runbook.md)
- [`self-host-security-hardening-checklist.md`](./self-host-security-hardening-checklist.md)

## 1. What Changes in the Breaking Release

- SQLite-backed persistence becomes the required default runtime backend.
- Existing JSON-backed deployments must migrate data before production cutover.
- Migration/recovery procedure is mandatory before deploy (backup + validation + smoke tests).

## 2. Preconditions

- Current deployment is healthy (`docker compose ... ps` shows `app` healthy and `GET /` succeeds).
- Operator has shell access to deployment host.
- `sqlite3` CLI is installed on the host.
- `.env.selfhost` is present and includes a valid `AI_CREDENTIAL_SECRET`.
- Enough free disk for backup + SQLite copy + rollback artifacts.

## 3. Preflight Checklist

1. Capture current version/commit and deployment timestamp.
2. Verify runtime health:
   - `docker compose -f docker-compose.selfhost.yml --env-file .env.selfhost ps`
   - `curl -I -fsS http://<host>/`
3. Confirm `sqlite3` exists:
   - `sqlite3 --version`
4. Confirm backup path is writable (`MINANCE_BACKUP_ROOT` or `./backups`).

## 4. Backup Before Any Migration

Run:

```bash
scripts/selfhost-backup.sh
```

Verify backup output contains:
- `manifest.txt`
- `checksums.txt`
- `store.json` (only if a JSON fixture/input file was present)
- `minance.sqlite` (if SQLite file is present)

## 5. Data Migration (JSON -> SQLite)

If you need to load a JSON fixture into SQLite before upgrading app containers, run:

```bash
pnpm migrate:sqlite
pnpm validate:sqlite
```

Validation must complete without mismatched totals/counts before cutover.

## 6. Runtime Config for Breaking Release

For the stock `docker-compose.selfhost.yml` stack, the published image `ydeng11/minance:nightly` already runs with:

- `MINANCE_STORE_BACKEND=sqlite`
- `MINANCE_SQLITE_FILE=/var/lib/minance/production-minance.sqlite`
- `MINANCE_SQLITE_SCHEMA_FILE=/app/services/api/sql/schema.sql`
- `MINANCE_SQLITE_AUTO_INIT=true`

In `.env.selfhost`, normally set or confirm:

- `AI_CREDENTIAL_SECRET=<strong-random-secret>`
- `MINANCE_WEB_PORT=<host-port>`
- `MINANCE_RUNTIME_DATA_SOURCE=./services/api/data` if you want to reuse the repo's existing runtime data directory

Add `MINANCE_SQLITE_FILE`, `MINANCE_SQLITE_SCHEMA_FILE`, or `MINANCE_SQLITE_AUTO_INIT` to `.env.selfhost` only if you customize the compose file or run Minance outside the stock stack. Use `MINANCE_DATA_FILE` only for explicit JSON fixture-import workflows.

Keep secrets out of git and lock file permissions:

```bash
chmod 600 .env.selfhost
```

## 7. Deploy and Cut Over

1. Pull the target release tag/commit.
2. Pull and restart:

```bash
docker compose -f docker-compose.selfhost.yml --env-file .env.selfhost pull
docker compose -f docker-compose.selfhost.yml --env-file .env.selfhost up -d
```

3. Verify startup:
   - `docker compose -f docker-compose.selfhost.yml ps`
   - `docker compose -f docker-compose.selfhost.yml logs --tail=100 app`
4. Confirm readiness and storage mode:
   - `docker compose -f docker-compose.selfhost.yml ps` reports `app` healthy
   - `GET /` returns `200`
   - `GET /v1/system/storage` reports SQLite as active backend

## 8. Post-Migration Smoke Checks

Execute minimum operator validation:

1. Login succeeds.
2. Dashboard loads with expected totals.
3. Transactions list/filter works.
4. CSV import analyze/commit works.
5. Categories and recurrings pages render and mutate successfully.
6. `/v1/system/metrics` responds.

## 9. Rollback Procedure

If cutover fails:

1. Stop new containers.
2. Restore last known-good backup:

```bash
scripts/selfhost-restore.sh --backup ./backups/<stamp> --apply
```

3. Re-deploy previous known-good release.
4. Re-run health and smoke checks.
5. Capture incident notes before retrying migration.

## 10. Change Management Notes

- Schedule migration during a maintenance window.
- Announce a short write freeze while migration/cutover runs.
- Record migration evidence (backup stamp, validation output, smoke-check timestamp).
