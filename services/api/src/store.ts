import fs from "node:fs";
import path from "node:path";
import { DATA_FILE, SQLITE_FILE, STORE_BACKEND } from "./config.ts";
import { nowIso, createId } from "./utils.ts";
import { ensureSqliteFoundation } from "./sqlite-foundation.ts";
import {
  readStoreCollectionsFromSqlite,
  writeStoreCollectionsToSqlite,
  writeTableToSqlite
} from "./sqlite-store-repository.ts";
import { STORE_TABLE_SPECS } from "../../../scripts/sqlite-cutover-lib.ts";

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

function ensureSqliteStoreReady() {
  if (STORE_BACKEND !== "sqlite") {
    return;
  }

  ensureSqliteFoundation({
    backend: "sqlite"
  });
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

function loadJsonStoreIntoCache() {
  ensureDataFile();
  const raw = fs.readFileSync(DATA_FILE, "utf8");
  cache = normalizeStore(JSON.parse(raw));
  cacheFileMtimeMs = getDataFileMtimeMs();
  return cache;
}

function loadSqliteStoreIntoCache() {
  ensureSqliteStoreReady();
  cache = normalizeStore(readStoreCollectionsFromSqlite());
  cacheFileMtimeMs = getStoreFileMtimeMs(SQLITE_FILE);
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

export function refreshStoreCacheIfChanged() {
  if (STORE_BACKEND === "sqlite") {
    if (!cache) {
      loadSqliteStoreIntoCache();
      return true;
    }

    ensureSqliteStoreReady();
    const currentMtimeMs = getStoreFileMtimeMs(SQLITE_FILE);
    if (cacheFileMtimeMs != null && currentMtimeMs === cacheFileMtimeMs) {
      return false;
    }

    loadSqliteStoreIntoCache();
    return true;
  }

  if (STORE_BACKEND !== "json") {
    return false;
  }

  if (!cache) {
    loadJsonStoreIntoCache();
    return true;
  }

  ensureDataFile();
  const currentMtimeMs = getDataFileMtimeMs();
  if (cacheFileMtimeMs != null && currentMtimeMs === cacheFileMtimeMs) {
    return false;
  }

  loadJsonStoreIntoCache();
  return true;
}

export function saveStore(nextStore = null) {
  if (nextStore) {
    cache = normalizeStore(nextStore);
  }

  if (!cache) {
    cache = loadStore();
  }

  if (STORE_BACKEND === "sqlite") {
    ensureSqliteStoreReady();
    writeStoreCollectionsToSqlite(cache);
    cacheFileMtimeMs = getStoreFileMtimeMs(SQLITE_FILE);
    return;
  }

  writeJsonStoreFromCache();
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
    ensureSqliteStoreReady();
    const specs = STORE_TABLE_SPECS.filter((spec) => tableNames.includes(spec.tableName));
    for (const spec of specs) {
      writeTableToSqlite(cache, spec);
    }
    cacheFileMtimeMs = getStoreFileMtimeMs(SQLITE_FILE);
    return;
  }

  // JSON backend has no partial-write support; fall back to full save
  saveStore();
}

export function withStore(mutator) {
  const store = loadStore();
  const result = mutator(store);
  saveStore(store);
  return result;
}

export function resetStoreForTests(nextStore = null) {
  cache = normalizeStore(nextStore || defaultStore);
  saveStore(cache);
}

export function addAuditEvent(userId, action, details = {}) {
  return withStore((store) => {
    const event = {
      id: createId("audit"),
      userId,
      action,
      details,
      createdAt: nowIso()
    };
    store.auditEvents.push(event);
    return event;
  });
}
