PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  password_hash TEXT,
  password_salt TEXT,
  created_at TEXT,
  updated_at TEXT,
  payload_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  access_expires_at TEXT,
  refresh_expires_at TEXT,
  created_at TEXT,
  updated_at TEXT,
  payload_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  normalized_key TEXT,
  display_name TEXT,
  source_institution TEXT,
  account_type TEXT,
  created_at TEXT,
  updated_at TEXT,
  payload_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  account_id TEXT,
  account_key TEXT,
  source_type TEXT,
  source_file_id TEXT,
  transaction_date TEXT,
  post_date TEXT,
  merchant_raw TEXT,
  merchant_normalized TEXT,
  description TEXT,
  amount REAL,
  currency TEXT,
  direction TEXT,
  category_raw TEXT,
  category_final TEXT,
  category_coarse TEXT,
  category_emoji TEXT,
  category_confidence REAL,
  category_strategy TEXT,
  needs_category_review INTEGER NOT NULL DEFAULT 0,
  memo TEXT,
  dedupe_fingerprint TEXT,
  created_at TEXT,
  updated_at TEXT,
  payload_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  is_system INTEGER,
  created_at TEXT,
  updated_at TEXT,
  payload_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS category_strategies (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  source_url TEXT,
  version TEXT,
  coarse_categories_json TEXT,
  granular_categories_json TEXT,
  created_at TEXT,
  updated_at TEXT,
  payload_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS category_rules (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT,
  pattern TEXT,
  category TEXT,
  priority INTEGER,
  created_at TEXT,
  updated_at TEXT,
  generated_from_corrections INTEGER,
  payload_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS imports (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  file_name TEXT,
  status TEXT,
  created_at TEXT,
  updated_at TEXT,
  row_count INTEGER,
  delimiter TEXT,
  has_header INTEGER,
  headers_json TEXT,
  mapping_json TEXT,
  mapping_confidence REAL,
  mapping_average_confidence REAL,
  warnings_json TEXT,
  ai_suggested INTEGER,
  direction_inference_json TEXT,
  commit_summary_json TEXT,
  payload_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS import_rows_raw (
  id TEXT PRIMARY KEY,
  import_id TEXT NOT NULL,
  row_index INTEGER NOT NULL,
  row_json TEXT,
  created_at TEXT,
  payload_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS import_rows_processed (
  row_id TEXT PRIMARY KEY,
  import_id TEXT NOT NULL,
  row_index INTEGER NOT NULL,
  include INTEGER,
  status TEXT,
  issues_json TEXT,
  source_json TEXT,
  normalized_json TEXT,
  overrides_json TEXT,
  edited_at TEXT,
  updated_at TEXT,
  payload_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS import_row_diagnostics (
  id TEXT PRIMARY KEY,
  import_id TEXT NOT NULL,
  row_index INTEGER,
  type TEXT,
  message TEXT,
  created_at TEXT,
  payload_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_provider_credentials (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  label TEXT,
  encrypted_json TEXT,
  masked_key TEXT,
  status TEXT,
  created_at TEXT,
  updated_at TEXT,
  last_validated_at TEXT,
  payload_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_provider_preferences (
  user_id TEXT PRIMARY KEY,
  default_provider TEXT,
  default_model TEXT,
  failover_providers_json TEXT,
  feature_overrides_json TEXT,
  updated_at TEXT,
  payload_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS assistant_queries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  question TEXT,
  plan_json TEXT,
  result_json TEXT,
  created_at TEXT,
  payload_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS saved_views (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT,
  filters_json TEXT,
  layout_json TEXT,
  created_at TEXT,
  updated_at TEXT,
  payload_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS migration_runs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  status TEXT,
  sqlite_path TEXT,
  created_at TEXT,
  updated_at TEXT,
  report_json TEXT,
  payload_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  action TEXT,
  details_json TEXT,
  created_at TEXT,
  payload_json TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique
  ON users(email);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id
  ON sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_accounts_user_id
  ON accounts(user_id);

CREATE INDEX IF NOT EXISTS idx_transactions_user_date
  ON transactions(user_id, transaction_date);

CREATE INDEX IF NOT EXISTS idx_transactions_user_category_date
  ON transactions(user_id, category_final, transaction_date);

CREATE INDEX IF NOT EXISTS idx_transactions_user_merchant_date
  ON transactions(user_id, merchant_normalized, transaction_date);

CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_user_fingerprint_unique
  ON transactions(user_id, dedupe_fingerprint)
  WHERE dedupe_fingerprint IS NOT NULL AND dedupe_fingerprint <> '';

CREATE INDEX IF NOT EXISTS idx_categories_user_id
  ON categories(user_id);

CREATE INDEX IF NOT EXISTS idx_category_rules_user_id
  ON category_rules(user_id);

CREATE INDEX IF NOT EXISTS idx_imports_user_id
  ON imports(user_id);

CREATE INDEX IF NOT EXISTS idx_import_rows_raw_import_id
  ON import_rows_raw(import_id);

CREATE INDEX IF NOT EXISTS idx_import_rows_processed_import_id
  ON import_rows_processed(import_id);

CREATE INDEX IF NOT EXISTS idx_import_row_diagnostics_import_id
  ON import_row_diagnostics(import_id);

CREATE INDEX IF NOT EXISTS idx_ai_provider_credentials_user_id
  ON ai_provider_credentials(user_id);

CREATE INDEX IF NOT EXISTS idx_assistant_queries_user_id
  ON assistant_queries(user_id);

CREATE INDEX IF NOT EXISTS idx_saved_views_user_id
  ON saved_views(user_id);

CREATE INDEX IF NOT EXISTS idx_audit_events_user_created_at
  ON audit_events(user_id, created_at);
