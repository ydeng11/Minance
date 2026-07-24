# Changelog

All notable changes to Minance will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

- **Deterministic AI tests**: 194 tests across credential management, assistant API,
  LLM synthesis and categorization, agent loop (including multi-turn, trace, timeout,
  tool validation, max-calls counting), client (request body, endpoint selection),
  conversation store (concurrent sessions, updates, isolation), and tool executor
  (edge cases, empty args, no-matches). All credential-free with injected mocks.

- **Live AI eval harness**: Opt-in `test:ai-evals` script (guarded by `AI_EVALS=1`)
  runs real LLM queries against versioned baselines with LLM-as-judge scoring.
  Aggregated per-baseline pass/fail at 80% paraphrase threshold. Records fixture hash,
  prompt version, assistant/judge models, and frozen override date.

- **`just test-ai-evals` recipe**: Loads `.env.local` and runs the eval suite.

### Removed

- `failoverProviders` and `featureOverrides` from `ProviderPreferences`.
- Separate "Add Provider Key" and "Preferences & Failover" panels — unified into a
  single profile list + add/edit form.

## [0.1.0] - 2026-07-22

### Added

- Initial versioned release of Minance.
