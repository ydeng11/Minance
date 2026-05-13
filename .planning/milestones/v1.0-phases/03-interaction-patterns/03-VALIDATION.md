---
phase: 03
slug: interaction-patterns
status: passed
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-04
---

# Phase 03 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node test runner via `tsx --test` + Playwright |
| **Config file** | `playwright.config.mjs` |
| **Quick run command** | `pnpm --filter @minance/web test` |
| **Full suite command** | `just check` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter @minance/web test`
- **After every plan wave:** Visual UAT in browser + toast verification
- **Before `$gsd-verify-work`:** Full suite must be green via `just check`
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | INTX-03 | unit + visual | Manual UAT | N/A | ✅ green |
| 03-01-02 | 01 | 1 | INTX-03 | unit + visual | Manual UAT | N/A | ✅ green |
| 03-02-01 | 02 | 1 | INTX-01 | unit + visual | Manual UAT | N/A | ✅ green |
| 03-02-02 | 02 | 1 | INTX-02 | unit + visual | Manual UAT | N/A | ✅ green |
| 03-03-01 | 03 | 2 | INTX-04 | unit + visual | Manual UAT | N/A | ✅ green |
| 03-03-02 | 03 | 2 | INTX-05 | unit + visual | Manual UAT | N/A | ✅ green |
| 03-04-01 | 04 | 2 | INTX-06 | unit + visual | Manual UAT | N/A | ✅ green |
| 03-04-02 | 04 | 2 | INTX-06 | unit + visual | Manual UAT | N/A | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] Toast system (Sonner) integrated into `AppProviders.tsx`
- [x] Command palette (cmdk) integrated into `Shell.tsx`
- [x] Transaction inline validation preserves user input on blur
- [x] Transaction editor fields show inline errors with actionable guidance
- [x] Single-row delete uses optimistic UI with Undo toast action
- [x] Bulk delete uses optimistic UI with Undo toast action
- [x] ⌘K / Ctrl+K opens command palette with route navigation

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Transaction save/update toast appears and dismisses correctly | INTX-03 | Toast timing and positioning is visual UX | Create or edit a transaction, verify success toast appears and auto-dismisses |
| Inline blur validation shows error near field | INTX-01 | Visual proximity to control is subjective | Enter invalid data in transaction form field, blur, verify inline error appears near that field |
| Form values preserved on validation failure | INTX-02 | State preservation requires browser context | Submit transaction with missing fields, verify entered values remain in form |
| Optimistic delete removes row immediately | INTX-04 | Timing perception requires human judgment | Delete a transaction row, verify it disappears before network delay perception |
| Undo toast restores deleted transaction | INTX-05 | Undo timing and restoration is interactive flow | Delete transaction, click Undo in toast, verify transaction reappears |
| Command palette opens and navigates | INTX-06 | Keyboard shortcut and visual overlay is interactive | Press ⌘K, type "Transactions", select, verify navigation and palette closes |

---

## Validation Sign-Off

- [x] All tasks have manual UAT verification documented in `03-UAT.md`
- [x] Sampling continuity: UAT covers all INTX requirements
- [x] Wave 0 covers Sonner, cmdk, inline validation, optimistic UI
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter
- [x] UAT complete: 6 passed, 0 issues (see `03-UAT.md`)
- [x] Verification complete: 6/6 spot-checks passed (see `03-VERIFICATION.md`)

**Approval:** passed