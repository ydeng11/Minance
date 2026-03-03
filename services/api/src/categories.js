import { loadStore, saveStore, addAuditEvent } from "./store.js";
import { createId, nowIso, normalizeText, toDecimal } from "./utils.js";
import { ensureCategoryInStrategy, getCategoryStrategyForUser } from "./category-strategy.js";

const CATEGORY_TYPE_VALUES = new Set(["expense", "income", "transfer"]);
const CATEGORY_BUDGET_CADENCE_VALUES = new Set(["weekly", "monthly", "yearly"]);
const DEFAULT_BUDGET_CADENCE = "monthly";
const DEFAULT_BUDGET_CURRENCY = "USD";

function hasAnyField(payload, fields) {
  if (!payload || typeof payload !== "object") {
    return false;
  }
  return fields.some((field) => Object.hasOwn(payload, field));
}

function normalizeCoarseKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_");
}

function getCoarseKeySet(strategy) {
  return new Set((strategy?.coarseCategories || []).map((entry) => normalizeCoarseKey(entry.key)));
}

function normalizeCategoryName(value) {
  const name = String(value || "").trim();
  if (name.length < 2) {
    throw new Error("Category name is required");
  }
  return name;
}

function normalizeCategoryType(value, fallbackValue = null) {
  const raw = value == null ? fallbackValue : value;
  if (raw == null || raw === "") {
    return null;
  }
  const normalized = String(raw).trim().toLowerCase();
  if (!CATEGORY_TYPE_VALUES.has(normalized)) {
    throw new Error("Invalid category type");
  }
  return normalized;
}

function parseBooleanField(rawValue, fieldLabel) {
  if (typeof rawValue === "boolean") {
    return rawValue;
  }

  const normalized = String(rawValue ?? "").trim().toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on") {
    return true;
  }
  if (normalized === "false" || normalized === "0" || normalized === "no" || normalized === "off") {
    return false;
  }
  throw new Error(`Invalid ${fieldLabel}`);
}

function normalizeBudgetCurrency(rawValue, fallbackValue = DEFAULT_BUDGET_CURRENCY) {
  const normalized = String(rawValue || fallbackValue).trim().toUpperCase() || fallbackValue;
  if (!/^[A-Z]{3}$/.test(normalized)) {
    throw new Error("Invalid category budget currency");
  }
  return normalized;
}

function normalizeBudgetCadence(rawValue, fallbackValue = DEFAULT_BUDGET_CADENCE) {
  const normalized = String(rawValue || fallbackValue).trim().toLowerCase() || fallbackValue;
  if (!CATEGORY_BUDGET_CADENCE_VALUES.has(normalized)) {
    throw new Error("Invalid category budget cadence");
  }
  return normalized;
}

function normalizeBudgetAmount(rawValue) {
  const amount = toDecimal(rawValue);
  if (amount == null || amount < 0) {
    throw new Error("Invalid category budget amount");
  }
  return amount;
}

function normalizeStoredBudget(rawBudget) {
  if (!rawBudget || typeof rawBudget !== "object") {
    return null;
  }

  const amount = toDecimal(rawBudget.amount);
  if (amount == null || amount < 0) {
    return null;
  }

  let cadence = DEFAULT_BUDGET_CADENCE;
  const cadenceCandidate = String(rawBudget.cadence || "").trim().toLowerCase();
  if (CATEGORY_BUDGET_CADENCE_VALUES.has(cadenceCandidate)) {
    cadence = cadenceCandidate;
  }

  let currency = DEFAULT_BUDGET_CURRENCY;
  const currencyCandidate = String(rawBudget.currency || "").trim().toUpperCase();
  if (/^[A-Z]{3}$/.test(currencyCandidate)) {
    currency = currencyCandidate;
  }

  return {
    amount,
    cadence,
    currency,
    rollover: Boolean(rawBudget.rollover)
  };
}

