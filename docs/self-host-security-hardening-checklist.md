# Self-Host Security Hardening Checklist

Use this checklist before exposing Minance Next outside a trusted local network.

## 1. Auth and Session Controls

- [ ] Set a strong `AI_CREDENTIAL_SECRET` (32+ random bytes).
- [ ] Disable dev seed account in production (`MINANCE_SEED_TEST_ACCOUNT=false`).
- [ ] Enforce strong user passwords through deployment policy.
- [ ] Restrict API port (`MINANCE_API_PORT`) to trusted network/admin access only.
- [ ] Rotate provider API keys every 90 days and after incidents.

## 2. CORS and Browser Boundary Controls

- [ ] Set `MINANCE_ALLOWED_ORIGINS` to explicit trusted web origins only.
- [ ] Keep wildcard origins (`*`) disabled unless required for isolated internal environments.
- [ ] Keep `MINANCE_CORS_ALLOW_CREDENTIALS=false` unless cookie credentials are explicitly needed.
- [ ] Confirm disallowed origins receive HTTP `403` from API preflight/request flow.

## 3. Rate Limiting Baseline

- [ ] Keep default request limiter enabled (`MINANCE_RATE_LIMIT_MAX_REQUESTS`, `MINANCE_RATE_LIMIT_WINDOW_MS`).
- [ ] Keep stricter auth limiter enabled (`MINANCE_AUTH_RATE_LIMIT_MAX_REQUESTS`) for `/v1/auth/*`.
- [ ] Monitor repeated `429` responses for potential abuse or brute-force attempts.

## 4. Runtime Security Headers

- [ ] Verify responses include:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: no-referrer`
  - `Permissions-Policy` lock-down defaults
  - `Cross-Origin-Opener-Policy: same-origin`
- [ ] Verify `Strict-Transport-Security` is present when serving via HTTPS or TLS-terminating proxy.

## 5. Dependency and Patch Hygiene

- [ ] Apply OS/package/runtime security updates monthly (or faster for critical CVEs).
- [ ] Run dependency audits (`npm audit`, container image scans, base image updates).
- [ ] Pin deployment to reviewed git tag/commit and keep rollback artifact available.

## 6. Network and Host Hardening

- [ ] Terminate TLS at ingress/reverse proxy and force HTTPS.
- [ ] Block direct internet access to internal data volume paths and backup artifacts.
- [ ] Restrict host filesystem permissions for `.env.selfhost`, SQLite, uploads, and backups.
- [ ] Keep backup encryption enabled at rest and in transit to off-host storage.
