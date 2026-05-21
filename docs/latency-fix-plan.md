# Latency Fix Plan

## Goal

Reduce API response times from 2–10s to <200ms for the five slowest endpoints.

## Root Cause Summary

The entire stack has one structural problem and four code-level problems:

| # | Problem | Impact |
|---|---------|--------|
| **P0** | SQLite via CLI subprocess (`spawnSync sqlite3`) instead of native bindings | Every SQLite op spawns a process: ~5–50ms overhead per operation |
| **P1** | `refreshStoreCacheIfChanged()` runs on **every** API request | Even a trivial `/v1/users/me` pays stat + mtime check + potential full DB reload |
| **P2** | `ensureSqliteStoreReady()` checked on every request | Spawns `sqlite3 --version`, PRAGMAs, sometimes VACUUM on every request |
| **P3** | No SQL-level filtering — loads ALL rows into JS array, filters in O(n) loops | `getExplorerAnalytics()` does 12+ passes over all 3,732 transactions |
| **P4** | Suggestions endpoint sends wrong path (`suggestions` instead of `/v1/recurrings/suggestions`) | Wasteful 404 falling through all route checks |

## Phase 1 — Quick Wins (no dependencies, <2h)

These are safe, additive changes that don't touch the data layer.

### 1.1 Throttle `refreshStoreCacheIfChanged()` to run at most once per 2s

**Why:** Every request pays this tax. Even `/v1/users/me` (1.28s) is dominated by it. After any mutation, every GET triggers a full SQLite reload.

**What:**
- Add a module-level `lastRefreshAtMs` variable in `store.ts`
- In `refreshStoreCacheIfChanged()`, skip if `Date.now() - lastRefreshAtMs < 2000`
- Only force-refresh on explicit mutations (inside `saveStore()`)

**Files:**
- `services/api/src/store.ts`

**Success criteria:**
- `/v1/users/me` drops from 1.28s to <10ms
- Second explorer call in same 2s window skips cache reload entirely

### 1.2 Remove redundant `ensureSqliteStoreReady()` from hot path

**Why:** `refreshStoreCacheIfChanged()` calls `loadSqliteStoreIntoCache()` which calls `ensureSqliteStoreReady()` which calls `ensureSqliteFoundation()`. That function spawns `sqlite3 --version`, runs PRAGMAs, and sometimes VACUUMs the database. This should be a startup-only operation.

**What:**
- Call `ensureSqliteFoundation()` once at server startup (already happens on line ~188 of server.ts for the sqliteFoundation variable)
- Remove the call inside `loadSqliteStoreIntoCache()` / `ensureSqliteStoreReady()` — the cache-load path should assume SQLite is ready
- Move the periodic VACUUM logic (free_pages > 500) to a standalone maintenance function called from a setInterval or on server start only

**Files:**
- `services/api/src/store.ts` — simplify `loadSqliteStoreIntoCache()`
- `services/api/src/sqlite-foundation.ts` — separate VACUUM from foundation check

**Success criteria:**
- No more `sqlite3 --version` or VACUUM subprocess spawns during normal request handling
- Server startup still does the full foundation init

### 1.3 Fix the suggestions 404

**Why:** The request `suggestions?count_only=true` doesn't match any route, falls through, returns 404 after 1.6s of overhead. The actual endpoint is `/v1/recurrings/suggestions`.

**What:**
- Find the frontend code sending this request and fix the URL path
- Or add a catch-all route for `/v1/suggestions` → redirect/alias to `/v1/recurrings/suggestions`

**Files to find:**
- Grep the web app for `suggestions?count_only` or `/v1/suggestions`

**Success criteria:**
- Request returns 200 with correct data instead of 404
- Latency drops from 1.60s to the normal endpoint time (~200ms after phase 1.1)

### 1.4 Cache `getCategoryStrategyForUser()` result within a request

**Why:** Every analytic function calls `ensureCategoryStrategyForUser()` and `createCategoryResolver()`. These load the strategy from the store and transform it. With the throttled refresh (1.1), the store stays constant across a request, so repeat calls are wasteful.

**What:**
- Add a simple `requestScopedCache` pattern — a `Map` keyed by argument hash that is cleared at the start of each `handleApiRequest` call

**Files:**
- `services/api/src/category-strategy.ts` — wrap resolver creation with a memo cache
- `services/api/src/server.ts` — clear scoped cache at start of `handleApiRequest`

**Success criteria:**
- `getExplorerAnalytics()` resolves the category strategy once instead of 6+ times

## Phase 2 — Analytics Query Optimization (<4h)

### 2.1 Memoize `filterUserTransactions()` results per request

**Why:** `getExplorerAnalytics()` calls `filterUserTransactions()` 4+ times with slightly different filters (current, previous, category selector, account selector). Each call scans all 3,732 transactions from scratch.

**What:**
- First call within a request runs the full scan; subsequent calls with the same base filter reuse the filtered array and apply delta filters
- Key insight: most filters are "narrowing" — `category`, `account`, `merchant` all subset an already-filtered list

**Files:**
- `services/api/src/analytics.ts` — add a `filterUserTransactionsCached()` wrapper
- Or add to `store.ts` as a generic scoped-cache helper

**Success criteria:**
- Explorer endpoint drops from 6.21s to <3s (roughly halved transaction scans)

### 2.2 Add month-key index to transaction scans

