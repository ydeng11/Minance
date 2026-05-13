# Phase 4: User Feedback & Error Handling - Research

**Researched:** 2026-04-07
**Domain:** Frontend feedback architecture for Import and Recurrings workflows in Next.js/React
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
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

### Deferred Ideas (OUT OF SCOPE)
## Deferred Ideas

- Broader app-wide feedback sweep beyond Import and Recurrings.
- Backend-wide remediation contract standardization across endpoints.
- Larger shared notification system or feedback design-system extraction.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UFBK-01 | Clear error messages with recovery actions (not generic "Something went wrong") | Inline-alert pattern, `ApiError` remediation reuse, action-specific fallback copy, field-level validation split, and test migration strategy |
| UFBK-02 | Success confirmations for important actions (save, delete, import) | Existing Sonner setup, Transactions precedent, import/recurrings success inventory, and toast assertion guidance for Playwright |
</phase_requirements>

## Summary

This phase should not invent new infrastructure. The codebase already has the core primitives: a global `Toaster` in `AppProviders`, an `ApiError` class that preserves `error.details.remediation`, a working toast pattern in Transactions, and a stable page-level `data-testid="global-message"` region on both Import and Recurrings. Planning should focus on redistributing feedback across those existing surfaces, not replacing them.

Import is already close to the target architecture because it uses `importWorkflowReducer` plus separate reconciliation notices. The main work there is copy quality and success-surface routing: reducer `notice` values like `Import analyzed.` and `Mapping saved.` should become success toasts, while blocking inline guidance stays in the existing alert region. Recurrings is the real architectural gap: one `message` string currently mixes validation failures, load errors, action failures, and routine successes. That should be split before copy polish, or the page will stay brittle.

**Primary recommendation:** Plan Phase 4 around a small shared feedback helper plus a Recurrings state split; keep Import reducer-driven, move routine success toasts to Sonner, and reserve inline alerts for persistent recovery guidance only.

## User Constraints

- Scope is Import and Recurrings only.
- Use `sonner` for success confirmations.
- Keep inline alerts for actionable errors and persistent workflow guidance.
- Stay frontend-first; only change backend contracts if a concrete blocker appears.
- Add only a small shared helper, not a notification framework.

## Project Constraints (from CLAUDE.md)

- Keep the existing stack: Next.js + Prisma + PostgreSQL. Do not recommend stack changes.
- Follow existing Tailwind + shadcn/ui patterns.
- Scope remains UX/quality polish only; no net-new feature work.
- Frontend work belongs in `apps/web`; backend work belongs in `services/api`; shared logic belongs in `packages/domain`.
- Use `pnpm@10.17.1`.
- Preferred project commands: `just build-web`, `just test`, `just check`.
- Frontend styling must stay in Tailwind only.
- Frontend files should stay `.tsx`; do not introduce plain CSS, SCSS, styled-components, or non-TSX UI files.
- Naming conventions: camelCase functions, PascalCase classes/components, UPPER_SNAKE_CASE constants.
- Ask first before database schema changes or adding dependencies.
- The final boundary instruction in `AGENTS.md` is truncated in source; do not infer missing restrictions beyond the visible text.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `sonner` | repo `^2.0.7`, npm latest `2.0.7` (published 2025-08-02) | Success toasts for critical workflow actions | Already installed, already mounted globally, and already used successfully on Transactions |
| `next` | repo `16.1.6`, npm latest `16.2.2` (published 2026-04-01) | App Router page/runtime | Existing app platform; Phase 4 is page-state work, not framework work |
| `react` | repo `19.2.3`, npm latest `19.2.4` (published 2026-01-26) | Local state and workflow UI | Existing client-state model for Import and Recurrings |
| local `ApiError` client | repo-local | Preserves API message, code, and remediation | Already standard in this codebase; do not bypass it with ad-hoc parsing |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `lucide-react` | repo `0.575.0` | Inline alert/status icons if markup is touched | Use only if the alert surface is upgraded visually |
| `tsx --test` | repo `4.21.0`, npm latest `4.21.0` (published 2025-11-30) | Fast frontend unit tests | Use for small helper/reducer/validation tests |
| `@playwright/test` | repo `1.56.1`, npm latest `1.59.1` (published 2026-04-01) | End-to-end verification of feedback surfaces | Use for toast/inline-alert workflow assertions |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Sonner success toasts | Keep inline success banners | Conflicts with Phase 3 pattern and leaves success competing with blocking guidance |
| Small shared wording helper | Full notification abstraction | Over-scoped for two pages and explicitly out of bounds |
| Local Recurrings state split | React Hook Form migration | Valid long-term, but unnecessary scope for this phase |

