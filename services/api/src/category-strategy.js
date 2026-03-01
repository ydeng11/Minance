import { spawnSync } from "node:child_process";
import path from "node:path";
import { loadStore, saveStore } from "./store.js";
import { ROOT_DIR } from "./config.js";
import { createId, normalizeText, nowIso } from "./utils.js";

export const COPILOT_CATEGORY_STRATEGY_URL = "https://imgur.com/a/copilot-categorization-strategy-Ut9IGEv";
export const CATEGORY_VIEW_GRANULAR = "granular";
export const CATEGORY_VIEW_COARSE = "coarse";

const DEFAULT_COARSE_CATEGORIES = [
  { key: "essential", name: "Essential", emoji: "🟢", isExcluded: false, order: 1 },
  { key: "extra", name: "Extra", emoji: "🔴", isExcluded: false, order: 2 },
  { key: "neutral", name: "Neutral", emoji: "🟡", isExcluded: false, order: 3 },
  { key: "other", name: "Other", emoji: "⚫", isExcluded: true, order: 4 }
];

const DEFAULT_GRANULAR_CATEGORIES = [
  { name: "Groceries", emoji: "🛒", coarseKey: "essential" },
  { name: "Dining", emoji: "🍽️", coarseKey: "extra" },
  { name: "Transport", emoji: "🚇", coarseKey: "essential" },
  { name: "Auto", emoji: "🚗", coarseKey: "essential" },
  { name: "Utilities", emoji: "💡", coarseKey: "essential" },
  { name: "Housing", emoji: "🏠", coarseKey: "essential" },
  { name: "Healthcare", emoji: "🩺", coarseKey: "essential" },
  { name: "Entertainment", emoji: "🎬", coarseKey: "extra" },
  { name: "Shopping", emoji: "🛍️", coarseKey: "extra" },
  { name: "Income", emoji: "💰", coarseKey: "neutral" },
  { name: "Transfer", emoji: "🔁", coarseKey: "neutral" },
  { name: "Uncategorized", emoji: "❓", coarseKey: "other" },
  { name: "Automotive", emoji: "🚘", coarseKey: "essential" },
  { name: "Bills & Utilities", emoji: "🧾", coarseKey: "essential" },
  { name: "Credit Card Payments", emoji: "💳", coarseKey: "neutral" },
  { name: "Entertainments & Growth", emoji: "🎯", coarseKey: "extra" },
  { name: "Fashion", emoji: "👗", coarseKey: "extra" },
  { name: "Health", emoji: "🧬", coarseKey: "essential" },
  { name: "Home", emoji: "🏡", coarseKey: "essential" },
  { name: "Investment Income", emoji: "📈", coarseKey: "neutral" },
  { name: "Merchandise", emoji: "📦", coarseKey: "extra" },
  { name: "Miscellaneous", emoji: "🧩", coarseKey: "neutral" },
  { name: "Mortgage & Loan", emoji: "🏦", coarseKey: "essential" },
  { name: "Other Income", emoji: "💵", coarseKey: "neutral" },
  { name: "Pets", emoji: "🐾", coarseKey: "essential" },
  { name: "Salary", emoji: "💼", coarseKey: "neutral" },
  { name: "Subscriptions & Services", emoji: "📺", coarseKey: "extra" },
  { name: "Transfer & Withdrawl", emoji: "🔄", coarseKey: "neutral" },
  { name: "Travel", emoji: "✈️", coarseKey: "extra" }
];

const CATEGORY_ALIASES = {
  "food & drink": "Dining",
  "restaurants/dining": "Dining",
  "restaurants dining": "Dining",
  restaurants: "Dining",
  entertainment: "Entertainments & Growth",
  entertainments: "Entertainments & Growth",
  "travel/ entertainment": "Travel",
  "travel/entertainment": "Travel",
  "travel - parking": "Travel",
  "credit card payment": "Credit Card Payments",
  payments: "Credit Card Payments",
  payment: "Credit Card Payments",
  "payments and credits": "Credit Card Payments",
  "fees & adjustments": "Miscellaneous",
  fees: "Miscellaneous",
  "service charges": "Miscellaneous",
  "service charges/fees": "Miscellaneous",
  "other expenses": "Miscellaneous",
  "refunds/adjustments": "Other Income",
  reimbursement: "Other Income",
  "expense reimbursement": "Other Income",
  "tax return": "Other Income",
  transfers: "Transfer & Withdrawl",
  "transfer and withdrawal": "Transfer & Withdrawl",
  withdrawals: "Transfer & Withdrawl",
  "dues and subscriptions": "Subscriptions & Services",
  subscriptions: "Subscriptions & Services",
  "online services": "Subscriptions & Services",
  "postage and shipping": "Subscriptions & Services",
  "postage & shipping": "Subscriptions & Services",
  "home maintenance": "Home",
  "home improvement": "Home",
  "health & wellness": "Health",
  "personal care": "Health",
  personal: "Health",
  "pets/pet care": "Pets",
  "paychecks/salary": "Salary",
  automotive: "Automotive",
  gas: "Automotive",
  "uber technologies, inc": "Travel"
};

