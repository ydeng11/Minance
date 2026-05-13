# Phase 4: User Feedback & Error Handling - Context

**Gathered:** 2026-04-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Polish the remaining rough feedback surfaces so users always understand what happened and what to do next.

This phase is intentionally limited to **Import** and **Recurrings**. Transactions already covers most success-toast behavior from Phase 3, so Phase 4 finishes the remaining workflow pages by improving success confirmations, actionable recovery guidance, and validation clarity for **UFBK-01** and **UFBK-02**.

</domain>

<decisions>
## Implementation Decisions

### Feedback Delivery
- Use `sonner` toasts for success confirmations on Import and Recurrings, matching the Transactions pattern already established in Phase 3.
- Keep actionable errors anchored near the active workflow surface as inline alerts instead of turning all failures into transient toasts.
- Preserve a stable inline alert region for persistent guidance and testability, but stop using that region for routine success states.
- Add only a small shared helper for API fallback and recovery wording rather than building a broad notification framework in this phase.

### Error Language & Recovery Guidance
- Prefer action-specific fallback copy that says what failed and what the user can try next, instead of generic `Failed to...` strings.
- Reuse the existing `ApiError` remediation support, but present it through cleaner page-level messaging so it reads as guidance rather than raw API output.
- Add field-level guidance for obvious Recurrings form validation problems such as missing name or invalid amount, while reserving page-level alerts for larger action failures.
- Keep the tone calm, direct, and recovery-oriented: explain what happened, what is affected, and the next action.

### Phase Boundaries
- Keep implementation scoped to Import and Recurrings only for this phase.
- Prefer frontend-only improvements first, reusing existing `ApiError.message` and optional remediation fields; only change backend contracts if a concrete blocker appears.
- Cover the critical Import steps: analyze, save mapping, account assignment, reconciliation mapping, and commit.
- Move Recurrings success states to toasts and reserve inline alerts for actionable problems or persistent context.

### the agent's Discretion
- Exact copy phrasing can be tuned during implementation as long as it stays specific and recovery-oriented.
- Shared helper placement is flexible if it stays small and follows current `apps/web/src/lib` conventions.
- Minor cleanup in the touched pages is acceptable if it directly supports clearer feedback behavior.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/web/src/components/providers/AppProviders.tsx` already mounts a dark `Toaster` and the command palette globally.
- `apps/web/src/lib/api/client.ts` already supports `ApiError` plus optional `error.details.remediation`.
- `apps/web/src/lib/import/reducer.ts` centralizes Import workflow notices and errors, making message upgrades easier without rewriting page flow.

### Established Patterns
- Transactions already uses `toast.success`, `toast.error`, and `toast.warning` for action feedback.
- Import and Recurrings currently use inline `data-testid="global-message"` regions for persistent feedback.
- Workflow-heavy pages rely on local state and reducer-driven UI rather than shared global stores.

### Integration Points
- `apps/web/src/app/import/page.tsx` owns import analyze/save/assign/reconcile/commit feedback paths.
- `apps/web/src/app/recurrings/page.tsx` owns recurring create/update/evaluate/lifecycle feedback and simple validation.
- Any small shared helper likely belongs under `apps/web/src/lib` and should plug into these pages without changing API request contracts.

</code_context>

<specifics>
## Specific Ideas

- Import success toasts should cover analyze, mapping saved, import-account assignment, reconciliation mapping, and commit.
- Import inline alerts should emphasize recovery steps when mapping or assignment fails.
- Recurrings should move success confirmations to toasts while adding clearer inline or field-level validation for form mistakes before submit.

</specifics>

<deferred>
## Deferred Ideas

- Broader app-wide feedback sweep beyond Import and Recurrings.
- Backend-wide remediation contract standardization across endpoints.
- Larger shared notification system or feedback design-system extraction.

</deferred>
