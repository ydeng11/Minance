# JSON-to-SQLite Migration and Rollback Runbook

This runbook defines a deterministic, idempotent migration path from the current JSON store (`services/api/data/store.json`) to SQLite for self-hosted deployments.

## Objective

- Move persistence from JSON arrays to SQLite tables without data loss.
- Keep migration repeatable and safe to re-run.
- Provide explicit pre-checks, validation gates, and rollback procedures.

## Current Baseline

- Active store: `services/api/data/store.json` (or `MINANCE_DATA_FILE` override).
- Active write paths: auth, imports, transactions, categories/rules, AI settings, assistant queries, saved views, migration runs, audit events.
- Legacy Minance SQLite import endpoint already exists (`/v1/migrations/minance/sqlite`) and is separate from this JSON-to-SQLite cutover.

## Target SQLite Schema (Canonical Tables)

Use one table per top-level JSON collection (from `services/api/src/store.js`):

- `users`
- `sessions`
- `accounts`
- `transactions`
- `categories`
- `category_strategies`
- `category_rules`
- `imports`
- `import_rows_raw`
- `import_rows_processed`
- `import_row_diagnostics`
- `ai_provider_credentials`
- `ai_provider_preferences`
- `assistant_queries`
- `saved_views`
- `migration_runs`
- `audit_events`

Recommended constraints/indexes:

- Primary key on `id` for all entities that have IDs.
- Unique `users(email)`.
- Unique `transactions(user_id, dedupe_fingerprint)` when fingerprint is not null.
- Index `transactions(user_id, transaction_date)`.
- Index `transactions(user_id, category_final, transaction_date)`.
- Index `transactions(user_id, merchant_normalized, transaction_date)`.
- Indexes on foreign-key/filter paths used in APIs (`imports(user_id)`, `sessions(user_id)`, etc.).

## Deterministic Migration Strategy

### 1) Preparation

1. Enable a maintenance window (read-only at minimum; full write stop preferred).
2. Resolve source JSON path:
   - default: `services/api/data/store.json`
   - override: `MINANCE_DATA_FILE`
3. Create immutable backup and checksum.

Example:

```bash
SOURCE_JSON="${MINANCE_DATA_FILE:-services/api/data/store.json}"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="services/api/data/backups"
mkdir -p "$BACKUP_DIR"
cp "$SOURCE_JSON" "$BACKUP_DIR/store-$STAMP.json"
shasum -a 256 "$SOURCE_JSON" > "$BACKUP_DIR/store-$STAMP.sha256"
```

### 2) Build/Apply SQLite Schema

1. Create `minance.sqlite` in data directory.
2. Apply schema DDL and indexes in a single migration transaction where possible.
3. Record schema version in a migration metadata table (for example `schema_migrations`).

### 3) Backfill Data in Stable Order

Insert in dependency order:

1. `users`
2. `sessions`
3. `accounts`, `categories`, `category_strategies`, `category_rules`
4. `imports`, `import_rows_raw`, `import_rows_processed`, `import_row_diagnostics`
5. `transactions`
6. `ai_provider_credentials`, `ai_provider_preferences`
7. `assistant_queries`, `saved_views`
8. `migration_runs`, `audit_events`

Use idempotent writes:

- `INSERT ... ON CONFLICT(id) DO UPDATE ...` for ID-backed rows.
- For rows with logical uniqueness (for example `transactions(user_id, dedupe_fingerprint)`), use `ON CONFLICT DO NOTHING` plus conflict counters.
- Preserve timestamps exactly (`createdAt`, `updatedAt`, `created_at`, `updated_at`) without recomputing.

### 4) Validation Gates (Must Pass Before Cutover)

Run all checks:

1. Row-count parity by collection/table.
2. High-value aggregate parity:
   - transaction totals by `user_id` + `direction`
   - min/max transaction date bounds per user
   - category counts per user
3. Uniqueness/constraint checks:
   - duplicate emails
   - duplicate transaction dedupe fingerprints per user
4. Sampling parity:
   - deterministic sample of IDs and field-by-field comparison.
5. Application smoke checks against SQLite backend:
   - login/refresh
   - list/create/update/delete transaction
   - import list/details
   - analytics overview
   - categories list/update strategy

If any check fails, do not cut over.

### 5) Cutover

1. Set storage backend to SQLite (recommended env switch: `MINANCE_STORE_BACKEND=sqlite`).
2. Point API to SQLite file path (recommended env: `MINANCE_SQLITE_FILE=services/api/data/minance.sqlite`).
3. Restart API service.
4. Run post-cutover smoke checks and verify no write errors.

### 6) Rollback Procedure

Rollback triggers:

- Validation gate failure before cutover.
- Runtime errors or data mismatches after cutover.
- Latency/availability regression outside agreed threshold.

Rollback steps:

1. Stop writes (maintenance mode).
2. Switch backend env to JSON:
   - `MINANCE_STORE_BACKEND=json`
3. Restore backup JSON if needed:

```bash
cp "services/api/data/backups/store-$STAMP.json" "$SOURCE_JSON"
```

4. Restart API and rerun smoke checks on JSON backend.
5. Record incident details in `audit_events` / ops log and create follow-up issue before retry.

Important: do not delete SQLite artifact on rollback; keep it for diff analysis.

## Operator Checklist

Pre-flight:

- [ ] Maintenance window approved.
- [ ] JSON backup + checksum created.
- [ ] SQLite schema migration script available and reviewed.
- [ ] Validation script available and reviewed.

Execution:

- [ ] Backfill completed with conflict counters captured.
- [ ] Validation gates passed.
- [ ] Backend switched to SQLite.
- [ ] Post-cutover smoke checks passed.

If failure:

- [ ] Rollback executed.
- [ ] Impact documented.
- [ ] Follow-up issue filed.

## Recommended Implementation Artifacts

Add these scripts before cutover:

- `scripts/migrate-json-to-sqlite.mjs`
  - Reads JSON, writes SQLite via idempotent upserts, prints migration summary.
- `scripts/validate-json-vs-sqlite.mjs`
  - Executes parity checks and exits non-zero on any mismatch.
- `services/api/sql/schema.sql`
  - Canonical SQLite DDL and indexes.

## Non-Goals for This Runbook

- Live dual-write operation.
- Zero-downtime migration without maintenance window.
- Cross-version schema evolution after SQLite cutover (handled by future schema migration docs).