function normalizeCategoryBudget(payload = {}, fallbackBudget = null) {
  const budgetPayload = payload.budget && typeof payload.budget === "object" ? payload.budget : null;
  const hasBudgetFields = Boolean(budgetPayload) || hasAnyField(payload, [
    "budgetAmount",
    "budget_amount",
    "monthlyBudget",
    "monthly_budget",
    "budgetCadence",
    "budget_cadence",
    "budgetPeriod",
    "budget_period",
    "budgetCurrency",
    "budget_currency",
    "budgetRollover",
    "budget_rollover",
    "budgetEnabled",
    "budget_enabled"
  ]);

  if (Object.hasOwn(payload, "budget") && payload.budget == null) {
    return null;
  }

  if (hasAnyField(payload, ["budgetEnabled", "budget_enabled"])) {
    const enabled = parseBooleanField(payload.budgetEnabled ?? payload.budget_enabled, "category budget enabled flag");
    if (!enabled) {
      return null;
    }
  }

  if (!hasBudgetFields) {
    return normalizeStoredBudget(fallbackBudget);
  }

  const amountValue = budgetPayload?.amount
    ?? budgetPayload?.budgetAmount
    ?? payload.budgetAmount
    ?? payload.budget_amount
    ?? payload.monthlyBudget
    ?? payload.monthly_budget
    ?? fallbackBudget?.amount;
  const amount = normalizeBudgetAmount(amountValue);

  const cadence = normalizeBudgetCadence(
    budgetPayload?.cadence
      ?? budgetPayload?.period
      ?? payload.budgetCadence
      ?? payload.budget_cadence
      ?? payload.budgetPeriod
      ?? payload.budget_period,
    fallbackBudget?.cadence || DEFAULT_BUDGET_CADENCE
  );

  const currency = normalizeBudgetCurrency(
    budgetPayload?.currency
      ?? payload.budgetCurrency
      ?? payload.budget_currency,
    fallbackBudget?.currency || DEFAULT_BUDGET_CURRENCY
  );

  const rollover = budgetPayload?.rollover ?? payload.budgetRollover ?? payload.budget_rollover;
  return {
    amount,
    cadence,
    currency,
    rollover: rollover == null
      ? Boolean(fallbackBudget?.rollover)
      : parseBooleanField(rollover, "category budget rollover")
  };
}

function resolveCategoryCoarseKey(rawValue, coarseKeySet, categoryType, fallback = null) {
  const normalizedRaw = normalizeCoarseKey(rawValue);
  if (normalizedRaw) {
    if (!coarseKeySet.has(normalizedRaw)) {
      throw new Error("Invalid category group");
    }
    return normalizedRaw;
  }

  const normalizedFallback = normalizeCoarseKey(fallback);
  if (normalizedFallback && coarseKeySet.has(normalizedFallback)) {
    return normalizedFallback;
  }

  if ((categoryType === "income" || categoryType === "transfer") && coarseKeySet.has("neutral")) {
    return "neutral";
  }

  if (coarseKeySet.has("neutral")) {
    return "neutral";
  }

  const firstKey = coarseKeySet.values().next().value;
  return firstKey || "neutral";
}

function validateCategoryGroupTypeCompatibility(coarseKey, categoryType) {
  if (!categoryType) {
    return;
  }

  if ((categoryType === "income" || categoryType === "transfer") && (coarseKey === "essential" || coarseKey === "extra")) {
    throw new Error("Invalid category type for selected group");
  }
}

function findStrategyCategory(strategy, categoryName) {
  const normalized = normalizeText(categoryName);
  if (!normalized) {
    return null;
  }
  return (strategy?.granularCategories || []).find((entry) => normalizeText(entry.name) === normalized) || null;
}

function ensureUniqueCategoryName(store, userId, categoryName, excludeId = null) {
  const normalized = normalizeText(categoryName);
  const duplicate = store.categories.find(
    (entry) => entry.userId === userId && normalizeText(entry.name) === normalized && entry.id !== excludeId
  );
  if (duplicate) {
    throw new Error("Invalid category name already exists");
  }
}

