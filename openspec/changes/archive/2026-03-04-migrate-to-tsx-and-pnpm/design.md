## Context

The repository target state is to standardize frontend source on TSX/TypeScript and package management on pnpm. Current state is mixed JavaScript/TypeScript usage and npm-centric commands in CI/docs/scripts. This creates inconsistent developer workflows, repeated install cache misses in CI, and drift where new JavaScript or npm commands are reintroduced after cleanup.

This migration is cross-cutting and touches application source, service code, E2E/support scripts, CI workflows, and contributor documentation. It also intersects with existing project constraints from `AGENTS.md` (frontend implementation in `.tsx`, no non-TSX frontend files).

Stakeholders:
- Frontend and full-stack contributors who edit `apps/web`
- Platform/infra contributors maintaining CI workflows
- Service maintainers for `services/api` and supporting scripts

## Goals / Non-Goals

**Goals:**
- Define enforceable source standards: UI code in `.tsx`, non-UI TypeScript modules in `.ts`, and explicit exception rules for generated/vendor outputs.
- Define a phased migration path that converts existing managed JavaScript files without breaking delivery.
- Define pnpm as the canonical workspace package manager across local development, CI, and documentation.
- Add guardrails (CI/lint/check scripts) to prevent regression to npm and unmanaged JavaScript in covered scopes.

**Non-Goals:**
- Re-architecting application features or changing business behavior.
- Migrating generated artifacts or third-party vendored code.
- Replacing test frameworks/build tools unless required to support pnpm or TypeScript execution.
- Forcing `.tsx` for non-UI server/runtime modules where `.ts` is the correct TypeScript extension.

## Decisions

### 1. Managed scope will be explicit and enforced
Decision:
- Managed scopes: `apps/web`, `services/api`, `e2e`, `scripts`, `packages/domain`.
- Excluded scopes: generated build output and caches (`.next`, `dist`, `coverage`, `playwright-report`, `node_modules`), plus vendored third-party sources.

Rationale:
- Prevents accidental churn in generated artifacts.
- Makes CI checks deterministic and reviewable.

Alternatives considered:
- Repository-wide hard ban on `.js`: rejected because it would include generated/third-party files and cause non-actionable failures.

### 2. Source-language migration uses a staged wave model
Decision:
- Migrate by waves: frontend app first, then shared packages/services, then e2e/scripts.
- Each wave includes: file conversion, import/path updates, type-check/tests, and gate activation for that scope.

Rationale:
- Limits blast radius and makes regressions easy to isolate.
- Allows progressive tightening of CI checks.

Alternatives considered:
- Big-bang conversion in one PR: rejected due to high risk and review complexity.

### 3. pnpm becomes canonical before npm removal gates are strict
Decision:
- Introduce pnpm workspace metadata and lockfile as the source of truth first.
- Update CI and docs to pnpm commands.
- Then enforce no-npm guardrails (e.g., checks for `npm install`, `npx`, `package-lock.json`).

Rationale:
- Enables contributors and CI to converge on pnpm before introducing hard failures.
- Reduces disruption during rollout.

Alternatives considered:
- Immediate npm ban from day one: rejected because it can block contributors before migration docs/CI are aligned.

### 4. Guardrails will be automated in CI and local verification
Decision:
- Add repository checks that fail on:
  - New `.js/.jsx/.mjs/.cjs` in managed scopes (unless on an explicit allowlist).
  - `package-lock.json` presence and npm/npx command usage in maintained docs/workflows/scripts.
- Keep checks scriptable so local pre-merge verification matches CI.

Rationale:
- Prevents regression after each migration wave.
- Makes standards objective and enforceable.

Alternatives considered:
- Relying on code review conventions only: rejected due to inconsistency and reviewer burden.

## Risks / Trade-offs

- [Tooling incompatibility with pnpm workspaces] -> Mitigation: run compatibility audit for scripts and CI actions before enforcing npm bans; keep transitional aliases only during rollout window.
- [Large file-conversion PRs become hard to review] -> Mitigation: enforce wave-based PR sizing and close each wave with explicit validation gates.
- [Type errors surfaced by JS->TS migration delay work] -> Mitigation: sequence scopes from lowest coupling to highest and allow temporary narrow type suppressions with follow-up tasks.
- [Contributor confusion during transition] -> Mitigation: publish migration runbook and update README/TESTING/CI references in the first wave.
- [False positives from extension checks] -> Mitigation: maintain a documented allowlist for generated/vendor paths and review it as part of each wave.

## Migration Plan

1. Baseline and inventory
- Produce authoritative inventory of JavaScript/npm usage by scope.
- Confirm exception paths for generated/vendor output.

2. Package manager foundation (pnpm)
- Add/confirm `packageManager` metadata and pnpm lockfile/workspace setup.
- Update CI install/cache steps and all contributor commands/docs to pnpm.
- Validate that build/test/e2e pipelines run with pnpm end-to-end.

3. Source migration waves
- Wave A: `apps/web` UI and frontend-adjacent files to TSX/TS.
- Wave B: `packages/domain` and `services/api` JS/MJS to TypeScript.
- Wave C: `e2e` and `scripts` conversion, including runner updates.

4. Guardrails and hardening
- Enable CI checks for file extension policy and npm-command drift.
- Remove transitional exceptions that are no longer needed.

5. Completion and stabilization
- Run full quality gates (typecheck, lint, unit/integration/e2e as applicable).
- Mark migration complete once all managed-scope JS/npm drift checks pass continuously.

Rollback strategy:
- If a wave introduces instability, revert only that wave while keeping prior validated waves and pnpm foundation intact.
- Retain tagged pre-wave baseline commits for quick rollback in CI-critical failures.

## Open Questions

- Which `scripts/` entries are intentionally JavaScript due to external runtime constraints, and should remain on the exception allowlist?
- Are there CI runners or internal tools that currently assume npm cache layout and need explicit pnpm cache configuration?
- Should legacy npm instructions be removed immediately or kept as temporary compatibility notes for one release cycle?
