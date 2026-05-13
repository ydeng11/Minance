# Codebase Concerns

**Analysis Date:** 2026-03-31

## Tech Debt

**Disabled Investments Feature (Suspended Module):**
- Issue: Investments module is retained in codebase but all UI entry points are hidden. Backend endpoints remain active while frontend navigation is disabled.
- Files: `services/api/src/investments.ts`, `services/api/src/server.ts` (lines 62, 974), `apps/web/src/app/investments/page.tsx`, `apps/web/src/components/layout/BottomNav.tsx`, `apps/web/src/components/layout/Sidebar.tsx`
- Impact: 821 lines of backend code and frontend components require maintenance but provide no user value. Creates confusion about product scope.
- Fix approach: Either fully remove the investments domain or formalize its suspension with a feature flag system. The TODO(maybe-later) markers suggest uncertainty.

**Deprecated CrewAI Integration:**
- Issue: `services/api/src/agents.ts` is marked deprecated but still present. CrewAI Python integration was replaced by tool-calling agent in `services/api/src/llm/agent.ts`.
- Files: `services/api/src/agents.ts` (160 lines), `services/agents/crewai_analysis_agent.py` (44 lines)
- Impact: Unused code creates maintenance burden and potential confusion for developers.
- Fix approach: Remove `agents.ts` and the Python agent script if no longer referenced anywhere.

**Legacy API Loader:**
- Issue: Legacy data loading module exists for migrating from previous system version.
- Files: `services/api/src/legacy-api-loader.ts` (679 lines), `scripts/load-legacy-api.ts`
- Impact: Large module for one-time migration use; may be unnecessary post-migration.
- Fix approach: Audit usage - if migration complete, consider removal or documentation of purpose.

**Large Monolithic Files:**
- Issue: Several files exceed 1000 lines, making them difficult to navigate and maintain.
- Files:
  - `services/api/src/server.ts` (1509 lines) - All API routes in single file
  - `services/api/src/imports.ts` (1480 lines) - Import processing logic
  - `apps/web/src/app/transactions/page.tsx` (1468 lines) - Single page component
  - `apps/web/src/app/import/page.tsx` (1029 lines) - Another large page
  - `apps/web/src/app/accounts/page.tsx` (851 lines)
  - `apps/web/src/app/categories/page.tsx` (846 lines)
- Impact: Difficult to understand, test, and modify. High cognitive load for developers.
- Fix approach: Extract sub-components, utilities, and helper functions. For server.ts, consider route module organization.

## Type Safety Issues

**Excessive `any` Type Usage:**
- Issue: LLM-related code uses `any` type extensively, bypassing TypeScript's type checking.
- Files: `services/api/src/recurring-scan.ts` (line 153), `services/api/src/llm/recurring-detection.ts` (lines 28, 42-48, 52, 73-74, 96), `services/api/src/recurring-suggestions.ts` (lines 15, 191)
- Impact: Runtime errors possible from incorrect type assumptions. Difficult to refactor safely.
- Fix approach: Define proper interfaces for LLM inputs/outputs and transaction data structures.

## Security Considerations

**Hardcoded Development Credentials:**
- Risk: Default dev/test account password "devpassword123" is hardcoded. If deployed to production without configuration, weak credentials could be exposed.
- Files: `services/api/src/auth.ts` (line 14), `services/api/src/legacy-api-loader.ts` (lines 347-348)
- Current mitigation: Code checks `process.env.NODE_ENV === "production"` and skips seeding. Password length validation requires 8+ characters.
- Recommendations: Ensure deployment documentation emphasizes overriding DEV_TEST_ACCOUNT_PASSWORD. Consider removing hardcoded defaults entirely.

**Weak AI Secret Default:**
- Risk: AI_SECRET defaults to "minance-next-local-secret-change-me" if environment variable not set.
- Files: `services/api/src/config.ts` (line 104)
- Current mitigation: None beyond the warning message in the default value string.
- Recommendations: Require AI_CREDENTIAL_SECRET in production builds. Fail startup if not configured in production mode.

**In-Memory Rate Limiting:**
- Risk: Rate limiting uses in-memory Map in `security.ts`. Won't work correctly across multiple API processes/instances.
- Files: `services/api/src/security.ts` (line 21 - `rateLimitBuckets = new Map()`)
- Current mitigation: Works fine for single-process deployment (current Docker setup).
- Recommendations: For multi-instance deployments, implement distributed rate limiting (Redis-backed or similar). Document current limitation.

## Performance Bottlenecks

