# Self-Host Operations Runbook

This runbook defines the baseline self-host profile for Minance Next, including deployment, backup/restore, and secret lifecycle policy.

## 1. Deployment Profile (Docker Compose + Env Template)

### Files
- Compose stack: `docker-compose.selfhost.yml`
- API image Dockerfile: `deploy/docker/Dockerfile.api`
- Web image Dockerfile: `deploy/docker/Dockerfile.web`
- Env template: `.env.selfhost.example`

### Quick start
1. Copy `.env.selfhost.example` to `.env.selfhost`.
2. Set `AI_CREDENTIAL_SECRET` in `.env.selfhost` to a strong random secret.
3. Build and launch:

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

### Upgrade-safe practices
1. Pin deployments to a git tag/commit before building.
2. Keep `.env.selfhost` out of git and source control.
3. Use named volume `minance_data` as persistent runtime data.
4. Run backup script before every deploy and migration.
5. After deploy, verify healthcheck status and login flow before traffic cutover.

## 2. Backup and Restore Strategy

### Backups
The backup script captures SQLite, JSON fallback store, and uploads archive with checksums.

```bash
scripts/selfhost-backup.sh
```

Optional stamp override:

```bash
scripts/selfhost-backup.sh --stamp 20260302T000000Z
```

Artifacts are written to `${MINANCE_BACKUP_ROOT:-./backups}/<stamp>/`:
- `minance.sqlite` (if present)
- `store.json` (if present)
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

## 4. Operational Verification Checklist

- [ ] `docker compose ... ps` shows healthy `api` and `web`.
- [ ] Login works with expected user account(s).
- [ ] `/v1/system/storage` responds and reports expected backend.
- [ ] Backup artifact for current release exists and has checksums.
- [ ] Restore drill executed in non-production within the last 30 days.
- [ ] `.env.selfhost` permissions are restricted and secrets rotated per policy.
