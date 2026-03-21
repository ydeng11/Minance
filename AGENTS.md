# AGENTS Instructions

## Frontend Implementation Rule
- Use only Tailwind CSS for styling.
- Use only `.tsx` files for frontend components/pages.
- Do not introduce plain CSS, SCSS, styled-components, or non-TSX frontend files.

## Essential Commands
- Run `just` to list available recipes.
- Run `just dev` to start the web app on `:3000` and API on `:3001`.
- Run `just build-web` before shipping frontend changes.
- Run `just test` to run the full automated test suite.
- Run `just check` before handoff when code changes.

## Folder Structure
- `apps/web` - Next.js frontend app. Keep UI, routes, hooks, and client-side helpers here.
- `services/api` - API server, SQLite schema/data, and backend tests. Keep server-only code here.
- `packages/domain` - Shared domain logic and cross-app types. Prefer this for reusable business rules.
- `scripts` - Repo automation, seed, migration, and guardrail scripts.
- `e2e` - Playwright end-to-end specs and fixtures.
- `docs` - Plans, runbooks, and project documentation.

## Tech Stack
- Package manager: `pnpm@10.17.1`
- Frontend: `Next.js 16.1.6`, `React 19.2.3`, `TypeScript 5`, `Tailwind CSS 4`
- Backend runtime: Node.js ESM with `tsx 4.21.0`
- Testing: `Playwright 1.56.1`, Node test runner, `tsx --test`

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **Capture remaining follow-up work** - Include open questions, next steps, and any blockers in your handoff
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   git push
   git status  # MUST show "up to date with origin"
   ```
4. **Clean up** - Clear stashes, prune remote branches
5. **Verify** - All changes committed AND pushed
6. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
