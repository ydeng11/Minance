# Self-Host Operations Runbook

This runbook defines the baseline self-host profile for Minance Next, including deployment, backup/restore, and secret lifecycle policy.

Security baseline companion checklist:
- [`self-host-security-hardening-checklist.md`](./self-host-security-hardening-checklist.md)
- [`self-host-breaking-migration-guide.md`](./self-host-breaking-migration-guide.md)

## 1. Deployment Profile (Docker Compose + Env Template)

### Files
- Compose stack: `docker-compose.selfhost.yml`
- API image Dockerfile: `deploy/docker/Dockerfile.api`
- Web image Dockerfile: `deploy/docker/Dockerfile.web`
- Env template: `.env.selfhost.example`

### Quick start
1. Copy `.env.selfhost.example` to `.env.selfhost`.
2. Set `AI_CREDENTIAL_SECRET` in `.env.selfhost` to a strong random secret.
3. Treat `.env.selfhost` as the Docker self-host env file only. Local `pnpm dev` should use `.env.local`.
4. Build and launch:

```bash
docker compose -f docker-compose.selfhost.yml --env-file .env.selfhost up -d --build
```

4. Verify services:

```bash
docker compose -f docker-compose.selfhost.yml ps
docker compose -f docker-compose.selfhost.yml logs --tail=100 api web
```

### Required environment values
- `AI_CREDENTIAL_SECRET` (required): encrypts provider keys at rest.
- `MINANCE_WEB_PORT` (recommended): host port for web.
- `MINANCE_API_PORT` (recommended): host port for API (debug/admin use).

### Compose defaults and advanced overrides
- The stock `docker-compose.selfhost.yml` stack already sets `MINANCE_STORE_BACKEND=sqlite`, `MINANCE_SQLITE_FILE=/var/lib/minance/minance.sqlite`, `MINANCE_SQLITE_SCHEMA_FILE=/app/services/api/sql/schema.sql`, and `MINANCE_SQLITE_AUTO_INIT=true` inside the API container.
- Only add `MINANCE_SQLITE_FILE` or `MINANCE_SQLITE_SCHEMA_FILE` to `.env.selfhost` if you customize the compose file or run the API outside the stock stack. Use `MINANCE_DATA_FILE` only when you intentionally run a JSON fixture-import flow.
- The env template also includes commented optional runtime flags supported by the current codebase, including `AI_LLM_CATEGORIZATION_ENABLED`, `AI_LLM_ASSISTANT_SYNTHESIS_ENABLED`, `IMPORT_PROCESSED_EDITOR_ENABLED`, `IMPORT_PROCESSING_LOGS_ENABLED`, `IMPORT_DIRECTION_INFERENCE_ENABLED`, `IMPORT_DIRECTION_LLM_ENABLED`, `AI_CREW_ANALYSIS_ENABLED`, `CREWAI_PYTHON_BIN`, `AI_CREW_ANALYSIS_TIMEOUT_MS`, `AI_LLM_TIMEOUT_MS`, and `MINANCE_TRAINING_DB_PATH`.

### Upgrade-safe practices
1. Pin deployments to a git tag/commit before building.
2. Keep `.env.selfhost` out of git and source control.
3. Use named volume `minance_data` as persistent runtime data.
4. Run backup script before every deploy and migration.
5. After deploy, verify healthcheck status and login flow before traffic cutover.

## 2. Backup and Restore Strategy

### Backups
The backup script captures the runtime SQLite database, optional JSON fixture/input file if present, and the uploads archive with checksums.

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

### API health/readiness probes
- Liveness: `GET /healthz` returns `200` when the API process is running.
- Readiness: `GET /readyz` returns:
  - `200` when active storage backend checks pass.
  - `503` when required dependencies are not ready (for example SQLite foundation issues).
- Storage visibility (authenticated): `GET /v1/system/storage`.
- Metrics snapshot (authenticated): `GET /v1/system/metrics`.

### Structured request logs
- API emits JSON log lines for every request with:
  - `event=http.request`
  - `requestId`, `method`, `path`, `statusCode`, `durationMs`
  - `remoteAddress`, `userAgent`
- Forward container logs to your preferred sink (journald, Loki, Elasticsearch, CloudWatch, etc.).

### Minimum alert policy
- Availability:
  - Alert when `/healthz` fails for 2 consecutive probe windows.
  - Alert when `/readyz` is `503` for more than 5 minutes.
- Error rate:
  - Alert when `5xx` ratio exceeds 2% over a rolling 10-minute window.
- Latency:
  - Alert when p95 API latency exceeds 1200ms over 15 minutes.
- Capacity:
  - Alert when backup directory free disk drops below 15%.

## 5. Operational Verification Checklist

- [ ] `docker compose ... ps` shows healthy `api` and `web`.
- [ ] Login works with expected user account(s).
- [ ] `/healthz` returns `200` and `/readyz` returns expected state.
- [ ] `/v1/system/storage` responds and reports expected backend.
- [ ] `/v1/system/metrics` is reachable for operator diagnostics.
- [ ] Backup artifact for current release exists and has checksums.
- [ ] Restore drill executed in non-production within the last 30 days.
- [ ] `.env.selfhost` permissions are restricted and secrets rotated per policy.
