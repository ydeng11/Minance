# SQLite-Only Runtime Storage Design

## Scope

Make SQLite the only runtime persistence backend for the application. `store.json` should no longer act as a live application store and should remain only as test fixture input for explicit migration or import-oriented tests.

## Goals

- Always use SQLite for local development, self-hosted runtime, and non-test execution.
- Keep the existing local SQLite bootstrap behavior so the app can start with an empty or seeded database file.
- Remove ambiguity about whether `store.json` is canonical runtime data.
- Preserve the JSON-to-SQLite migration utility only for test and fixture setup.
- Move regular API and E2E validation to temporary SQLite databases only.

## Non-Goals

- Remove the legacy Minance-to-SQLite migration flow.
- Redesign the import pipeline.
- Replace SQLite with another database engine.
- Delete every JSON fixture in the repository.

## Current Problem

The codebase still supports two storage modes:

- JSON runtime storage through `services/api/data/store.json`
- SQLite runtime storage through `services/api/data/minance.sqlite`

That split creates operational ambiguity. The application can run on SQLite while docs, scripts, and validation still treat `store.json` as an active peer store. In practice this causes drift, confusing verification results, and unclear ownership of the source of truth.

## Decision

SQLite is the only runtime data store.

- Non-test runtime always reads from and writes to SQLite.
- The local default database path remains `services/api/data/minance.sqlite`.
- Startup continues to auto-initialize SQLite when the database file is missing or empty.
- `store.json` is no longer a runtime fallback or active store.
- `store.json` remains allowed only as fixture input for tests that explicitly exercise conversion or import-style setup.

## Runtime Architecture

### 1. Effective backend selection

Outside `NODE_ENV=test`, the API should behave as SQLite-backed regardless of `MINANCE_STORE_BACKEND`. Runtime code should not treat JSON storage as a normal operating mode anymore.

### 2. Local bootstrap behavior

Local development should continue to use the checked-in SQLite path by default:

- `services/api/data/minance.sqlite`

If the file does not exist yet, startup should create and initialize it using the existing schema/bootstrap path. If it already exists and contains data, startup should use it as-is.

### 3. Store module responsibilities

The shared store access layer should stop loading or saving runtime collections through JSON outside tests. Runtime read/write behavior should always flow through the SQLite repository.

## Test And Fixture Architecture

### 1. Regular tests

Regular API, auth, storage, and E2E tests should run only against isolated temporary SQLite files.

### 2. Fixture-driven migration tests

`store.json` remains valid only when a test explicitly needs fixture input for:

- JSON-to-SQLite fixture setup
- legacy migration verification
- import or conversion workflows that intentionally start from a serialized fixture

### 3. Fixture location and semantics

The repository should stop treating `services/api/data/store.json` as canonical runtime data. It should instead be treated as a fixture artifact and moved or renamed so its purpose is obvious.

## Scripts And Documentation

### 1. Migration utility

The JSON-to-SQLite CLI remains in the repository, but its role changes to fixture/setup support rather than runtime cutover.

### 2. Operational docs

Runtime documentation should describe SQLite as the durable store. Any wording that still says JSON is the active store should be removed or rewritten.

### 3. Backup and restore docs

Operational scripts may still copy `store.json` when it exists, but documentation should make clear that SQLite is the runtime source of truth and JSON is optional fixture data.

## Risks

- Some tests and scripts still assume JSON is the active store and will need to be updated.
- Keeping fixture JSON in a live data directory will continue to confuse contributors unless it is moved or renamed.
- Existing validation flows that compare live SQLite against JSON fixture data need to be narrowed so they only run in tests that intentionally validate migration/setup behavior.

## Recommended Follow-Through

Implement the runtime switch first, then migrate tests and docs in the same change so the repository has one consistent storage story:

- runtime always uses SQLite
- tests default to temporary SQLite
- JSON fixtures exist only for explicit conversion-oriented tests
