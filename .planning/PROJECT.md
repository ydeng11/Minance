# Minance

## What This Is

A personal finance tracking application for managing transactions, accounts, categories, imports, and recurring rules. Built for personal use with open source availability, it now ships a release-ready web experience focused on clarity, safe interactions, and trustworthy feedback.

## Core Value

A polished, reliable personal finance tracker you can trust with your financial data — clean interactions, clear feedback, and intuitive layouts.

## Current State

- v1.0 UX Polish shipped on 2026-04-08.
- The milestone delivered 4 phases, 13 plans, and 22/22 archived v1 requirements.
- Archived milestone artifacts live under `.planning/milestones/v1.0-*`.
- No remaining debt: all phase Nyquist artifacts are complete.

## Requirements

### Validated

- ✓ Transaction management (create, edit, delete) — existing
- ✓ Account tracking with balance management — existing
- ✓ Category system for transaction organization — existing
- ✓ CSV import with account matching — existing
- ✓ Explorer page for browsing transactions — existing
- ✓ Transactions page with filtering — existing
- ✓ Authentication and user sessions — existing
- ✓ Filter UX improvements on Explorer page — Validated in Phase 01: filter-ux-foundation
- ✓ Filter UX improvements on Transactions page — Validated in Phase 01: filter-ux-foundation
- ✓ Visual/layout polish across application — Validated in v1.0 UX Polish
- ✓ Interaction pattern refinements — Validated in v1.0 UX Polish
- ✓ User feedback and recovery improvements — Validated in v1.0 UX Polish

### Active

- [ ] Smart search and saved filter views for power users
- [ ] Bulk action support and broader keyboard shortcuts
- [ ] Progressive disclosure for advanced filtering and power-user workflows

### Out of Scope

- Mobile app — Web-first, responsive design sufficient
- Multi-user collaboration — Single-user personal finance app
- Real-time sync — Not needed for personal use
- Payment integrations — Tracking only, no transaction execution

## Context

**Technical foundation:** Next.js 16, React 19, TypeScript 5, Tailwind CSS 4, Prisma ORM, PostgreSQL, Playwright, and the Node test runner. The codebase now has established patterns for filters, tables, optimistic interactions, and workflow-specific feedback.

**Current state:** v1.0 shipped with shared filter UX patterns, clearer transaction tables, toast-driven interaction feedback, optimistic deletes with Undo, a global command palette, and stronger import/recurring recovery guidance.

**Known issues / tech debt:**
- None. All v1.0 milestone phases have complete Nyquist artifacts.

## Constraints

- **Tech stack:** Next.js + Prisma + PostgreSQL (existing, not changing)
- **Design system:** Tailwind + established component primitives (preserve the shipped interaction patterns)
- **Timeline:** No hard deadline, polish incrementally
- **Scope:** v1.0 shipped as a UX/quality milestone; future scope should be defined via the next milestone process

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Open source release | Share code publicly, primarily for personal use | — Pending |
| Start with filters | Immediate pain point, sets pattern for other UX work | ✓ Good |
| Full polish goal | Comprehensive quality, not quick fixes | ✓ Good |
| Use toast feedback for routine success | Keep confirmations visible without stealing layout space | ✓ Good |
| Keep blocking errors inline with recovery copy | Users should see problems near the workflow they need to fix | ✓ Good |

## Next Milestone Goals

- Decide whether v1.1 focuses on power-user filtering, faster bulk workflows, or broader keyboard acceleration.
- Promote deferred ideas from the archived v1.0 requirements into a fresh milestone requirements set.
- Start the next milestone with `$gsd-new-milestone`.

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-08 after v1.0 milestone completion*