**SQLite CLI Dependency:**
- Issue: SQLite operations spawn `sqlite3` CLI process via `spawnSync` rather than using a native SQLite library.
- Files: `services/api/src/sqlite-foundation.ts` (lines 41-47), `services/api/src/sqlite-store-repository.ts`
- Impact: Performance overhead from process spawning. Requires sqlite3 CLI installed in environment. Potential for timeout issues under heavy load.
- Improvement path: Consider using better-sqlite3 or sql.js for native JavaScript SQLite bindings.

**Large Page Component Rendering:**
- Issue: Transaction page at 1468 lines likely has complex render cycles with many state variables.
- Files: `apps/web/src/app/transactions/page.tsx`
- Cause: Single component handles filtering, selection, bulk operations, editing, and display.
- Improvement path: Extract state management into separate hooks/context. Consider memoization for expensive computations.

## Fragile Areas

**Import Processing Pipeline:**
- Files: `services/api/src/imports.ts` (1480 lines), `services/api/src/csv.ts`, `services/api/src/ofx-qfx.ts`, `services/api/src/import-direction.ts`
- Why fragile: Complex multi-step pipeline with LLM integration, direction inference, categorization, fingerprinting, and reconciliation. Many edge cases in CSV parsing.
- Safe modification: Each function has clear boundaries. Import processing is well-tested with `services/api/test/imports.test.ts`.
- Test coverage: Good - multiple test files cover import scenarios including LLM batch processing tests.

**LLM Tool Executor:**
- Files: `services/api/src/llm/tool-executor.ts` (584 lines), `services/api/src/llm/tools.ts` (10KB), `services/api/src/llm/agent.ts` (504 lines)
- Why fragile: Complex tool calling logic with error handling, timeout management, and conversation state. External LLM API dependency introduces variability.
- Safe modification: Tool definitions are clearly structured. Test coverage exists in `services/api/test/llm/tool-executor.test.ts`.
- Test coverage: Moderate - integration tests exist but edge cases around LLM failures need coverage.

**Recurring Detection Scan:**
- Files: `services/api/src/recurring-scan.ts` (382 lines), `services/api/src/recurring-suggestions.ts`
- Why fragile: Background scan process with user-by-user iteration, timeout handling, and suggestion creation. State management through scan counters.
- Safe modification: Clear separation between scan orchestration and detection logic.
- Test coverage: Moderate - `services/api/test/recurring-scan.test.ts` covers core scenarios.

## Scaling Limits

**Single-Process Architecture:**
- Current capacity: Single API process serves all requests. In-memory store cache.
- Limit: Cannot scale horizontally. All data in one process memory.
- Scaling path: Implement stateless API with proper database connection pooling. Move rate limiting to distributed store. Currently acceptable for self-hosted single-user deployment.

**SQLite File-Based Storage:**
- Current capacity: Single SQLite file for all data. Works for personal finance use case.
- Limit: SQLite has practical limits around concurrent writes. WAL mode helps but still single-file constraint.
- Scaling path: If multi-user hosted service needed, migrate to PostgreSQL or similar RDBMS with proper connection pooling.

## Dependencies at Risk

**None identified** - Core dependencies (Next.js, React, sqlite3 CLI) are stable and well-maintained.

## Missing Critical Features

**None identified** - Codebase appears feature-complete for stated product scope.

## Test Coverage Gaps

**Large Page Components Without Tests:**
- What's not tested: Client-side rendering logic, state management, user interactions
- Files: `apps/web/src/app/page.tsx` (383 lines), `apps/web/src/app/recurrings/page.tsx` (659 lines), `apps/web/src/app/settings/page.tsx`, `apps/web/src/app/settings/ai/page.tsx` (354 lines), `apps/web/src/app/explorer/page.tsx` (517 lines)
- Risk: UI regressions could go undetected. Complex state interactions may break.
- Priority: Medium - E2E tests cover user flows but unit tests for state logic would improve reliability.

**Explorer Visualization Components:**
- What's not tested: Data visualization logic, chart rendering, filter combinations
- Files: `apps/web/src/app/explorer/components/*.tsx` (multiple visualization components)
- Risk: Visualization bugs or data misrepresentation could slip through.
- Priority: Low - E2E tests verify visual output but component-level tests would catch edge cases.

**LLM Error Scenarios:**
- What's not tested: Network timeouts, malformed responses, rate limit errors, provider failures
- Files: `services/api/src/llm/client.ts`, `services/api/src/llm/tool-executor.ts`
- Risk: LLM API failures may cause unhandled errors or poor user experience.
- Priority: Medium - Current tests mock successful responses; need failure scenario coverage.

---

*Concerns audit: 2026-03-31*