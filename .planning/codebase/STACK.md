# Technology Stack

**Analysis Date:** 2026-03-31

## Languages

**Primary:**
- TypeScript 5 - Used throughout the codebase for frontend (`apps/web/src/`) and backend (`services/api/src/`). Strict mode enabled in tsconfig.

**Secondary:**
- JavaScript - Used for configuration files (`playwright.config.mjs`, `postcss.config.mjs`)
- Python 3 - Used for AI agents (`services/agents/`)

## Runtime

**Environment:**
- Node.js 20 (production Docker) / Node.js 22 (CI)
- ESM modules throughout (`"type": "module"` in all package.json files)

**Package Manager:**
- pnpm 10.17.1
- Lockfile: `pnpm-lock.yaml` (present)
- Monorepo: pnpm workspace with 3 packages

## Frameworks

**Core:**
- Next.js 16.1.6 - Frontend React framework with Turbopack
- React 19.2.3 - UI library with React DOM
- Node.js http module - Custom API server without Express (see `services/api/src/server.ts`)

**Testing:**
- Playwright 1.56.1 - E2E testing with Chromium
- Node.js built-in test runner - Unit tests via `tsx --test`
- axe-core 4.11.0 - Accessibility testing

**Build/Dev:**
- Tailwind CSS 4 - Styling with PostCSS
- tsx 4.21.0 - TypeScript execution for scripts and tests
- ESLint 9 with eslint-config-next - Linting

## Key Dependencies

**Critical:**
- csv-parse 5.6.0 - CSV import parsing for financial transactions
- lucide-react 0.575.0 - Icon library
- clsx 2.1.1 + tailwind-merge 3.5.0 - CSS class utilities

**Infrastructure:**
- concurrently 9.2.1 - Running dev servers in parallel
- @ferrucc-io/emoji-picker 0.0.48 - Emoji selection for categories

**AI/LLM Integration:**
- OpenAI API - GPT models for categorization
- OpenRouter API - Multi-provider LLM routing
- Anthropic API - Claude models
- Google AI API - Gemini models
- CrewAI (Python) - Agent-based analysis

## Configuration

**Environment:**
- Environment variables loaded from `.env.test`, `.env.selfhost.example`
- Config resolution in `services/api/src/config.ts` and `services/api/src/runtime-env.ts`
- Key configs: `MINANCE_STORE_BACKEND`, `MINANCE_SQLITE_FILE`, `AI_CREDENTIAL_SECRET`

**Build:**
- `apps/web/next.config.ts` - Next.js configuration with API rewrites
- `apps/web/tsconfig.json` - TypeScript configuration
- `apps/web/postcss.config.mjs` - Tailwind CSS PostCSS plugin
- `apps/web/eslint.config.ts` - ESLint with Next.js core web vitals

## Platform Requirements

**Development:**
- Node.js 20+ or 22
- pnpm 10.17.1
- sqlite3 CLI (for SQLite backend)
- Python 3 (optional, for AI agents)

**Production:**
- Docker container (`ydeng11/minance:nightly`)
- SQLite database file
- Environment secrets for AI providers

