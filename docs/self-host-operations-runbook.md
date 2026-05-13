# Self-Host Operations Runbook

This runbook defines the baseline self-host profile for Minance Next, including deployment, backup/restore, and secret lifecycle policy.

Security baseline companion checklist:
- [`self-host-security-hardening-checklist.md`](./self-host-security-hardening-checklist.md)
- [`self-host-breaking-migration-guide.md`](./self-host-breaking-migration-guide.md)

## 1. Deployment Profile (Docker Compose + Env Template)

### Files
- Compose stack: `docker-compose.selfhost.yml`
- Published app image: `ydeng11/minance:nightly`
- Image source Dockerfile: `deploy/docker/Dockerfile.combined`
- Env template: `.env.selfhost.example`

### Quick start
1. Copy `.env.selfhost.example` to `.env.selfhost`.
2. Set `AI_CREDENTIAL_SECRET` in `.env.selfhost` to a strong random secret.
3. If you want Docker to reuse the repo's current SQLite/runtime data directory, set `MINANCE_RUNTIME_DATA_SOURCE=./services/api/data` in `.env.selfhost`. Leave it unset to use the Docker-managed named volume `minance_data`.
4. Treat `.env.selfhost` as the Docker self-host env file only. Local `pnpm dev` should use `.env.local`.
5. Pull and launch:

```bash
docker compose -f docker-compose.selfhost.yml --env-file .env.selfhost pull
docker compose -f docker-compose.selfhost.yml --env-file .env.selfhost up -d
```

6. Verify services:

```bash
docker compose -f docker-compose.selfhost.yml ps
docker compose -f docker-compose.selfhost.yml logs --tail=100 app
curl -I -fsS http://localhost:${MINANCE_WEB_PORT:-3000}
curl -i -sS http://localhost:${MINANCE_WEB_PORT:-3000}/v1/system/storage | sed -n '1,20p'
```

### Required environment values
- `AI_CREDENTIAL_SECRET` (required): encrypts provider keys at rest.
- `MINANCE_WEB_PORT` (recommended): host port for web.
- `MINANCE_RUNTIME_DATA_SOURCE` (optional): mount source for `/var/lib/minance`; set to `./services/api/data` to reuse the repo runtime directory, otherwise leave unset for the `minance_data` named volume.

### Compose defaults and advanced overrides
- The stock `docker-compose.selfhost.yml` stack runs the published image `ydeng11/minance:nightly`.
- The stock stack already sets `MINANCE_STORE_BACKEND=sqlite`, `MINANCE_SQLITE_FILE=/var/lib/minance/minance.sqlite`, `MINANCE_SQLITE_SCHEMA_FILE=/app/services/api/sql/schema.sql`, and `MINANCE_SQLITE_AUTO_INIT=true` inside the combined app container.
- The app volume source is controlled by `MINANCE_RUNTIME_DATA_SOURCE`:
  - unset: `minance_data` named volume
  - `./services/api/data`: bind-mounted host directory that reuses the existing `services/api/data/minance.sqlite`
- Only add `MINANCE_SQLITE_FILE` or `MINANCE_SQLITE_SCHEMA_FILE` to `.env.selfhost` if you customize the compose file or run Minance outside the stock stack. Use `MINANCE_DATA_FILE` only when you intentionally run a JSON fixture-import flow.
- The env template also includes commented optional runtime flags supported by the current codebase, including `AI_LLM_CATEGORIZATION_ENABLED`, `AI_LLM_ASSISTANT_SYNTHESIS_ENABLED`, `IMPORT_PROCESSED_EDITOR_ENABLED`, `IMPORT_PROCESSING_LOGS_ENABLED`, `IMPORT_DIRECTION_INFERENCE_ENABLED`, `IMPORT_DIRECTION_LLM_ENABLED`, `AI_CREW_ANALYSIS_ENABLED`, `CREWAI_PYTHON_BIN`, `AI_CREW_ANALYSIS_TIMEOUT_MS`, and `AI_LLM_TIMEOUT_MS`.

### Upgrade-safe practices
1. Pin deployments to a git tag/commit before building.
2. Keep `.env.selfhost` out of git and source control.
3. Keep runtime data persistent either with the default `minance_data` named volume or with an explicit bind mount such as `MINANCE_RUNTIME_DATA_SOURCE=./services/api/data`.
4. Run backup script before every deploy and migration.
5. After deploy, verify healthcheck status and login flow before traffic cutover.

