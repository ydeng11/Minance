# External Integrations

**Analysis Date:** 2026-03-31

## APIs & External Services

**AI/LLM Providers:**
- OpenAI - Transaction categorization, assistant synthesis
  - SDK/Client: Direct fetch API calls to `https://api.openai.com/v1/chat/completions`
  - Auth: User-provided API key (stored encrypted with AES-256-GCM)
  - Models: gpt-4.1-mini, gpt-4.1, gpt-4o-mini

- OpenRouter - Multi-provider LLM routing
  - SDK/Client: Direct fetch API calls to `https://openrouter.ai/api/v1/chat/completions`
  - Auth: User-provided API key (`sk-or-v1-*` prefix)
  - Models: chatgpt-4.1-mini, gpt-4.1-mini, gpt-4.1, gpt-4o-mini
  - Headers: `HTTP-Referer`, `X-Title` for app identification

- Anthropic - Claude models for categorization
  - Auth: User-provided API key (`sk-ant-*` prefix)
  - Models: claude-3-5-haiku-latest, claude-3-7-sonnet-latest

- Google AI - Gemini models
  - Auth: User-provided API key (20+ character length)
  - Models: gemini-2.0-flash, gemini-2.5-pro

**AI Agent Framework:**
- CrewAI - Python-based agent analysis
  - Location: `services/agents/crewai_analysis_agent.py`
  - Requirement: `crewai>=0.152.0`
  - Invoked via `spawn` from Node.js API

## Data Storage

**Databases:**
- SQLite - Primary storage backend
  - Connection: File-based (`minance.sqlite`)
  - Client: `sqlite3` CLI via `spawnSync` (see `services/api/src/sqlite-foundation.ts`)
  - Schema: `services/api/sql/schema.sql`

- JSON File Storage - Legacy/alternative backend
  - File: `store.json`
  - Used when `MINANCE_STORE_BACKEND=json`

**File Storage:**
- Local filesystem only
  - Uploads stored in `services/api/data/uploads/`
  - Backups in `backups/` directory

**Caching:**
- In-memory cache with file modification time checking
  - Implementation: `services/api/src/store.ts`
  - Cache invalidated on file mtime change

## Authentication & Identity

**Auth Provider:**
- Custom JWT-based authentication
  - Implementation: `services/api/src/auth.ts`
  - Access tokens: 1 hour TTL
  - Refresh tokens: 14 days TTL
  - Password hashing: Custom with salt
  - Sessions stored in database

## Monitoring & Observability

**Error Tracking:**
- None detected (console logging only)

**Logs:**
- Console output for development
- Audit events stored in database (`audit_events` table)

**Health Checks:**
- `/readyz` endpoint for container health
- Docker healthcheck in `docker-compose.selfhost.yml`

## CI/CD & Deployment

**Hosting:**
- Docker containers via `docker-compose.selfhost.yml`
- Image: `ydeng11/minance:nightly`
- Port: 3000 (web), 3001 (internal API)

**CI Pipeline:**
- GitHub Actions (`/.github/workflows/ci.yml`)
  - Runner: ubuntu-latest
  - Steps: pnpm install, test, playwright install, E2E tests
  - Artifacts uploaded on failure

**Build:**
- Multi-stage Docker build (`deploy/docker/Dockerfile.combined`)
- Node.js 20-bookworm-slim base image

## Environment Configuration

**Required env vars:**
- `AI_CREDENTIAL_SECRET` - Encryption key for AI provider credentials
- `MINANCE_STORE_BACKEND` - Storage backend (`sqlite` or `json`)
- `MINANCE_SQLITE_FILE` - SQLite database path
- `MINANCE_SQLITE_SCHEMA_FILE` - Schema SQL file path
- `MINANCE_ALLOWED_ORIGINS` - CORS allowed origins
- `MINANCE_RATE_LIMIT_WINDOW_MS` - Rate limiting window
- `MINANCE_RATE_LIMIT_MAX_REQUESTS` - Rate limit threshold

**Optional env vars:**
- `OPENROUTER_API_KEY` - Pre-seeded OpenRouter credential
- `DEV_TEST_ACCOUNT_EMAIL` / `DEV_TEST_ACCOUNT_PASSWORD` - Dev account seeding
- `AI_LLM_CATEGORIZATION_ENABLED` - Enable AI categorization
- `AI_LLM_ASSISTANT_SYNTHESIS_ENABLED` - Enable assistant
- `AI_CREW_ANALYSIS_ENABLED` - Enable CrewAI agents

**Secrets location:**
- Environment variables (not stored in codebase)
- `.env.selfhost.example` template provided (no secrets)

## Webhooks & Callbacks

**Incoming:**
- None detected

**Outgoing:**
- None detected (LLM calls are synchronous fetch requests)

---

*Integration audit: 2026-03-31*