function toCategoryResponse(category, strategyByName = new Map()) {
  const strategyMatch = strategyByName.get(normalizeText(category.name));
  const budget = normalizeStoredBudget(category.budget);
  return {
    ...category,
    emoji: String(category.emoji || strategyMatch?.emoji || "").trim(),
    coarseKey: normalizeCoarseKey(category.coarseKey || strategyMatch?.coarseKey || "neutral"),
    type: category.type || null,
    budget
  };
}

function normalizeStrategyByName(strategy) {
  return new Map((strategy?.granularCategories || []).map((entry) => [normalizeText(entry.name), entry]));
}

function updateCategoryInStrategyStore(store, userId, previousName, nextCategory) {
  const strategy = store.categoryStrategies.find((entry) => entry.userId === userId);
  if (!strategy || !Array.isArray(strategy.granularCategories)) {
    return;
  }

  const previousNormalized = normalizeText(previousName || nextCategory.name);
  let changed = false;
  let matched = false;

  strategy.granularCategories = strategy.granularCategories.map((entry) => {
    if (normalizeText(entry.name) !== previousNormalized) {
      return entry;
    }

    matched = true;
    if (entry.isSystem && normalizeText(entry.name) !== normalizeText(nextCategory.name)) {
      return entry;
    }

    changed = true;
    return {
      ...entry,
      name: nextCategory.name,
      emoji: nextCategory.emoji || entry.emoji || "",
      coarseKey: nextCategory.coarseKey || entry.coarseKey || "neutral"
    };
  });

  if (!matched) {
    strategy.granularCategories.push({
      name: nextCategory.name,
      emoji: nextCategory.emoji || "",
      coarseKey: nextCategory.coarseKey || "neutral",
      aliases: [],
      isSystem: false
    });
    changed = true;
  }

  if (changed) {
    strategy.updatedAt = nowIso();
  }
}

function removeCategoryFromStrategyStore(store, userId, categoryName) {
  const strategy = store.categoryStrategies.find((entry) => entry.userId === userId);
  if (!strategy || !Array.isArray(strategy.granularCategories)) {
    return;
  }

  const normalized = normalizeText(categoryName);
  const before = strategy.granularCategories.length;
  strategy.granularCategories = strategy.granularCategories.filter(
    (entry) => normalizeText(entry.name) !== normalized || entry.isSystem
  );
  if (strategy.granularCategories.length !== before) {
    strategy.updatedAt = nowIso();
  }
}

function reassignCategoryReferences(store, userId, previousName, nextName, updatedAt) {
  const previousNormalized = normalizeText(previousName);
  if (!previousNormalized || previousNormalized === normalizeText(nextName)) {
    return;
  }

  for (const transaction of store.transactions) {
    if (transaction.user_id !== userId) {
      continue;
    }
    if (normalizeText(transaction.category_final) !== previousNormalized) {
      continue;
    }
    transaction.category_final = nextName;
    transaction.updated_at = updatedAt;
  }

  for (const rule of store.categoryRules) {
    if (rule.userId !== userId) {
      continue;
    }
    if (normalizeText(rule.category) !== previousNormalized) {
      continue;
    }
    rule.category = nextName;
    rule.updatedAt = updatedAt;
  }
}

