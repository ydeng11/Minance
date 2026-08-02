# Changelog

All notable changes to Minance will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- **Add account institution presets**: Stored institution values from legacy data
  (e.g. `BANK_OF_AMERICA`, `CITI`) now map to their display names and are deduplicated
  against the preset list, so "Add account" no longer shows stale identifiers like
  "BANK_OF_AMERICA" next to "Bank of America".

- **Bilt card faces**: The Bilt preset cards (Bilt Rewards Mastercard, Bilt Blue
  Card, Bilt Obsidian Card, Bilt Palladium Card) now render real card artwork
  instead of the broken, pixelated image that appeared when the referenced image
  files were missing. The Blue/Obsidian/Palladium faces use Bilt Card 2.0 card
  art (mirrored from Upgraded Points, which credits Bilt); the classic Bilt
  Rewards Mastercard uses a physical-card render (from Thrifty Traveler).

## [0.1.2] - 2026-07-31

### Added

- **Bilt credit card presets**: Added "Bilt" as a standalone institution with its own
  card presets. Includes the full Bilt Card 2.0 lineup — **Bilt Rewards Mastercard**
  (legacy, $0 AF), **Bilt Blue Card** ($0 AF), **Bilt Obsidian Card** ($95 AF), and
  **Bilt Palladium Card** ($495 AF) — with annual fees, rewards rates, and benefits
  for each tier. "Bilt Rewards Mastercard" moved from the Wells Fargo section to the
  dedicated Bilt section in both name-only presets (`CREDIT_CARD_PRESETS`) and rich
  metadata presets (`CREDIT_CARD_PRESETS_META`). Added Bilt to `INSTITUTION_PRESETS`
  and Bilt card styles to `cardStyles.ts`.

### Fixed

- **Spend Composition legend filter**: Clicking a legend category isolates that category's
  bars; clicking it again (or the "Clear filter" button) removes the filter.
  Other categories stay visible and clickable while a filter is active, so switching
  categories no longer requires clearing the filter first.

- **Spend Composition categories**: The chart now groups each transaction by its persisted
  granular category instead of reclassifying it through merchant and taxonomy hints.

## [0.1.1] - 2026-07-24

### Changed

- **AI Settings**: Replaced credential + preferences model with a simplified profile-based system.
  Each profile bundles provider, model, and API key under a required name. Users can create
  multiple profiles and activate one at a time. API keys are never returned to the browser.
  Removed failover provider chain and feature-level overrides.

- **System prompt**: Rewrote QA assistant system prompt to reduce overuse of `ask_clarification`,
  default to `range: "all"` when no time period is specified, and emphasize including specific
  dollar amounts in answers.

- **Agent loop**: `MAX_TOOL_CALLS` off-by-one fixed — five tool calls are now allowed before
  the sixth is rejected (was four). Failed tool results are returned to the LLM loop instead
  of being silently dropped. Added argument validation for terminal tools (`assign_category`,
  `create_recurring_suggestion`, `assign_results`).

- **Capability-based architecture**: Agent tools now use a capability registry. Each domain
  (analytics, subscriptions, benefits, budgeting) registers its tools, system prompt segments,
  and category tags independently. All modes are backward compatible.

- **ToolSpec**: Created `tool-spec.ts` as single source of truth with unified schema, execute
  handler, access level, confirmation policy, and category. `tools.ts` now derives its exports
  from `ALL_TOOLS`. `tool-executor.ts::getAvailableTools()` retained as deprecated fallback.

### Added

- `model` column to `ai_provider_credentials` table and schema.
- `active_profile_id` column to `ai_provider_preferences` table, replacing the
  `default_provider`/`default_model`/`failover_providers` preference model.
- `PATCH /v1/ai/credentials/:id` endpoint for updating profile metadata without a key.
- `PUT /v1/ai/credentials/activate` endpoint for setting the active profile.
- Auto-activation of the first created profile, and auto-fallback to the next profile
  when the active one is deleted.

- **Dependency injection**: All LLM-dependent functions (`llm/categorize.ts`, `llm/assistant.ts`,
  `llm/agent.ts`, `src/assistant.ts`) now accept optional injected mocks for testability.

- **Observable trace**: Agent accumulates `_trace` array recording turns, tool names/args/results,
  and terminal outcome when `_collectTrace: true` is set. Zero production overhead.

- **Cross-user isolation**: `runAssistantQuery` now enforces `requireConversationOwnership`
  before loading conversation history (not just the API route).

- **Override date**: `_overrideDate` field on `AgentInput` freezes "today" for reproducible
  date-relative evaluation.

- **ToolSpec** (`llm/tool-spec.ts`): Single source of truth for all 30+ assistant tools.
  Each tool defines schema, deterministic execute handler, access level (read/write),
  category (analytics/subscriptions/benefits/budgeting/system), and confirmation policy.

- **Recurring subscription tools**: `list_recurring_rules`, `list_recurring_suggestions`,
  `detect_recurring_patterns` (deterministic, not LLM-on-LLM), `explain_recurring_rule`
  (projected annual cost, next date, amount changes), `create_recurring_rule` (with
  confirmation flow), `dismiss_recurring_suggestion` (with confirmation flow).

- **Credit card benefits** (`llm/benefits-store.ts`): In-memory store for card benefits
  with deterministic usage calculation from transaction history. Supporting tools:
  `list_credit_cards`, `get_card_benefits`, `get_benefit_usage`, `get_best_card_for_category`,
  `get_annual_fee_analysis`, `get_annual_credits`, `save_card_benefit`,
  `delete_card_benefit`. All write tools require explicit user confirmation.

- **Budgeting & analysis tools**: `get_spending_trends` (month-over-month with direction),
  `get_recurring_forecast` (project upcoming charges from rules),
  `get_budget_comparison` (actual vs targets), `save_budget_target` (with confirmation).

- **Confirmation flow**: Write tools return `_requiresConfirmation` with preview data.
  Agent detects this and returns a clarification prompt. User confirms with "Yes, confirm"
  before the tool executes. Frontend renders clickable option buttons.

- **UI structured data cards**: Frontend assistant component now renders subscription,
  card benefit, and budget comparison cards as structured sections below the chat bubble.

- **Deterministic AI tests**: 250 tests (56 new) across all modules including full coverage
  of new recurring, benefits, budgeting, and ToolSpec integrity tests.

- **Live AI eval harness**: Opt-in `test:ai-evals` script (guarded by `AI_EVALS=1`)
  runs real LLM queries against versioned baselines with LLM-as-judge scoring.
  Aggregated per-baseline pass/fail at 80% paraphrase threshold. Records fixture hash,
  prompt version, assistant/judge models, and frozen override date.
  V1 (8 analytics baselines) + V2 (10 recurring/benefits/budgeting baselines).

- **Eval fixture** (`eval-fixture.json`): Supplemental fixture with 5 card benefits,
  4 budget targets, 3 recurring suggestions, designed to complement the existing
  deterministic financial store.

- **`AI_CARD_BENEFITS_ENABLED`** feature flag.

- **`just test-ai-evals` recipe**: Loads `.env.local` and runs the eval suite.

### Removed

- `failoverProviders` and `featureOverrides` from `ProviderPreferences`.
- Separate "Add Provider Key" and "Preferences & Failover" panels — unified into a
  single profile list + add/edit form.

## [0.1.0] - 2026-07-22

### Added

- Initial versioned release of Minance.
