## Why

The repository currently mixes JavaScript/MJS and TypeScript, and uses npm as the primary package manager. This conflicts with the project direction to standardize on TSX/TypeScript source and pnpm workflows, and creates avoidable drift across local development, CI, and documentation.

## What Changes

- Establish and document the target source standard:
  - UI source (pages/components/layouts) in `apps/web` SHALL use `.tsx`.
  - Non-UI TypeScript modules SHALL use `.ts`.
  - Hand-written `.js/.jsx/.mjs/.cjs` in the managed source scopes SHALL be migrated or removed, with explicit exceptions for generated/vendor output.
- Define phased migration waves for existing JavaScript/MJS files across:
  - `apps/web`, `services/api`, `e2e`, `scripts`, and `packages/domain`.
- Standardize workspace package management on pnpm:
  - Add pnpm workspace/lockfile as source of truth.
  - Replace npm usage in scripts, CI workflows, docs, and contributor instructions.
  - Remove `package-lock.json` from the canonical workflow.
- Add migration guardrails and acceptance checks so new JavaScript/npm drift is blocked.

## Capabilities

### New Capabilities
- `tsx-typescript-source-standard`: Defines enforceable source file-extension and language standards for managed project scopes.
- `pnpm-workspace-standard`: Defines pnpm as the canonical package manager and lockfile authority for local, CI, and docs workflows.
- `migration-governance-and-rollout`: Defines phased rollout, compatibility expectations, validation gates, and completion criteria for migration.

### Modified Capabilities
- _None._ (No existing OpenSpec capabilities are present yet.)

## Impact

- Affected code and config:
  - Root `package.json`, lockfile strategy, workspace package-manager metadata.
  - `apps/web`, `services/api`, `e2e`, `scripts`, `packages/domain` source and test files.
  - `.github/workflows/*.yml`, onboarding docs (`README.md`, `TESTING.md`, selected `docs/*`).
- Tooling and runtime impact:
  - Build/test execution commands migrate from npm to pnpm.
  - CI cache/install strategy changes to pnpm.
  - TypeScript execution/compilation boundaries become explicit for Node services/scripts/tests.
