# Filter Result Cache Staleness After Mutations

**Date:** 2026-05-20
**Author:** pi-agent
**Files changed:** `services/api/src/store.ts`

## Summary

After any data mutation (create/update/delete transactions, accounts, categories, etc.), the server-side `_filterResultCache` in `analytics.ts` was not being invalidated, causing subsequent API requests with the same filter parameters to return stale data. This manifested as the transactions table showing records that had been deleted, or showing different counts depending on which filter parameters were used.

## Symptoms

- A user deletes (or imports) transactions, but the transactions page still shows the old data
- Different API requests with different parameter combinations return inconsistent results (e.g., `range=all` returns 186 results while the same underlying data returns 136 with slightly different params)
- The issue resolves itself eventually when the server restarts or when `refreshStoreCacheIfChanged` coincidentally detects a file mtime change from an external write

## Root Cause

The root cause involves two separate bugs in `services/api/src/store.ts`. Both had to be fixed for cache invalidation to work correctly.

### How the cache chain works

1. **Filter cache** (`_filterResultCache` in `analytics.ts`): caches the result of `filterUserTransactions()` keyed by `userId + JSON.stringify(sorted_filters)`. Max 20 entries, LRU eviction.

2. **Store cache reload trigger** (`refreshStoreCacheIfChanged` in `store.ts`): on every API request, compares the stored `cacheFileMtimeMs` against the current SQLite file mtime. If different, it reloads the entire store from SQLite and fires registered callbacks that clear the filter cache and category strategy cache.

### Bug 1: `cacheFileMtimeMs` masked the mutation

```typescript
// store.ts, saveStore() — after writing to SQLite:
writeStoreCollectionsToSqlite(cache);
cacheFileMtimeMs = getStoreFileMtimeMs(SQLITE_FILE);  // ← stores the mtime JUST SET by the write
```

On the next API request:

```typescript
// store.ts, refreshStoreCacheIfChanged():
const currentMtimeMs = getStoreFileMtimeMs(SQLITE_FILE);
if (cacheFileMtimeMs == null || currentMtimeMs !== cacheFileMtimeMs) {
    loadSqliteStoreIntoCache();   // NEVER REACHED — mtimes are equal
    changed = true;
}
```

Because `saveStore()` stored the exact mtime it just wrote, the comparison always found them equal, so the store cache was never reloaded, `_onCacheReloaded` never fired, and `_filterResultCache` was never cleared.

### Bug 2: `onCacheReloaded` was a single-callback setter

`onCacheReloaded()` was a simple setter that overwrote the previous callback:

```typescript
let _onCacheReloaded = null;

export function onCacheReloaded(callback) {
  _onCacheReloaded = callback;  // ← overwrites any previous registration
}
```

During module initialization, two different modules registered callbacks:

1. `analytics.ts` registers to clear `_filterResultCache`
2. `server.ts` registers to clear `clearCategoryStrategyCache()`

The import chain ensures `analytics.ts` registers first, then `server.ts` overwrites it. The filter cache was **never** cleared even when `refreshStoreCacheIfChanged()` detected a change.

### Sequence diagram (actual behavior)

```
Module init:
  analytics.ts → onCacheReloaded(cb1_clearFilterCache)
  server.ts    → onCacheReloaded(cb2_clearStrategyCache)  ← OVERWRITES cb1

Mutation (delete/create/update)
  → saveStore()
    → writeStoreCollectionsToSqlite(cache)
    → cacheFileMtimeMs = (broken) | null (fixed)
    → returns

Next API request
  → refreshStoreCacheIfChanged()
    → cacheFileMtimeMs mismatched → reload store from SQLite
    → fires onCacheReloaded callbacks
    → cb2 only: clears category strategy cache, but NOT filter cache ← BUG
  → filterUserTransactions()
    → hits stale _filterResultCache
    → returns deleted transactions or wrong counts
```

## Fix

### Fix 1 — `cacheFileMtimeMs = null`

Changed both `saveStore()` and `saveStoreTables()` to set `cacheFileMtimeMs = null` instead of storing the current mtime:

```typescript
// Before (broken):
writeStoreCollectionsToSqlite(cache);
cacheFileMtimeMs = getStoreFileMtimeMs(SQLITE_FILE);

// After (fixed):
writeStoreCollectionsToSqlite(cache);
cacheFileMtimeMs = null;  // forces next refreshStoreCacheIfChanged to always reload
```

### Fix 2 — Multiple callbacks

Changed `onCacheReloaded` to support multiple callbacks instead of overwriting the previous one:

```typescript
let _onCacheReloadedCallbacks = [];

export function onCacheReloaded(callback) {
  _onCacheReloadedCallbacks.push(callback);
}

// Invocation:
if (changed && _onCacheReloadedCallbacks.length) {
  for (const cb of _onCacheReloadedCallbacks) {
    cb();
  }
}
```

### Files changed

- `services/api/src/store.ts` — `onCacheReloaded()` changed from single-callback setter to multi-callback array; `saveStore()` and `saveStoreTables()` set `cacheFileMtimeMs = null`
- `services/api/src/server.ts` — fixed `serveStatic` race condition that crashed the e2e API server on root URL probe

## Testing

- All 8 transaction normalization tests pass
- All 15 analytics tests pass
- No other test regressions detected
- New e2e test (`e2e/specs/filter-cache-staleness.spec.ts`) verifies cache invalidation after create and delete

## Investigation Notes

The bug was found by noticing that the API returned inconsistent transaction counts for the same account depending on which query parameters were used:
- `?account=chase+peach+s+freedom` + implicit range → 186 results (cached before deletion)
- `?range=all&account=chase+peach+s+freedom` → 136 results (different cache key, fetched after deletion)
- `?range=90d&account=chase+peach+s+freedom` → 0 (consistent, but due to actual data not within range)

The browser page was showing stale React state from the filter cache, which persisted even across page navigations within the same SPA session. A fresh browser session (with `sessionMode: "fresh"`) eventually showed the correct data because the filter cache had been cleared by a coincidental store reload in the meantime.

### Debug trace (Bug 2 discovery)

Adding debug logging revealed that after a create mutation:
- `saveStore` wrote the transaction to SQLite and set `cacheFileMtimeMs = null` ✓
- `refreshStoreCacheIfChanged` detected the change, reloaded from SQLite, and `loadSqliteStoreIntoCache` confirmed `txn count: 1` ✓
- `onCacheReloaded` fired, but `filterResultCache` still had the old cache entry because the analytics.ts callback had been overwritten
- Request with `?range=all&limit=500` (different cache key) returned the correct count of 1, while `?range=all` returned stale 0

## Future Considerations

- The `_filterResultCache` has a max of 20 entries with LRU eviction. Under heavy load with many distinct filter combinations, entries may be evicted naturally, which would cause a fresh fetch on the next request. This masks the bug in production scenarios with diverse filter usage.
- Consider adding a dedicated `clearFilterCache()` export from `analytics.ts` that `saveStore()` can call directly, rather than relying on the indirect mtime comparison chain.
- The same pattern risk exists for any other derived caches registered via `onCacheReloaded()` — verify they all get properly invalidated after mutations.