export function listCategories(userId) {
  const strategy = getCategoryStrategyForUser(userId);
  const strategyByName = normalizeStrategyByName(strategy);
  const store = loadStore();
  return store.categories
    .filter((entry) => entry.userId === userId)
    .map((entry) => toCategoryResponse(entry, strategyByName))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function createCategory(userId, payload = {}) {
  const strategy = getCategoryStrategyForUser(userId);
  const coarseKeySet = getCoarseKeySet(strategy);

  const name = normalizeCategoryName(payload.name);
  const type = normalizeCategoryType(payload.type ?? payload.categoryType ?? payload.category_type);
  const coarseKey = resolveCategoryCoarseKey(
    payload.coarseKey ?? payload.coarse_key ?? payload.group,
    coarseKeySet,
    type
  );
  const budget = normalizeCategoryBudget(payload);
  validateCategoryGroupTypeCompatibility(coarseKey, type);

  const store = loadStore();
  ensureUniqueCategoryName(store, userId, name);

  const category = {
    id: createId("cat"),
    userId,
    name,
    emoji: String(payload.emoji || "").trim(),
    coarseKey,
    type,
    budget,
    isSystem: false,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };

  store.categories.push(category);
  saveStore(store);

  ensureCategoryInStrategy(userId, category.name, {
    emoji: category.emoji,
    coarseKey: category.coarseKey
  });
  addAuditEvent(userId, "category.create", { categoryId: category.id });

  const latestStrategy = getCategoryStrategyForUser(userId);
  return toCategoryResponse(category, normalizeStrategyByName(latestStrategy));
}

export function updateCategory(userId, categoryId, payload = {}) {
  const strategy = getCategoryStrategyForUser(userId);
  const coarseKeySet = getCoarseKeySet(strategy);
  const store = loadStore();
  const category = store.categories.find((entry) => entry.id === categoryId && entry.userId === userId);
  if (!category) {
    throw new Error("Category not found");
  }

  const nextName = Object.hasOwn(payload, "name")
    ? normalizeCategoryName(payload.name)
    : category.name;
  const nextType = normalizeCategoryType(
    payload.type ?? payload.categoryType ?? payload.category_type,
    category.type || null
  );
  const strategyMatch = findStrategyCategory(strategy, category.name);
  const nextCoarseKey = resolveCategoryCoarseKey(
    payload.coarseKey ?? payload.coarse_key ?? payload.group,
    coarseKeySet,
    nextType,
    category.coarseKey || strategyMatch?.coarseKey || null
  );
  validateCategoryGroupTypeCompatibility(nextCoarseKey, nextType);
  const nextBudget = normalizeCategoryBudget(payload, category.budget || null);

  ensureUniqueCategoryName(store, userId, nextName, category.id);

  const nextEmoji = Object.hasOwn(payload, "emoji")
    ? String(payload.emoji || "").trim()
    : String(category.emoji || strategyMatch?.emoji || "").trim();
  const timestamp = nowIso();
  const previousName = category.name;

  category.name = nextName;
  category.emoji = nextEmoji;
  category.coarseKey = nextCoarseKey;
  category.type = nextType;
  category.budget = nextBudget;
  category.updatedAt = timestamp;

  reassignCategoryReferences(store, userId, previousName, nextName, timestamp);
  updateCategoryInStrategyStore(store, userId, previousName, category);

  saveStore(store);
  ensureCategoryInStrategy(userId, category.name, {
    emoji: category.emoji,
    coarseKey: category.coarseKey
  });
  addAuditEvent(userId, "category.update", { categoryId: category.id });

  const latestStrategy = getCategoryStrategyForUser(userId);
  return toCategoryResponse(category, normalizeStrategyByName(latestStrategy));
}

export function deleteCategory(userId, categoryId) {
  const store = loadStore();
  const index = store.categories.findIndex((entry) => entry.id === categoryId && entry.userId === userId);
  if (index < 0) {
    throw new Error("Category not found");
  }

  const category = store.categories[index];
  if (category.isSystem) {
    throw new Error("Invalid system category cannot be deleted");
  }

  const normalizedName = normalizeText(category.name);
  const transactionReferenceCount = store.transactions.filter(
    (entry) =>
      entry.user_id === userId
      && !entry.deleted_at
      && normalizeText(entry.category_final) === normalizedName
  ).length;
  if (transactionReferenceCount > 0) {
    throw new Error("Invalid category is referenced by existing transactions");
  }

  const ruleReferenceCount = store.categoryRules.filter(
    (entry) =>
      entry.userId === userId
      && normalizeText(entry.category) === normalizedName
  ).length;
  if (ruleReferenceCount > 0) {
    throw new Error("Invalid category is referenced by existing category rules");
  }

  store.categories.splice(index, 1);
  removeCategoryFromStrategyStore(store, userId, category.name);
  saveStore(store);
  addAuditEvent(userId, "category.delete", { categoryId: category.id });

  return true;
}
