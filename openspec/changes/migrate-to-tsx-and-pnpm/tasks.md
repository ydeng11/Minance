## 1. Baseline And Scope Controls

- [ ] 1.1 Capture a current inventory of `.js/.jsx/.mjs/.cjs` files and npm/npx command usage in managed scopes.
- [ ] 1.2 Define and commit the managed-scope list plus explicit exception allowlist paths for generated/vendor outputs.
- [ ] 1.3 Create/align bd tracking issues for each migration wave and link discovered blockers with `discovered-from` dependencies.

## 2. Establish pnpm As Canonical Workspace Manager

- [ ] 2.1 Add or update workspace package-manager metadata (`packageManager`, `pnpm-workspace.yaml`) and generate `pnpm-lock.yaml`.
- [ ] 2.2 Convert root/package scripts from npm semantics to pnpm semantics and verify script parity.
- [ ] 2.3 Update CI workflows to use pnpm install/cache strategy instead of npm.
- [ ] 2.4 Remove `package-lock.json` from canonical workflow and add validation to fail if it is reintroduced.

## 3. Execute Source Migration Waves

- [x] 3.1 Wave A: Migrate `apps/web` JavaScript-family files to `.tsx`/`.ts` and update imports/references.
- [x] 3.2 Run Wave A quality gates (typecheck, lint, tests/build as applicable) and fix regressions.
- [x] 3.3 Wave B: Migrate `packages/domain` and `services/api` JavaScript-family files to `.ts`/`.tsx` where applicable.
- [x] 3.4 Run Wave B quality gates and resolve runtime/type issues.
- [x] 3.5 Wave C: Migrate `e2e` and `scripts` JavaScript-family files to `.ts` (or `.tsx` for UI-rendering utilities).
- [x] 3.6 Run Wave C quality gates and verify end-to-end command execution under pnpm.

## 4. Enforce Regression Guardrails

- [ ] 4.1 Implement CI/local check to fail on unmanaged new `.js/.jsx/.mjs/.cjs` files in managed scopes.
- [ ] 4.2 Implement CI/local check to fail on active npm/npx usage in maintained workflows and docs.
- [ ] 4.3 Integrate guardrail checks into required CI jobs and contributor verification workflow.

## 5. Documentation, Rollout, And Completion

- [ ] 5.1 Update README, TESTING, and migration docs to make pnpm and extension standards authoritative.
- [ ] 5.2 Publish migration runbook notes for contributors (wave order, exception process, rollback guidance).
- [ ] 5.3 Run final full-repo quality gates and verify zero unmanaged JavaScript files plus zero authoritative npm workflows.
- [ ] 5.4 Close migration bd issues, resolve follow-ups, and mark OpenSpec change ready for implementation.