const AUTO_MERCHANT_HINT = /\b(jeep|honda|honda finance|honda financial|american honda)\b/i;

function normalizeCoarseKey(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

function normalizeCategoryName(value) {
  return String(value || "").trim();
}

function cloneCoarseCategories(categories = []) {
  return categories
    .map((entry, index) => ({
      key: normalizeCoarseKey(entry.key || entry.name || `bucket_${index + 1}`),
      name: normalizeCategoryName(entry.name || entry.key || `Category ${index + 1}`),
      emoji: String(entry.emoji || "").trim(),
      isExcluded: Boolean(entry.isExcluded),
      order: Number(entry.order || index + 1)
    }))
    .filter((entry) => entry.key && entry.name);
}

function cloneGranularCategories(categories = []) {
  return categories
    .map((entry, index) => {
      const aliases = Array.isArray(entry.aliases)
        ? entry.aliases.map((alias) => normalizeCategoryName(alias)).filter(Boolean)
        : [];
      return {
        name: normalizeCategoryName(entry.name || `Category ${index + 1}`),
        emoji: String(entry.emoji || "").trim(),
        coarseKey: normalizeCoarseKey(entry.coarseKey || "neutral"),
        aliases,
        isSystem: entry.isSystem !== false
      };
    })
    .filter((entry) => entry.name);
}

function inferFallbackCoarseKey(categoryName, options = {}) {
  const allowDefault = options.allowDefault !== false;
  const normalized = normalizeText(categoryName || "");
  if (!normalized) {
    return allowDefault ? "other" : null;
  }

  if (/\b(rent|mortgage|loan|utility|grocer|health|medical|pet|bill|auto|transport|travel)\b/.test(normalized)) {
    return "essential";
  }
  if (/\b(dining|restaurant|entertain|fashion|shop|merchandise|subscription)\b/.test(normalized)) {
    return "extra";
  }
  if (/\b(income|salary|transfer|payment|refund|investment|interest|misc)\b/.test(normalized)) {
    return "neutral";
  }
  if (/\b(other|uncategorized)\b/.test(normalized)) {
    return "other";
  }
  return allowDefault ? "neutral" : null;
}

function inferFallbackEmoji(categoryName, coarseKey) {
  const normalized = normalizeText(categoryName || "");
  if (/\b(auto|automotive)\b/.test(normalized)) {
    return "🚗";
  }
  if (/\b(grocery|market)\b/.test(normalized)) {
    return "🛒";
  }
  if (/\b(dining|restaurant|food)\b/.test(normalized)) {
    return "🍽️";
  }
  if (/\b(health|medical)\b/.test(normalized)) {
    return "🩺";
  }
  if (/\b(travel|flight|uber)\b/.test(normalized)) {
    return "✈️";
  }
  if (/\b(housing|home|mortgage|rent)\b/.test(normalized)) {
    return "🏠";
  }
  if (/\b(income|salary|investment)\b/.test(normalized)) {
    return "💰";
  }
  if (/\b(transfer|payment)\b/.test(normalized)) {
    return "🔁";
  }
  if (coarseKey === "essential") {
    return "🟢";
  }
  if (coarseKey === "extra") {
    return "🔴";
  }
  if (coarseKey === "neutral") {
    return "🟡";
  }
  return "⚫";
}

function buildDefaultGranularSet() {
  return cloneGranularCategories(
    DEFAULT_GRANULAR_CATEGORIES.map((entry) => ({
      ...entry,
      aliases: Object.entries(CATEGORY_ALIASES)
        .filter(([, mapped]) => mapped === entry.name)
        .map(([alias]) => alias),
      isSystem: true
    }))
  );
}

function ensureUserCategoriesInGranular(granularCategories, categoryNames = []) {
  const byName = new Map(granularCategories.map((entry) => [normalizeText(entry.name), entry]));

  let changed = false;
  for (const categoryName of categoryNames) {
    const normalized = normalizeText(categoryName);
    if (!normalized || byName.has(normalized)) {
      continue;
    }

    const coarseKey = inferFallbackCoarseKey(categoryName);
    const entry = {
      name: normalizeCategoryName(categoryName),
      emoji: inferFallbackEmoji(categoryName, coarseKey),
      coarseKey,
      aliases: [],
      isSystem: false
    };
    granularCategories.push(entry);
    byName.set(normalized, entry);
    changed = true;
  }

  return changed;
}

function buildLookup(strategy) {
  const coarseByKey = new Map();
  const granularByName = new Map();
  const granularByAlias = new Map();

  for (const coarse of strategy.coarseCategories || []) {
    coarseByKey.set(normalizeCoarseKey(coarse.key), coarse);
  }

  for (const granular of strategy.granularCategories || []) {
    const normalizedName = normalizeText(granular.name);
    if (!normalizedName) {
      continue;
    }
    granularByName.set(normalizedName, granular);

    for (const alias of granular.aliases || []) {
      const normalizedAlias = normalizeText(alias);
      if (!normalizedAlias) {
        continue;
      }
      granularByAlias.set(normalizedAlias, granular);
    }
  }

  return {
    coarseByKey,
    granularByName,
    granularByAlias
  };
}

function sanitizeStrategyPayload(payload = {}, fallback) {
  const coarseCategories = payload.coarseCategories
    ? cloneCoarseCategories(payload.coarseCategories)
    : cloneCoarseCategories(fallback.coarseCategories);

  const coarseKeys = new Set(coarseCategories.map((entry) => entry.key));
  const granularCategories = payload.granularCategories
    ? cloneGranularCategories(payload.granularCategories)
    : cloneGranularCategories(fallback.granularCategories);

  const normalizedGranularNames = new Set();
  const sanitizedGranular = [];
  for (const category of granularCategories) {
    const normalizedName = normalizeText(category.name);
    if (!normalizedName || normalizedGranularNames.has(normalizedName)) {
      continue;
    }

    const coarseKey = coarseKeys.has(category.coarseKey)
      ? category.coarseKey
      : inferFallbackCoarseKey(category.name);

    sanitizedGranular.push({
      ...category,
      coarseKey
    });
    normalizedGranularNames.add(normalizedName);
  }

  return {
    coarseCategories,
    granularCategories: sanitizedGranular
  };
}

function buildDefaultStrategy(userId, categoryNames = []) {
  const coarseCategories = cloneCoarseCategories(DEFAULT_COARSE_CATEGORIES);
  const granularCategories = buildDefaultGranularSet();
  ensureUserCategoriesInGranular(granularCategories, categoryNames);
  const now = nowIso();

  return {
    id: createId("cstrat"),
    userId,
    sourceUrl: COPILOT_CATEGORY_STRATEGY_URL,
    version: "copilot-v1",
    coarseCategories,
    granularCategories,
    createdAt: now,
    updatedAt: now
  };
}

function findOrCreateStrategyEntry(store, userId) {
  let strategy = store.categoryStrategies.find((entry) => entry.userId === userId);
  if (!strategy) {
    const userCategories = store.categories
      .filter((entry) => entry.userId === userId)
      .map((entry) => entry.name);
    strategy = buildDefaultStrategy(userId, userCategories);
    store.categoryStrategies.push(strategy);
    return { strategy, changed: true };
  }

  const sanitized = sanitizeStrategyPayload(strategy, strategy);
  strategy.coarseCategories = sanitized.coarseCategories;
  strategy.granularCategories = sanitized.granularCategories;
  strategy.sourceUrl = strategy.sourceUrl || COPILOT_CATEGORY_STRATEGY_URL;
  strategy.version = strategy.version || "copilot-v1";

  const userCategories = store.categories
    .filter((entry) => entry.userId === userId)
    .map((entry) => entry.name);
  const changed = ensureUserCategoriesInGranular(strategy.granularCategories, userCategories);
  if (changed) {
    strategy.updatedAt = nowIso();
  }

  return { strategy, changed };
}

export function normalizeCategoryView(value) {
  return value === CATEGORY_VIEW_COARSE ? CATEGORY_VIEW_COARSE : CATEGORY_VIEW_GRANULAR;
}

export function ensureCategoryStrategyForUser(userId) {
  const store = loadStore();
  const { strategy, changed } = findOrCreateStrategyEntry(store, userId);
  if (changed) {
    saveStore(store);
  }
  return strategy;
}

export function getCategoryStrategyForUser(userId) {
  return ensureCategoryStrategyForUser(userId);
}

export function updateCategoryStrategyForUser(userId, payload = {}) {
  const store = loadStore();
  const { strategy } = findOrCreateStrategyEntry(store, userId);
  const current = {
    coarseCategories: strategy.coarseCategories,
    granularCategories: strategy.granularCategories
  };
  const next = sanitizeStrategyPayload(payload, current);
  const userCategories = store.categories
    .filter((entry) => entry.userId === userId)
    .map((entry) => entry.name);
  ensureUserCategoriesInGranular(next.granularCategories, userCategories);

  strategy.coarseCategories = next.coarseCategories;
  strategy.granularCategories = next.granularCategories;
  strategy.sourceUrl = COPILOT_CATEGORY_STRATEGY_URL;
  strategy.version = "copilot-v1";
  strategy.updatedAt = nowIso();

  saveStore(store);
  return strategy;
}

export function ensureCategoryInStrategy(userId, categoryName, options = {}) {
  const nextCategoryName = normalizeCategoryName(categoryName);
  if (!nextCategoryName) {
    return ensureCategoryStrategyForUser(userId);
  }

  const store = loadStore();
  const { strategy } = findOrCreateStrategyEntry(store, userId);
  const normalizedCategory = normalizeText(nextCategoryName);
  const lookup = buildLookup(strategy);
  const existing = lookup.granularByName.get(normalizedCategory);
  if (existing) {
    return strategy;
  }

  const coarseKeyCandidate = normalizeCoarseKey(options.coarseKey || options.coarse_key || "");
  const coarseKey = lookup.coarseByKey.has(coarseKeyCandidate)
    ? coarseKeyCandidate
    : inferFallbackCoarseKey(nextCategoryName);

  strategy.granularCategories.push({
    name: nextCategoryName,
    emoji: String(options.emoji || "").trim() || inferFallbackEmoji(nextCategoryName, coarseKey),
    coarseKey,
    aliases: [],
    isSystem: false
  });
  strategy.updatedAt = nowIso();
  saveStore(store);
  return strategy;
}

export function createCategoryResolver(strategyInput) {
  const strategy = strategyInput || {
    coarseCategories: cloneCoarseCategories(DEFAULT_COARSE_CATEGORIES),
    granularCategories: buildDefaultGranularSet()
  };
  const lookup = buildLookup(strategy);
  const fallbackCoarse =
    lookup.coarseByKey.get("neutral")
    || lookup.coarseByKey.values().next().value
    || DEFAULT_COARSE_CATEGORIES[2];

  const fallbackOther =
    lookup.coarseByKey.get("other")
    || lookup.coarseByKey.get("neutral")
    || fallbackCoarse;

  const fallbackUncategorized = {
    name: "Uncategorized",
    emoji: "❓",
    coarseKey: fallbackOther.key
  };

  return function resolveCategory(input = {}) {
    const text = normalizeText(
      `${input.categoryFinal || ""} ${input.categoryRaw || ""} ${input.merchantNormalized || ""} ${input.merchantRaw || ""} ${input.description || ""} ${input.memo || ""}`
    );
    const hasAutoHint = AUTO_MERCHANT_HINT.test(text);
    const normalizedCategory = normalizeText(input.categoryFinal || "");
    const normalizedRaw = normalizeText(input.categoryRaw || "");

    let granular = null;
    if (hasAutoHint) {
      granular = lookup.granularByName.get("auto") || null;
    }

    if (!granular && normalizedCategory) {
      granular = lookup.granularByName.get(normalizedCategory) || lookup.granularByAlias.get(normalizedCategory) || null;
    }

    if (!granular && normalizedRaw) {
      granular = lookup.granularByName.get(normalizedRaw) || lookup.granularByAlias.get(normalizedRaw) || null;
    }

    if (!granular && normalizedCategory && CATEGORY_ALIASES[normalizedCategory]) {
      const aliasTarget = normalizeText(CATEGORY_ALIASES[normalizedCategory]);
      granular = lookup.granularByName.get(aliasTarget) || null;
    }

    if (!granular && normalizedRaw && CATEGORY_ALIASES[normalizedRaw]) {
      const aliasTarget = normalizeText(CATEGORY_ALIASES[normalizedRaw]);
      granular = lookup.granularByName.get(aliasTarget) || null;
    }

    if (!granular && normalizeText(input.categoryFinal || "") === "automotive" && hasAutoHint) {
      granular = lookup.granularByName.get("auto") || null;
    }

    if (!granular && input.categoryFinal) {
      const coarseKey = inferFallbackCoarseKey(input.categoryFinal);
      granular = {
        name: normalizeCategoryName(input.categoryFinal),
        emoji: inferFallbackEmoji(input.categoryFinal, coarseKey),
        coarseKey
      };
    }

    if (!granular) {
      granular = fallbackUncategorized;
    }

    const coarse =
      lookup.coarseByKey.get(normalizeCoarseKey(granular.coarseKey))
      || lookup.coarseByKey.get(inferFallbackCoarseKey(granular.name))
      || fallbackCoarse;

    return {
      categoryGranular: granular.name,
      categoryCoarse: coarse.name,
      categoryCoarseKey: coarse.key,
      categoryEmoji: String(granular.emoji || ""),
      categoryCoarseEmoji: String(coarse.emoji || ""),
      categoryExcluded: Boolean(coarse.isExcluded)
    };
  };
}

export function resolveCategoryForUser(userId, input = {}) {
  const strategy = ensureCategoryStrategyForUser(userId);
  const resolve = createCategoryResolver(strategy);
  return resolve(input);
}

function sqliteJsonQuery(dbPath, sql) {
  const result = spawnSync("sqlite3", ["-json", dbPath, sql], {
    encoding: "utf8"
  });
  if (result.status !== 0 || result.error) {
    return [];
  }

  const raw = String(result.stdout || "").trim();
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function checkStrategyCoverageAgainstBackupDb(dbPath = path.join(ROOT_DIR, "backup_2026-02-26_00-00-03.db")) {
  const strategy = {
    coarseCategories: cloneCoarseCategories(DEFAULT_COARSE_CATEGORIES),
    granularCategories: buildDefaultGranularSet()
  };
  const lookup = buildLookup(strategy);

  const canonicalRows = sqliteJsonQuery(
    dbPath,
    "SELECT category FROM minance_category WHERE category IS NOT NULL AND category <> '';"
  );
  const transactionRows = sqliteJsonQuery(
    dbPath,
    `
      SELECT DISTINCT
        t.category AS raw_category,
        mc.category AS mapped_category
      FROM transactions t
      LEFT JOIN raw_category_to_minance_category rc
        ON rc.raw_category = t.category
      LEFT JOIN minance_category mc
        ON mc.m_category_id = rc.minance_category_id
      WHERE t.category IS NOT NULL
        AND t.category <> '';
    `
  );

  const isCovered = (value) => {
    const normalized = normalizeText(value);
    if (!normalized) {
      return false;
    }
    if (lookup.granularByName.has(normalized) || lookup.granularByAlias.has(normalized)) {
      return true;
    }
    if (CATEGORY_ALIASES[normalized]) {
      return true;
    }
    return Boolean(inferFallbackCoarseKey(value, { allowDefault: false }));
  };

  const missingCanonicalCategories = canonicalRows
    .map((entry) => String(entry.category || "").trim())
    .filter((value) => value && !isCovered(value));

  const missingTransactionCategories = transactionRows
    .map((entry) => ({
      rawCategory: String(entry.raw_category || "").trim(),
      mappedCategory: String(entry.mapped_category || "").trim()
    }))
    .filter((entry) => entry.rawCategory)
    .filter((entry) => {
      if (entry.mappedCategory) {
        return !isCovered(entry.mappedCategory);
      }
      return !isCovered(entry.rawCategory);
    })
    .map((entry) => entry.rawCategory);

  return {
    dbPath,
    canonicalCategoryCount: canonicalRows.length,
    transactionDistinctCategoryCount: transactionRows.length,
    missingCanonicalCategories,
    missingTransactionCategories
  };
}
