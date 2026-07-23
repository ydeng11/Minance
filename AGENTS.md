# Minance — Agent Guide

## Project Overview

Minance Next is a privacy-first personal finance web app. It helps users track spending, categorize
transactions (via rules, merchant memory, and optional AI fallback), import CSV/OFX/QFX, and view
dashboards and analytics. It is designed for self-host deployment with a single container image.

## Architecture

```
minance/
├── apps/web/           # Next.js 16 frontend (React 19, Tailwind CSS v4)
├── services/api/       # API server — Node.js + SQLite (plain tsx/Express-like)
├── services/agents/    # CrewAI-based analysis agent (Python)
├── packages/domain/    # Shared domain logic (TypeScript)
├── scripts/            # Build, seed, migration, and utility scripts
├── config/guardrails/  # Project guardrails (migration baseline, JS extension allowlist)
├── deploy/docker/      # Dockerfiles (combined, api, web) and entrypoint
├── docs/               # Design docs, runbooks, migration guides, API reference
├── e2e/specs/          # Playwright end-to-end tests
└── plans/              # Implementation plans
```

- **Backend store**: SQLite (primary); JSON file store is legacy/deprecated.
- **Runtime data**: Environment-prefixed SQLite files: `{env}-minance.sqlite`.
- **Auth**: Built-in signup/login/refresh flow with dev/test account seeding.
- **AI**: Bring-your-own-key for 4 providers (OpenAI, OpenRouter, Anthropic, Google).
  - Optional CrewAI analysis agent (`services/agents/crewai_analysis_agent.py`).
- **Ports**: Web on 3000, API on 3001 in development; E2E uses 4173/4174.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript 5 |
| Styling | Tailwind CSS v4 |
| Icons | lucide-react |
| UI primitives | cmdk, sonner (toast), @ferrucc-io/emoji-picker |
| Package manager | pnpm 10 (workspace monorepo) |
| API server | Node.js 20 + tsx (TypeScript execution) |
| Database | SQLite (via `sqlite3` CLI + tsx scripts) |
| Testing | Node `--test` runner, Playwright (E2E) |
| E2E a11y | axe-core, playwright test project `@a11y` |
| CI/QA | custom guardrails (`pnpm guardrails`), test-first checks |
| Container | Docker + OrbStack, multi-arch (amd64 + arm64) |
| Python agent | CrewAI (`services/agents/crewai_analysis_agent.py`) |

## Common `just` Commands

> `just` is the project task runner. Run `just` to list all recipes.

### Setup & Development
| Command | Purpose | Prerequisites |
|---|---|---|
| `just install` | Install workspace dependencies | — |
| `just dev` | Start both dev servers (web + API) | `just install` |
| `just dev-web` | Next.js dev server only (port 3000) | — |
| `just dev-api` | API server only (port 3001) | — |

### Building & Production
| Command | Purpose |
|---|---|
| `just build-web` | Build the Next.js app |
| `just start` | Start both production servers |
| `just start-web` | Next.js production server (port 3000) |
| `just start-api` | API production server (port 3001) |

### Testing & Quality
| Command | Purpose |
|---|---|
| `just test` | Run full test suite (guardrails → test-first → API tests → web tests) |
| `just check` | Run guardrails then tests |
| `just guardrails` | Run project guardrails (migration baseline checks, etc.) |
| `just e2e` | Run Playwright E2E tests (headless) |
| `just e2e-headed` | Run E2E tests headed (local debugging) |
| `just e2e-a11y` | Run accessibility-focused E2E tests (`@a11y` tag) |

### Docker
| Command | Purpose |
|---|---|
| `just docker-build` | Build nightly image for host arch |
| `just docker-nightly` | Build & push multi-arch nightly image |
| `just docker-release VERSION` | Build & push versioned release (e.g. `just docker-release 0.2.0`) |

### Documentation
| Command | Purpose |
|---|---|
| `just docs-api` | Generate API documentation (→ `docs/api/`) |

## Env Files

| File | Used By |
|---|---|
| `.env.development` | `just dev`, `just dev-api` |
| `.env.production` | `just start`, `just start-api` |
| `.env.test` | `just test`, `just check`, `just e2e` |
| `.env.selfhost.example` | Self-host Docker deployment |
| `.env.local` | Local overrides (gitignored) |

## Changelog Policy

All notable changes to application code or user-visible behavior **must** be documented in
[CHANGELOG.md](./CHANGELOG.md) under the `[Unreleased]` section.

- Add a new entry for every commit that changes application code, APIs, database schema, or
  user-visible behavior.
- Follow [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format and
  [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
- Use the standard section headings: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`,
  `Security`.
- Documentation-only changes (README, docs/, AGENTS.md, changelog itself), maintenance
  (dependency bumps, CI config, tooling), and non-application refactors are exempt.
- When releasing, rename `[Unreleased]` to the new version and date, then create a fresh
  `[Unreleased]` heading at the top.
