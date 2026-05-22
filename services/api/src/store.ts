import fs from "node:fs";
import path from "node:path";
import { DATA_FILE, SQLITE_FILE, STORE_BACKEND } from "./config.ts";
import { nowIso, createId } from "./utils.ts";
import { ensureSqliteFoundation } from "./sqlite-foundation.ts";
import {
  readStoreCollectionsFromSqlite,
  writeStoreCollectionsToSqlite,
  writeTableToSqlite,
  writeRowsToSqlite
} from "./sqlite-store-repository.ts";

import { STORE_TABLE_SPECS } from "../../../scripts/sqlite-cutover-lib.ts";

/**
 * Minimum interval (ms) between cache-staleness checks.
 * Prevents redundant SQLite mtime stat + full reload on every API request.
 * Only relevant for the SQLite backend; for JSON, the stat is cheap.
 */
const REFRESH_COOLDOWN_MS = 2_000;

const defaultStore = {
  users: [],
  sessions: [],
  accounts: [],
  transactions: [],
  recurringRules: [],
  recurringSuggestions: [],
  dismissedRecurringSuggestions: [],
  investmentHoldings: [],
  investmentSnapshots: [],
  categories: [],
  categoryStrategies: [],
  categoryRules: [],
  imports: [],
  importRowsRaw: [],
  importRowsProcessed: [],
  importRowDiagnostics: [],
  aiProviderCredentials: [],
  aiProviderPreferences: [],
  assistantQueries: [],
  savedViews: [],
  migrationRuns: [],
  auditEvents: [],
  userRecurringScanState: [],
  scanRunState: {
    is_running: false,
    last_run_at: null,
    last_run_status: null,
    last_run_duration_ms: null
  }
};

let cache = null;
let cacheFileMtimeMs = null;

/** Timestamp of the last cache-staleness check, used to throttle refreshStoreCacheIfChanged. */
let lastRefreshCheckMs = 0;

/**
 * Index: userId → active (non-deleted) transactions for that user.
 * Rebuilt whenever the store cache is loaded/reloaded, so it stays consistent
 * with the in-memory cache without needing separate invalidation.
 */
let _transactionsByUser = new Map();

let sqliteFoundationEnsured = false;

function ensureSqliteStoreOnce() {
  if (sqliteFoundationEnsured || STORE_BACKEND !== "sqlite") {
    return;
  }
  ensureSqliteFoundation({ backend: "sqlite" });
  sqliteFoundationEnsured = true;
}

function ensureDataFile() {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(defaultStore, null, 2));
  }
}

function getDataFileMtimeMs() {
  return fs.statSync(DATA_FILE).mtimeMs;
}

function getStoreFileMtimeMs(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return fs.statSync(filePath).mtimeMs;
}

function buildTransactionIndex() {
  if (!cache) return;
  const index = new Map();
  for (const txn of cache.transactions) {
    const uid = txn.user_id || txn.userId;
    if (!uid) continue;
    if (txn.deleted_at) continue;
    let list = index.get(uid);
    if (!list) {
      list = [];
      index.set(uid, list);
    }
    list.push(txn);
  }
  _transactionsByUser = index;
}

function loadJsonStoreIntoCache() {
  ensureDataFile();
  const raw = fs.readFileSync(DATA_FILE, "utf8");
  cache = normalizeStore(JSON.parse(raw));
  cacheFileMtimeMs = getDataFileMtimeMs();
  buildTransactionIndex();
  return cache;
}

function loadSqliteStoreIntoCache() {
  ensureSqliteStoreOnce();
  cache = normalizeStore(readStoreCollectionsFromSqlite());
  cacheFileMtimeMs = getStoreFileMtimeMs(SQLITE_FILE);
  buildTransactionIndex();
  return cache;
}

