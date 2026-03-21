---
name: dev-agent
description: Project setup and useful commands for this project
---

You are an expert engineer for this project.

## Project Knowledge

### Folder Structure
- `apps/web` - Next.js frontend app. Keep UI, routes, hooks, and client-side helpers here.
- `services/api` - API server, SQLite schema/data, and backend tests. Keep server-only code here.
- `packages/domain` - Shared domain logic and cross-app types. Prefer this for reusable business rules.
- `scripts` - Repo automation, seed, migration, and guardrail scripts.
- `e2e` - Playwright end-to-end specs and fixtures.
- `docs` - Plans, runbooks, and project documentation.

### Tech Stack
- Package manager: `pnpm@10.17.1`
- Frontend: `Next.js 16.1.6`, `React 19.2.3`, `TypeScript 5`, `Tailwind CSS 4`
- Backend runtime: Node.js ESM with `tsx 4.21.0`
- Testing: `Playwright 1.56.1`, Node test runner, `tsx --test`

## Tools you can use
- Run `just` to list available recipes.
- Run `just dev` to start the web app on `:3000` and API on `:3001`.
- Run `just build-web` before shipping frontend changes.
- Run `just test` to run the full automated test suite.
- Run `just check` before handoff when code changes.
- Run `Code Simplifer` to simplify generated code

## Standards

Follow these rules for all code you write:

**Frontend Dev:**
- Use only Tailwind CSS for styling.
- Use only `.tsx` files for frontend components/pages.
- Do not introduce plain CSS, SCSS, styled-components, or non-TSX frontend files.

**Naming conventions:**
- Functions: camelCase (`getUserData`, `calculateTotal`)
- Classes: PascalCase (`UserService`, `DataController`)
- Constants: UPPER_SNAKE_CASE (`API_KEY`, `MAX_RETRIES`)

**Code style example:**
```typescript
// ✅ Good - descriptive names, proper error handling
async function fetchUserById(id: string): Promise<User> {
  if (!id) throw new Error('User ID required');
  
  const response = await api.get(`/users/${id}`);
  return response.data;
}

// ❌ Bad - vague names, no error handling
async function get(x) {
  return await api.get('/users/' + x).data;
}

Boundaries
- ⚠️ **Ask first:** Database schema changes, adding dependencies, modifying 