**Installation:**
```bash
# No new packages required for this phase.
```

**Version verification:** Recommended packages are already installed; latest versions were verified against npm during research.
```bash
npm view sonner version
npm view next version
npm view react version
npm view @playwright/test version
```

## Architecture Patterns

### Recommended Project Structure
```text
apps/web/src/
├── app/import/                 # Keep reducer-driven import workflow feedback here
├── app/recurrings/             # Split validation/error/success state here
├── components/providers/       # Global Toaster already lives here
└── lib/
    ├── api/                    # Reuse ApiError and payload typing
    └── feedback/ or ui/        # Small shared message helper if extracted
```

### Pattern 1: Transient Success, Persistent Error
**What:** Success messages for completed critical actions go to Sonner; blocking errors and workflow guidance stay in the page-level inline region.
**When to use:** Any action the user should acknowledge but not manually dismiss.
**Example:**
```typescript
// Source: https://github.com/emilkowalski/sonner
import { Toaster, toast } from "sonner";

toast.success("Recurring rule updated.");
```

### Pattern 2: Centralize Fallback Error Wording
**What:** Convert unknown errors and weak fallback strings into action-specific, recovery-oriented messages in one small helper.
**When to use:** Import and Recurrings request handlers that currently repeat `error instanceof ApiError ? error.message : "..."`
**Example:**
```typescript
// Source: local pattern from apps/web/src/app/transactions/page.tsx and apps/web/src/lib/api/client.ts
function getRequestErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}
```

### Pattern 3: Separate Recurrings State by Surface
**What:** Keep field validation errors separate from page-level request errors and separate both from success toasts.
**When to use:** Create/edit/evaluate/lifecycle actions on Recurrings.
**Example:**
```typescript
type RecurringFormErrors = {
  name?: string;
  amount?: string;
};

const [formErrors, setFormErrors] = useState<RecurringFormErrors>({});
const [pageError, setPageError] = useState<string | null>(null);
```

### Pattern 4: Preserve Import Reducer Ownership
**What:** Keep Import workflow step transitions in `importWorkflowReducer`, but stop treating reducer `notice` as the primary success surface.
**When to use:** Analyze, mapping save, commit, and import step transitions.
**Example:**
```typescript
// Source: /Users/ihelio/code/minance2/apps/web/src/lib/import/reducer.ts
dispatch({ type: "mapping_save_succeeded", details, processedRows });
toast.success("Mapping saved. Continue to account review.");
```

### Anti-Patterns to Avoid
- **Single `message` state for everything:** Recurrings currently does this and cannot distinguish validation, blocking failures, or transient success.
- **Toasting recovery-oriented errors:** transient toasts are the wrong surface for persistent workflow guidance.
- **Page-wide success banners that linger:** they compete with actual blocking inline alerts and break the UI contract.
- **Backend-contract expansion before frontend cleanup:** current `ApiError.message` plus optional remediation is already sufficient for Phase 4.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Success notifications | Custom toast renderer | Existing `sonner` setup | Already mounted, already used, and already aligned with Phase 3 |
| API error extraction | Per-page string concatenation | Existing `ApiError` + one small fallback helper | Prevents copy drift and preserves remediation hints |
| Full-form abstraction for Recurrings | New form framework migration | Local state + targeted validation split | Lower risk and within phase scope |
| Test selectors for toasts | New toast-specific data-testid layer | Playwright text/user-facing locators | Existing tests already rely on user-facing outcomes; no infra change needed |

**Key insight:** This phase is mostly about assigning the right message to the right surface. The expensive mistake would be building infrastructure when the repo already has enough primitives.

## Common Pitfalls

### Pitfall 1: Toast/E2E Flakiness
**What goes wrong:** Tests keep asserting `global-message` for success after the UI moves those messages into transient toasts.
**Why it happens:** Existing E2E specs hard-code old inline success text for Import and Recurrings.
**How to avoid:** Plan explicit test migration work alongside UI work; assert toast text immediately after the triggering action.
**Warning signs:** Passing UI locally but failing Playwright on `data-testid="global-message"` expectations.