function writeJsonStoreFromCache() {
  const tmpPath = `${DATA_FILE}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(cache, null, 2));
  fs.renameSync(tmpPath, DATA_FILE);
  cacheFileMtimeMs = getDataFileMtimeMs();
}

function normalizeStore(store) {
  const normalized = structuredClone({ ...defaultStore, ...(store || {}) });
  for (const key of Object.keys(defaultStore)) {
    if (key === "scanRunState") {
      // Ensure scanRunState is an object, not an array
      if (!normalized[key] || typeof normalized[key] !== "object" || Array.isArray(normalized[key])) {
        normalized[key] = { ...defaultStore.scanRunState };
      } else {
        normalized[key] = {
          ...defaultStore.scanRunState,
          ...normalized[key]
        };
      }
      continue;
    }
    if (!Array.isArray(normalized[key])) {
      normalized[key] = [];
    }
  }
  return normalized;
}

export function loadStore() {
  if (cache) {
    return cache;
  }

  if (STORE_BACKEND === "sqlite") {
    return loadSqliteStoreIntoCache();
  }

  return loadJsonStoreIntoCache();
}

/**
 * Registered callbacks that fire when the in-memory cache is reloaded from
 * the backing store (file or SQLite). Used to invalidate derived caches
 * (e.g. filter result cache, category strategy) without creating circular imports.
 */
let _onCacheReloadedCallbacks = [];

/** Hook registered by analytics.ts to clear filter result cache on store reset. */
let _onStoreReset = null;

/**
 * Register a callback that fires when the in-memory cache is reloaded from
 * the backing store (file or SQLite). Used to invalidate derived caches
 * (e.g. category strategy) without creating circular imports.
 */
export function onCacheReloaded(callback) {
  _onCacheReloadedCallbacks.push(callback);
}

function notifyCacheReloadedCallbacks() {
  for (const cb of _onCacheReloadedCallbacks) {
    cb();
  }
}

/**
 * Register a callback that fires when the store is reset (e.g. between tests).
 * Used to clear derived caches that aren't invalidated by the normal
 * cache-reload path.  Avoids circular imports.
 */
export function onStoreReset(callback) {
  _onStoreReset = callback;
}

export function refreshStoreCacheIfChanged() {
  // Throttle: skip if we checked within the cooldown window.
  // This prevents every API request from stat-ing the file and potentially
  // reloading the entire store from SQLite.
  const now = Date.now();
  if (now - lastRefreshCheckMs < REFRESH_COOLDOWN_MS) {
    return false;
  }
  lastRefreshCheckMs = now;

  let changed = false;

  if (STORE_BACKEND === "sqlite") {
    if (!cache) {
      loadSqliteStoreIntoCache();
      changed = true;
    } else {
      const currentMtimeMs = getStoreFileMtimeMs(SQLITE_FILE);
      if (cacheFileMtimeMs == null || currentMtimeMs !== cacheFileMtimeMs) {
        loadSqliteStoreIntoCache();
        changed = true;
      }
    }
  } else if (STORE_BACKEND === "json") {
    if (!cache) {
      loadJsonStoreIntoCache();
      changed = true;
    } else {
      ensureDataFile();
      const currentMtimeMs = getDataFileMtimeMs();
      if (cacheFileMtimeMs == null || currentMtimeMs !== cacheFileMtimeMs) {
        loadJsonStoreIntoCache();
        changed = true;
      }
    }
  }

  if (changed) {
    notifyCacheReloadedCallbacks();
  }

  return changed;
}

export function saveStore(nextStore = null) {
  if (nextStore) {
    cache = normalizeStore(nextStore);
  }

  if (!cache) {
    cache = loadStore();
  }

  // Always rebuild the transaction index when the store is saved,
  // regardless of backend (SQLite or JSON).  Ensures getUserTransactions()
  // is consistent with the current in-memory cache.
  buildTransactionIndex();

  if (STORE_BACKEND === "sqlite") {
    ensureSqliteStoreOnce();
    writeStoreCollectionsToSqlite(cache);
    // Set to null so the next refreshStoreCacheIfChanged call always detects a change,
    // reloads the store cache, fires _onCacheReloaded, and clears _filterResultCache.
    cacheFileMtimeMs = null;
    // After a mutation, reset the cooldown so the next refresh check actually picks it up.
    lastRefreshCheckMs = 0;
    return;
  }

  writeJsonStoreFromCache();
}

/**
 * Return only the transactions belonging to `userId` (pre-filtered and cached).
 * Much faster than scanning `store.transactions` for each analytics query.
 */
export function getUserTransactions(userId) {
  if (!_transactionsByUser.size) {
    buildTransactionIndex();
  }
  return _transactionsByUser.get(userId) || [];
}

/**
 * Save only the specified SQLite tables instead of rewriting the entire database.
 * Falls back to full save for the JSON backend.
 * This is the primary optimization for hot-path writes (login, auth, etc.).
 */
export function saveStoreTables(tableNames) {
  if (!cache) {
    cache = loadStore();
  }

  if (STORE_BACKEND === "sqlite") {
    ensureSqliteStoreOnce();
    const specs = STORE_TABLE_SPECS.filter((spec) => tableNames.includes(spec.tableName));
    for (const spec of specs) {
      writeTableToSqlite(cache, spec);
    }
    // Set to null so the next refreshStoreCacheIfChanged call always detects a change,
    // reloads the store cache, fires _onCacheReloaded, and clears _filterResultCache.
    cacheFileMtimeMs = null;
    buildTransactionIndex();
    // After a mutation, reset the cooldown so the next refresh check actually picks it up.
    lastRefreshCheckMs = 0;
    return;
  }

  // JSON backend has no partial-write support; fall back to full save
  saveStore();
}

export function saveStoreRows(nextStore, rowWrites = []) {
  if (nextStore && nextStore !== cache) {
    cache = normalizeStore(nextStore);
  } else if (!cache) {
    cache = loadStore();
  }

  buildTransactionIndex();

  if (STORE_BACKEND === "sqlite") {
    ensureSqliteStoreOnce();
    writeRowsToSqlite(rowWrites);
    cacheFileMtimeMs = getStoreFileMtimeMs(SQLITE_FILE);
    lastRefreshCheckMs = Date.now();
    notifyCacheReloadedCallbacks();
    return;
  }

  saveStore(cache);
  notifyCacheReloadedCallbacks();
}

export function withStore(mutator) {
  const store = loadStore();
  const result = mutator(store);
  saveStore(store);
  return result;
}

export function resetStoreForTests(nextStore = null) {
  cache = normalizeStore(nextStore || defaultStore);
  if (_onStoreReset) {
    _onStoreReset();
  }
  saveStore(cache);
}

export function addAuditEvent(userId, action, details = {}) {
  return withStore((store) => appendAuditEventToStore(store, userId, action, details));
}

export function appendAuditEventToStore(store, userId, action, details = {}) {
  const event = {
    id: createId("audit"),
    userId,
    action,
    details,
    createdAt: nowIso()
  };
  store.auditEvents.push(event);
  return event;
}
