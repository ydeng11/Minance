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

- Current deployment is healthy (`/healthz` and `/readyz` pass).
- Operator has shell access to deployment host.
- `sqlite3` CLI is installed on the host.
- `.env.selfhost` is present and includes a valid `AI_CREDENTIAL_SECRET`.
- Enough free disk for backup + SQLite copy + rollback artifacts.

## 3. Preflight Checklist

1. Capture current version/commit and deployment timestamp.
2. Verify runtime health:
   - `curl -fsS http://<host>/healthz`
   - `curl -fsS http://<host>/readyz`
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
- `store.json` (if JSON store is present)
- `minance.sqlite` (if SQLite file is present)

## 5. Data Migration (JSON -> SQLite)

If your current runtime still uses JSON storage, migrate before upgrading app containers:

```bash
MINANCE_STORE_BACKEND=json pnpm migrate:sqlite
MINANCE_STORE_BACKEND=json pnpm validate:sqlite
```

Validation must complete without mismatched totals/counts before cutover.

## 6. Runtime Config for Breaking Release

Set/confirm these values in `.env.selfhost`:

- `MINANCE_STORE_BACKEND=sqlite`
- `MINANCE_SQLITE_FILE=services/api/data/minance.sqlite` (or your persistent path)
- `MINANCE_SQLITE_SCHEMA_FILE=services/api/sql/schema.sql`
- `MINANCE_SQLITE_AUTO_INIT=true` (or explicitly managed by your migration pipeline)

Keep secrets out of git and lock file permissions:

```bash
chmod 600 .env.selfhost
```

## 7. Deploy and Cut Over

1. Pull the target release tag/commit.
2. Rebuild/restart:

```bash
docker compose -f docker-compose.selfhost.yml --env-file .env.selfhost up -d --build
```

3. Verify startup:
   - `docker compose -f docker-compose.selfhost.yml ps`
   - `docker compose -f docker-compose.selfhost.yml logs --tail=100 api web`
4. Confirm readiness and storage mode:
   - `GET /readyz` returns `200`
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