### Pitfall 2: Recurrings Validation Hidden in Page-Level Alerts
**What goes wrong:** Missing name or invalid amount appears only in a global message, so users have to infer which field is wrong.
**Why it happens:** Current page uses one `message` state for both form and request feedback.
**How to avoid:** Add adjacent field errors for `name` and `amount`, preserve draft state, and keep page-level alerts for request/cross-field failures only.
**Warning signs:** Validation copy repeats in both create and edit handlers and no field owns the error.

### Pitfall 3: Import Success Guidance Lost During Refactor
**What goes wrong:** Moving success notices to toast removes useful “what next” guidance for account assignment and reconciliation.
**Why it happens:** Some current inline notices are both confirmation and next-step guidance.
**How to avoid:** Keep persistent inline guidance when it informs the next workflow decision; only migrate routine success confirmations.
**Warning signs:** After success, users have no visible cue about remaining unmatched rows or reconciliation work.

### Pitfall 4: Copy Regresses to Generic Fallbacks
**What goes wrong:** Handlers keep returning `Failed to ...` or `Request failed (...)`.
**Why it happens:** Fallback strings are duplicated across handlers and not normalized.
**How to avoid:** Centralize action-specific fallback copy and prefer `{action} couldn’t be completed. Nothing changed. {next step}.`
**Warning signs:** Same failure reads differently across analyze/save/commit/pause/delete.

### Pitfall 5: Overreaching into Global Feedback Refactor
**What goes wrong:** Phase work expands into Categories, Settings, Accounts, Explorer, or app-wide notification cleanup.
**Why it happens:** The repo has many legacy `setMessage(...)` pages.
**How to avoid:** Lock tasks to Import and Recurrings only; treat broader consistency as deferred follow-up.
**Warning signs:** Proposed edits spread beyond the two target pages or helper scope grows past copy/formatting.

## Code Examples

Verified patterns from official and local sources:

### Global Sonner Mount
```tsx
// Source: /Users/ihelio/code/minance2/apps/web/src/components/providers/AppProviders.tsx
<Toaster closeButton position="top-center" richColors theme="dark" />
```

### Existing Transactions Toast Pattern
```typescript
// Source: /Users/ihelio/code/minance2/apps/web/src/app/transactions/page.tsx
import { toast } from "sonner";

toast.success("Transaction updated.");
toast.error(getRequestErrorMessage(error, "Failed to save transaction."));
```

### Existing ApiError Remediation Preservation
```typescript
// Source: /Users/ihelio/code/minance2/apps/web/src/lib/api/client.ts
function parseErrorMessage(status: number, payload: ApiErrorPayload | null) {
  const base = payload?.error?.message || `Request failed (${status})`;
  const remediation = payload?.error?.details?.remediation;
  return remediation ? `${base}: ${remediation}` : base;
}
```