## 2. Backup and Restore Strategy

### Backups
The backup script captures the runtime SQLite database, optional JSON fixture/input file if present, and the uploads archive with checksums.

When `MINANCE_RUNTIME_DATA_SOURCE=./services/api/data`, the backup/restore defaults already point at the same host directory used by Docker, so no script overrides are required.

```bash
scripts/selfhost-backup.sh
```

Optional stamp override:

```bash
scripts/selfhost-backup.sh --stamp 20260302T000000Z
```

Artifacts are written to `${MINANCE_BACKUP_ROOT:-./backups}/<stamp>/`:
- `minance.sqlite` (if present)
- `store.json` (only if a JSON fixture/input file was present)
- `uploads.tar.gz` (if present)
- `checksums.txt`
- `manifest.txt`
- `sqlite-quick-check.txt` (if sqlite3 CLI exists)

### Restore drill (staged by default)

```bash
scripts/selfhost-restore.sh --backup ./backups/<stamp>
```

To apply restore into runtime paths:

```bash
scripts/selfhost-restore.sh --backup ./backups/<stamp> --apply
```

### Recommended cadence
- Daily automated backup job
- Pre-deploy backup on every release
- Monthly restore drill in non-production (verify auth + dashboard + transactions views)

## 3. Secrets Management and Rotation Policy

### Secret inventory
- `AI_CREDENTIAL_SECRET`: required for API credential encryption.
- Provider keys (OpenAI/OpenRouter/Anthropic/Google): stored encrypted in app data.
- Optional bootstrap variables (`OPENROUTER_API_KEY`, `DEV_TEST_ACCOUNT_*`): keep unset in production.

### Storage policy
1. Keep `.env.selfhost` only on deployment host.
2. Restrict permissions (`chmod 600 .env.selfhost`).
3. Never commit `.env.selfhost` or raw API keys.

### Rotation policy
- `AI_CREDENTIAL_SECRET`: rotate on a planned maintenance window or suspected compromise.
- Provider keys: rotate every 90 days, and immediately on incident.
- Rotation flow:
  1. Add new credentials in the settings UI.
  2. Update defaults/failover providers.
  3. Revoke old credentials from the provider side.

### Incident recovery
1. Revoke impacted provider keys immediately.
2. Rotate `AI_CREDENTIAL_SECRET`.
3. Force reconfiguration of provider credentials in app settings.
4. Review audit trail (`audit_events`) for suspicious API settings changes.

## 4. Observability Baseline

### Container health and public probes
- The stock compose stack uses Docker container health to track the internal API readiness probe at `http://127.0.0.1:3001/readyz`.
- `docker compose -f docker-compose.selfhost.yml ps` should report `app` as `healthy` once SQLite foundation is ready.
- Public web verification should use `GET /` on the published web port.
- Storage visibility (authenticated): `GET /v1/system/storage`.
- Metrics snapshot (authenticated): `GET /v1/system/metrics`.
- Internal API liveness/readiness endpoints still exist inside the container for debugging, but the stock compose stack does not publish them directly on the host.

### Structured request logs
- API emits JSON log lines for every request with:
  - `event=http.request`
  - `requestId`, `method`, `path`, `statusCode`, `durationMs`
  - `remoteAddress`, `userAgent`
- Forward container logs to your preferred sink (journald, Loki, Elasticsearch, CloudWatch, etc.).

### Minimum alert policy
- Availability:
  - Alert when the `app` container health becomes `unhealthy` for 2 consecutive probe windows.
  - Alert when `GET /` fails on the published web origin for more than 5 minutes.
- Error rate:
  - Alert when `5xx` ratio exceeds 2% over a rolling 10-minute window.
- Latency:
  - Alert when p95 API latency exceeds 1200ms over 15 minutes.
- Capacity:
  - Alert when backup directory free disk drops below 15%.

## 5. Operational Verification Checklist

- [ ] `docker compose ... ps` shows healthy `app`.
- [ ] Login works with expected user account(s).
- [ ] `GET /` returns `200` on the published web port.
- [ ] `/v1/system/storage` responds and reports expected backend.
- [ ] `/v1/system/metrics` is reachable for operator diagnostics.
- [ ] Backup artifact for current release exists and has checksums.
- [ ] Restore drill executed in non-production within the last 30 days.
- [ ] `.env.selfhost` permissions are restricted and secrets rotated per policy.
