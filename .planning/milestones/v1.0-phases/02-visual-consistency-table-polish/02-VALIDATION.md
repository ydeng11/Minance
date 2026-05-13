---
phase: 02
slug: visual-consistency-table-polish
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-03
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in test runner |
| **Config file** | none — inline in package.json |
| **Quick run command** | `pnpm test` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test` (if JS logic changes)
- **After every plan wave:** Visual review in browser
- **Before `/gsd:verify-work`:** Full visual QA pass
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | FILT-05 | unit | `pnpm test` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | FILT-05 | unit | `pnpm test` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 1 | VISL-01 | visual | Manual | N/A | ⬜ pending |
| 02-02-02 | 02 | 1 | VISL-02 | visual | Manual | N/A | ⬜ pending |
| 02-02-03 | 02 | 1 | VISL-03 | visual | Manual | N/A | ⬜ pending |
| 02-02-04 | 02 | 1 | VISL-05 | visual | Manual | N/A | ⬜ pending |
| 02-03-01 | 03 | 2 | FILT-06 | unit | `pnpm test` | ✅ existing | ⬜ pending |
| 02-03-02 | 03 | 2 | FILT-07 | unit | `pnpm test` | ✅ existing | ⬜ pending |
| 02-04-01 | 04 | 2 | VISL-04 | visual | Manual | N/A | ⬜ pending |
| 02-04-02 | 04 | 2 | UFBK-03 | visual | Manual | N/A | ⬜ pending |
| 02-04-03 | 04 | 2 | UFBK-04 | visual | Manual | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/web/src/lib/constants.test.ts` — test RANGE_OPTIONS structure (FILT-05)

*Note: Most VISL requirements are CSS-only — manual visual verification required.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Amount color semantics | VISL-01 | CSS styling | Open Transactions page, verify expenses are rose-400 |
| Skeleton loading state | VISL-02 | CSS animation | Add network delay, verify skeleton rows appear |
| Empty state messaging | VISL-03 | UI text/structure | Apply filters with no matches, verify guidance text |
| Spacing consistency | VISL-04 | CSS audit | Compare Explorer, Transactions, Categories pages |
| Sticky table headers | VISL-05 | CSS positioning | Scroll Transactions table, verify headers stay visible |
| Button loading spinner | UFBK-03 | CSS animation | Click Apply, verify spinner appears on button |
| Disabled button states | UFBK-04 | CSS styling | Verify disabled buttons have reduced opacity |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending