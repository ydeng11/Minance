# TSX + pnpm Migration Baseline (2026-03-04)

This file records the baseline and enforcement inputs for OpenSpec change `migrate-to-tsx-and-pnpm`.

## Managed Scopes

Defined in `scripts/run-guardrails.ts`:

- `apps/web/`
- `services/api/`
- `e2e/`
- `scripts/`
- `packages/domain/`

## Explicit Excluded Segments

Defined in `scripts/run-guardrails.ts`:

- `/.next/`
- `/dist/`
- `/coverage/`
- `/playwright-report/`
- `/node_modules/`
- `/output/`

## JavaScript Allowlist

Source: `config/guardrails/js-extension-allowlist.txt`

- `services/api/test/fixtures/deterministic-financial-fixture.js`

## Baseline Inventory Snapshot

Captured on 2026-03-04 with repository-local guardrail scope commands:

1. JS-family files in managed scopes (`apps/web`, `services/api`, `e2e`, `scripts`, `packages/domain`): `0`
2. Active `npm`/`npx` usage in maintained docs/automation paths (`README.md`, `TESTING.md`, `docs/`, `.github/workflows/`, `deploy/docker/`, `src/main/webui/README.md`): `0`
3. Tracked `package-lock.json` files: `0`

## Verification Commands

```bash
rg --files apps/web services/api e2e scripts packages/domain | rg '\\.(js|jsx|mjs|cjs)$'
rg -n "\\b(?:npm|npx)\\b" README.md TESTING.md docs .github/workflows deploy/docker src/main/webui/README.md
git ls-files | rg '(^|/)package-lock\\.json$'
```
