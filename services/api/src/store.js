import fs from "node:fs";
import path from "node:path";
import { DATA_FILE } from "./config.js";
import { DEFAULT_CATEGORIES } from "../../../packages/domain/src/constants.js";
import { nowIso, createId } from "./utils.js";

const defaultStore = {
  users: [],
  sessions: [],
  accounts: [],
  transactions: [],
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
  auditEvents: []
};

let cache = null;

function ensureDataFile() {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(defaultStore, null, 2));
  }
}

function normalizeStore(store) {
  const normalized = { ...defaultStore, ...(store || {}) };
  for (const key of Object.keys(defaultStore)) {
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

  ensureDataFile();
  const raw = fs.readFileSync(DATA_FILE, "utf8");
  cache = normalizeStore(JSON.parse(raw));
  return cache;
}

export function saveStore(nextStore = null) {
  if (nextStore) {
    cache = normalizeStore(nextStore);
  }

  if (!cache) {
    cache = loadStore();
  }

  fs.writeFileSync(DATA_FILE, JSON.stringify(cache, null, 2));
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

export function ensureDefaultCategoriesForUser(userId) {
  return withStore((store) => {
    const existing = store.categories.filter((entry) => entry.userId === userId);
    if (existing.length > 0) {
      return existing;
    }

    const createdAt = nowIso();
    const seeded = DEFAULT_CATEGORIES.map((name) => ({
      id: createId("cat"),
      userId,
      name,
      isSystem: true,
      createdAt,
      updatedAt: createdAt
    }));

    store.categories.push(...seeded);

    return seeded;
  });
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