### Playwright User-Facing Locator Pattern
```typescript
// Source: https://playwright.dev/docs/locators
await expect(page.getByText("Recurring rule created.")).toBeVisible();
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Inline success banner for every action | Toast for routine success, inline alert only for blocking guidance | Phase 3 introduced Sonner; Phase 4 should finish adoption on Import/Recurrings | Keeps success lightweight and leaves page alerts meaningful |
| Generic fallback strings | Action-specific recovery-oriented copy | Current UX standard for this milestone | Better UFBK-01 compliance and easier support/debugging |
| One mixed message state | Per-surface state: field error, page error, toast success | Recommended for this phase | Prevents conflicting feedback and simplifies tests |

**Deprecated/outdated:**
- Inline `global-message` assertions for Import/Recurrings success paths in existing E2E specs: these are now stale once Phase 4 lands.

## Open Questions

1. **Should Import account-assignment success remain partly inline?**
   - What we know: The UI spec explicitly allows reconciliation/account-assignment guidance to remain inline when it informs the next decision.
   - What's unclear: Whether every assignment success should toast, or only the clearly “done” ones.
   - Recommendation: Plan this as copy-level discretion, not a blocker. Keep toast + inline guidance if both serve distinct purposes.

2. **Should Recurrings suggestions surface participate in the same success/error scheme now?**
   - What we know: SuggestionsSection lives on the page, but the discuss context scoped Phase 4 to main Recurrings actions.
   - What's unclear: Whether create-from-suggestion feedback must be normalized in this phase.
   - Recommendation: Keep it out unless the current UI breaks requirement coverage.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js app, tests, scripts | ✓ | `v25.8.1` | — |
| pnpm | workspace scripts | ✓ | `10.17.1` | — |
| `just` | project-standard task entry points | ✓ | `1.47.1` | use `pnpm` scripts directly |
| Playwright CLI | phase E2E verification | ✓ | CLI `1.58.2` | use `pnpm exec playwright` |
| Python 3 | optional repo tooling only | ✓ | `3.14.3` | not needed for this phase |

**Missing dependencies with no fallback:**
- None.

**Missing dependencies with fallback:**
- None.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node test runner via `tsx --test` + Playwright |
| Config file | `/Users/ihelio/code/minance2/playwright.config.mjs` |
| Quick run command | `pnpm --filter @minance/web test` |
| Full suite command | `just check` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UFBK-01 | Import and Recurrings show actionable error/recovery guidance; Recurrings validation is field-level for obvious errors | unit + e2e | `pnpm exec tsx --test apps/web/src/lib/import/reducer.test.ts apps/web/src/app/recurrings/page.test.ts` and `pnpm exec playwright test e2e/specs/cross-tab-parity.spec.ts e2e/specs/import-existing-account-transactions.spec.ts` | partial |
| UFBK-02 | Critical actions show success confirmations via toast on Import and Recurrings | e2e | `pnpm exec playwright test e2e/specs/cross-tab-parity.spec.ts e2e/specs/import-existing-account-transactions.spec.ts` | partial |

### Sampling Rate
- **Per task commit:** `pnpm --filter @minance/web test`
- **Per wave merge:** `pnpm exec playwright test e2e/specs/cross-tab-parity.spec.ts e2e/specs/import-existing-account-transactions.spec.ts`
- **Phase gate:** `just check`

### Wave 0 Gaps
- [ ] `/Users/ihelio/code/minance2/apps/web/src/app/recurrings/page.test.ts` — add coverage for field validation and page-error state split for UFBK-01
- [ ] `/Users/ihelio/code/minance2/apps/web/src/app/import/page.test.ts` — extend beyond toolbar rendering to cover feedback-surface decisions or helper behavior
- [ ] `/Users/ihelio/code/minance2/e2e/specs/cross-tab-parity.spec.ts` — migrate Recurrings assertions from inline `global-message` success to toast success text
- [ ] `/Users/ihelio/code/minance2/e2e/specs/import-existing-account-transactions.spec.ts` — migrate Import success assertions from inline success banners to toast-visible outcomes where appropriate

## Sources

### Primary (HIGH confidence)
- Local codebase:
  - `/Users/ihelio/code/minance2/apps/web/src/components/providers/AppProviders.tsx`
  - `/Users/ihelio/code/minance2/apps/web/src/app/import/page.tsx`
  - `/Users/ihelio/code/minance2/apps/web/src/app/recurrings/page.tsx`
  - `/Users/ihelio/code/minance2/apps/web/src/lib/api/client.ts`
  - `/Users/ihelio/code/minance2/apps/web/src/lib/import/reducer.ts`
  - `/Users/ihelio/code/minance2/e2e/specs/cross-tab-parity.spec.ts`
  - `/Users/ihelio/code/minance2/e2e/specs/import-existing-account-transactions.spec.ts`
- Sonner official docs: https://sonner.emilkowal.ski
- Sonner official repository/README: https://github.com/emilkowalski/sonner
- Playwright locators: https://playwright.dev/docs/locators
- Playwright assertions: https://playwright.dev/docs/test-assertions

### Secondary (MEDIUM confidence)
- npm registry version checks via `npm view` for `sonner`, `next`, `react`, `@playwright/test`, `tsx`, and `typescript`

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Existing repo stack is explicit and Sonner usage is already live.
- Architecture: HIGH - The relevant pages and helper layers were inspected directly.
- Pitfalls: HIGH - Current E2E assertions and page state shape expose the likely failure modes clearly.

**Research date:** 2026-04-07
**Valid until:** 2026-05-07
