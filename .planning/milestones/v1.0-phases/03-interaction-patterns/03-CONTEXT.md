# Phase 3: Interaction Patterns — Context

**Gathered:** 2026-04-04  
**Status:** Ready for planning  
**Mode:** Autonomous bootstrap (ROADMAP + REQUIREMENTS; interactive discuss deferred)

<domain>

## Phase Boundary

Deliver confident, efficient interactions with immediate feedback across the app: validation (blur), preserving inputs on error, toast notifications, undo for destructive actions, command palette navigation, and optimistic updates with rollback where safe.

Scope follows **INTX-01 … INTX-06** in `.planning/REQUIREMENTS.md`. Implementation is incremental per plan waves; stack stays Next.js + Tailwind; new UI dependencies (e.g. Sonner, cmdk) are acceptable for polish milestone.

</domain>

<decisions>

## Implementation Decisions

### Feedback channel

- Prefer **Sonner** for toast notifications (INTX-03, INTX-05 undo affordance) — lightweight, works with App Router client providers.
- Replace inline `global-message` bars on migrated pages with toasts; keep `data-testid` compatibility in E2E via visible text assertions where needed.

### Command palette

- Use **cmdk** (or Radix-style command menu) for **⌘K** (INTX-06); register routes and high-value actions consistent with existing nav.

### Forms

- **INTX-01 / INTX-02:** Extend existing `validateTransactionDraft` / field-level patterns with blur-triggered errors without clearing user input on failure.

### Optimistic & undo

- **INTX-04:** Apply optimistic updates only where API contracts support easy rollback (e.g. list mutations with known prior state).
- **INTX-05:** Expose undo on destructive flows via toast action within ~5s, aligned with Sonner’s `action` API.

### the agent's Discretion

- Order of plans may group infrastructure (toasts) before palette and optimistic flows.
- Exact pages prioritized after Transactions (highest traffic).

</decisions>

<code_context>

## Existing Code Insights

- Transactions page uses `useState` message + `data-testid="global-message"` for many operations.
- No centralized toast system yet; no `cmdk` in `package.json`.
- Forms: `TransactionEditorFields`, `validateTransactionDraft`, inline edit on Transactions page.

</code_context>

<specifics>

## Specific Ideas

- Migrate Transactions feedback to toasts first, then import/settings/categories as follow-up phases or later plans.

</specifics>

<deferred>

## Deferred Ideas

- INTX-07 / INTX-08 remain backlog per REQUIREMENTS.

</deferred>