**Why:** `filterUserTransactions()` iterates ALL transactions and checks `inDateRange()`. We could build a `Map<monthKey, transactions[]>` once and avoid scanning months outside the filter range.

**What:**
- Build a `Map<user_id, Map<monthKey, transactions[]>>` on cache load
- `filterUserTransactions()` only iterates months in the requested range

**Files:**
- `services/api/src/store.ts` — build index on cache load
- `services/api/src/analytics.ts` — use index in `filterUserTransactions()`

**Success criteria:**
- 365-day explorer queries cover ~12 months → scan ~12/36 months = 67% fewer iterations

## Phase 3 — SQLite Native Bindings (<8h, highest impact)

### 3.1 Replace CLI subprocess with `better-sqlite3` or `node:sqlite`

**Why:** This is the single biggest performance bottleneck. Every read/write operation currently:
1. Spawns a Node.js child process (`spawnSync`)
2. The `sqlite3` CLI binary starts up, parses SQL, executes, serializes JSON to stdout
3. Node.js reads the stdout and parses JSON

With native bindings, all of this happens in-process at native speed — sub-millisecond operations instead of 5-50ms each.

**What:**
- Add `better-sqlite3` as a dependency (widely used, stable, synchronous API that matches the existing pattern)
- OR use Node 22+'s built-in `node:sqlite` module (no dependency, but requires Node 22.5+)
- Rewrite `sqlite-store-repository.ts` to use one connection instead of spawning CLI
- Keep the same `readStoreCollectionsFromSqlite()` / `writeStoreCollectionsToSqlite()` interface

**Files:**
- `services/api/package.json` — add `better-sqlite3` dependency
- `services/api/src/sqlite-store-repository.ts` — rewrite all functions
- `services/api/src/sqlite-foundation.ts` — remove CLI spawn logic

**Success criteria:**
- Cold cache load drops from ~8s to <200ms
- All endpoints see ~80%+ latency reduction
- No more `spawnSync` calls for SQLite operations

### 3.2 Add SQL-level WHERE filtering for hotspot queries

**Why:** Currently the pattern is "load ALL transactions from SQLite into JS array, then filter in JS". Once we have native SQLite bindings, we can push filtering into SQL WHERE clauses, especially for `user_id`, `transaction_date`, `deleted_at`.

**What:**
- Add an indexed query method to `sqlite-store-repository.ts` that filters at the SQL level
- For the analytics hot path (`filterUserTransactions`), push the user_id + date range filter down to SQLite
- Create indexes on `transactions(user_id, transaction_date, deleted_at)` in the schema

**Files:**
- `services/api/sql/schema.sql` — add indexes
- `services/api/src/sqlite-store-repository.ts` — add `queryTransactions(filters)` 
- `services/api/src/store.ts` — add `loadFilteredTransactions(userId, filters)` that uses SQL-level filtering

**Success criteria:**
- Explorer endpoint filtered queries return in <5ms instead of scanning 3,732 JS objects

## Phase 4 — Cold-Start Optimizations (<2h)

### 4.1 Lazy-load store collections

**Why:** The current code loads ALL 18+ store collections on every cache refresh, even though a simple `/v1/users/me` only needs the `users` collection.

**What:**
- Instead of loading all collections at once, load them lazily on first access
- `loadStore()` returns a Proxy that loads individual collections on demand

**Files:**
- `services/api/src/store.ts`

**Success criteria:**
- `/v1/users/me` doesn't need to load `transactions`, `accounts`, etc. from SQLite
- Saved-views endpoint only loads `users`, `sessions`, and `savedViews` collections

## Priority & Dependencies

```
Phase 1 (Quick Wins)
  ├── 1.1 (throttle refresh) ← START HERE, no dependencies
  ├── 1.2 (remove redundant ensureSqliteReady) ← depends on 1.1
  ├── 1.3 (fix suggestions 404) ← independent
  └── 1.4 (memoize category strategy) ← depends on 1.1
Phase 2 (Analytics)
  ├── 2.1 (memoize filterUserTransactions) ← depends on 1.1
  └── 2.2 (month index) ← depends on 1.1
Phase 3 (Native SQLite) ← independent, but highest impact
  ├── 3.1 (native bindings) ← independent
  └── 3.2 (SQL-level WHERE) ← depends on 3.1
Phase 4 (Cold-start) ← depends on 3.1
  └── 4.1 (lazy load collections) ← depends on 3.1
```

## Expected Results After All Phases

| Endpoint | Before | After Phase 1 | After Phase 2 | After Phase 3 |
|----------|--------|---------------|---------------|---------------|
| saved-views (cold) | 9.88s | 8s | 8s | **~150ms** |
| explorer | 6.21s | 4s | 2s | **~300ms** |
| accounts | 4.29s | 5ms | 5ms | **~5ms** |
| categories | 2.32s | 5ms | 5ms | **~5ms** |
| suggestions (404) | 1.60s | **~10ms** (fixed route) | — | — |
| me | 1.28s | **~5ms** | — | — |

## Verification Plan

After each phase:
1. Run `just test` for backend test suite
2. Start dev server with `just dev`
3. Load the explorer page in the browser (which triggers saved-views, explorer, accounts, categories, suggestions, me)
4. Check Network tab for response times
5. Assert: every endpoint above completes in under the target time for that phase
