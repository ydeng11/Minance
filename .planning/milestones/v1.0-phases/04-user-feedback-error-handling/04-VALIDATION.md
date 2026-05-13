---
phase: 04
slug: user-feedback-error-handling
status: passed
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-07
---

# Phase 04 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node test runner via `tsx --test` + Playwright |
| **Config file** | `playwright.config.mjs` |
| **Quick run command** | `pnpm exec tsx --test apps/web/src/app/import/page.test.ts apps/web/src/app/recurrings/page.test.ts` |
| **Full suite command** | `just check` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm exec tsx --test apps/web/src/app/import/page.test.ts apps/web/src/app/recurrings/page.test.ts`
- **After every plan wave:** Run `pnpm exec playwright test e2e/specs/cross-tab-parity.spec.ts e2e/specs/import-existing-account-transactions.spec.ts`
- **Before `$gsd-verify-work`:** Full suite must be green via `just check`
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | UFBK-01 | unit | `pnpm exec tsx --test apps/web/src/app/import/page.test.ts` | ✅ existing | ✅ green |
| 04-01-02 | 01 | 1 | UFBK-01, UFBK-02 | unit smoke + wave e2e | `pnpm exec tsx --test apps/web/src/app/import/page.test.ts` | ✅ existing | ✅ green |
| 04-02-01 | 02 | 2 | UFBK-01 | unit | `pnpm exec tsx --test apps/web/src/app/recurrings/page.test.ts` | ✅ created | ✅ green |
| 04-02-02 | 02 | 2 | UFBK-01, UFBK-02 | unit smoke + wave e2e | `pnpm exec tsx --test apps/web/src/app/recurrings/page.test.ts` | ✅ created | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `apps/web/src/app/recurrings/page.test.ts` — add coverage for field validation and page-error state split for UFBK-01
- [x] `apps/web/src/app/import/page.test.ts` — extend beyond toolbar rendering to cover feedback-surface decisions or helper behavior
- [x] `e2e/specs/cross-tab-parity.spec.ts` — migrate Recurrings assertions from inline `global-message` success to toast success text
- [x] `e2e/specs/import-existing-account-transactions.spec.ts` — migrate Import success assertions from inline success banners to toast-visible outcomes where appropriate

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Import mixed-surface guidance still reads clearly after account assignment or reconciliation success | UFBK-01 | The phase intentionally allows toast success plus persistent inline next-step guidance, which benefits from a quick visual hierarchy check in-browser | Complete an Import account-assignment or reconciliation flow, confirm the success toast appears, and verify any remaining inline guidance still points to the next action without duplicating the toast copy |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** passed
