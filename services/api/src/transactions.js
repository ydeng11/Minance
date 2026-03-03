import { loadStore, saveStore, addAuditEvent } from "./store.js";
import { parseDate, toDecimal, nowIso, createId, normalizeText, stableHash } from "./utils.js";
import { normalizeMerchant } from "./categorization.js";
import { filterUserTransactions, getUserDataBounds, buildAppliedRange } from "./analytics.js";
import { createCategoryResolver, ensureCategoryStrategyForUser } from "./category-strategy.js";

const TRANSACTION_TYPE_VALUES = new Set(["expense", "income", "transfer"]);
const TRANSACTION_TYPE_ALIASES = new Map(
  Object.entries({
    expense: "expense",
    spending: "expense",
    debit: "expense",
    income: "income",
    credit: "income",
    transfer: "transfer",
    internal_transfer: "transfer"
  })
);
const REVIEW_STATUS_VALUES = new Set(["reviewed", "needs_review"]);
const CATEGORY_VALUE_MAX_LENGTH = 120;
const TAG_MAX_LENGTH = 40;
const TAG_MAX_COUNT = 25;
const RECURRING_RULE_ID_MAX_LENGTH = 128;

function isSoftDeleted(transaction) {
  return Boolean(transaction?.deleted_at);
}

function hasOwnField(payload, key) {
  return Boolean(payload && typeof payload === "object" && Object.hasOwn(payload, key));
}

function pickFirstDefined(payload, keys = []) {
  for (const key of keys) {
    if (hasOwnField(payload, key)) {
      return payload[key];
    }
  }
  return undefined;
}

function ensureAccount(store, userId, accountId, accountName) {
  if (accountId) {
    const existingById = store.accounts.find((entry) => entry.id === accountId && entry.userId === userId);
    if (existingById) {
      return existingById;
    }
  }

  const resolvedName = String(accountName || "Manual Account").trim() || "Manual Account";
  const key = normalizeText(resolvedName);
  let existing = store.accounts.find((entry) => entry.userId === userId && entry.normalizedKey === key);
  if (!existing) {
    existing = {
      id: createId("acct"),
      userId,
      normalizedKey: key,
      displayName: resolvedName,
      sourceInstitution: null,
      accountType: "checking",
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    store.accounts.push(existing);
  }
  return existing;
}

function deriveDirection(rawDirection, rawAmount) {
  const direction = String(rawDirection || "").toLowerCase();
  if (direction === "debit" || direction === "credit") {
    return direction;
  }
  return rawAmount < 0 ? "debit" : "credit";
}

function dedupeFingerprint(userId, accountKey, merchantNormalized, amount, transactionDate, memo) {
  return stableHash(
    [
      userId,
      accountKey,
      merchantNormalized,
      Math.abs(amount).toFixed(2),
      transactionDate,
      memo ? stableHash(String(memo)) : ""
    ].join("|")
  );
}

function resolveTransactionCategory(resolveCategory, transaction) {
  return resolveCategory({
    categoryFinal: transaction.category_final,
    categoryRaw: transaction.category_raw,
    merchantNormalized: transaction.merchant_normalized,
    merchantRaw: transaction.merchant_raw,
    description: transaction.description,
    memo: transaction.memo
  });
}

function findUserCategoryByName(store, userId, categoryName) {
  if (!store || !userId || !categoryName) {
    return null;
  }
  const normalized = normalizeText(categoryName);
  if (!normalized) {
    return null;
  }
  return (
    store.categories.find(
      (entry) => entry.userId === userId && normalizeText(entry.name) === normalized
    ) || null
  );
}

function inferTransactionType(direction, categoryFinal, categoryType = null) {
  if (categoryType && TRANSACTION_TYPE_VALUES.has(categoryType)) {
    return categoryType;
  }
  if (normalizeText(categoryFinal) === "transfer") {
    return "transfer";
  }
  return direction === "credit" ? "income" : "expense";
}

function normalizeTransactionType(rawValue, direction, categoryFinal, categoryType = null) {
  if (rawValue == null || String(rawValue).trim() === "") {
    return inferTransactionType(direction, categoryFinal, categoryType);
  }

  const normalized = normalizeText(rawValue).replace(/\s+/g, "_");
  const transactionType = TRANSACTION_TYPE_ALIASES.get(normalized);
  if (!transactionType) {
    throw new Error("Invalid transaction type");
  }

  if (transactionType === "expense" && direction === "credit") {
    throw new Error("Invalid transaction type for credit direction");
  }
  if (transactionType === "income" && direction === "debit") {
    throw new Error("Invalid transaction type for debit direction");
  }
  if (normalizeText(categoryFinal) === "transfer" && transactionType !== "transfer") {
    throw new Error("Invalid transaction type for transfer category");
  }
  if (categoryType && TRANSACTION_TYPE_VALUES.has(categoryType) && transactionType !== categoryType) {
    throw new Error("Invalid transaction type for selected category");
  }

  return transactionType;
}

function normalizeCategoryConfidence(rawValue, fallback = 1) {
  if (rawValue === undefined || rawValue === null || rawValue === "") {
    return Number(fallback ?? 1);
  }

  const value = Number(rawValue);
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error("Invalid category confidence");
  }
  return value;
}

function normalizeTagValue(rawTag) {
  if (typeof rawTag !== "string") {
    throw new Error("Invalid tags");
  }

  const value = rawTag.trim().toLowerCase();
  if (!value || value.length > TAG_MAX_LENGTH) {
    throw new Error("Invalid tags");
  }
  if (!/^[a-z0-9]+(?:[ _-][a-z0-9]+)*$/.test(value)) {
    throw new Error("Invalid tags");
  }

  return value;
}

function normalizeExistingTags(rawTags) {
  if (!Array.isArray(rawTags)) {
    return [];
  }

  const out = [];
  const seen = new Set();
  for (const rawTag of rawTags) {
    if (typeof rawTag !== "string") {
      continue;
    }

    const value = rawTag.trim().toLowerCase();
    if (!value || value.length > TAG_MAX_LENGTH) {
      continue;
    }
    if (!/^[a-z0-9]+(?:[ _-][a-z0-9]+)*$/.test(value)) {
      continue;
    }

    if (!seen.has(value)) {
      seen.add(value);
      out.push(value);
      if (out.length >= TAG_MAX_COUNT) {
        break;
      }
    }
  }

  return out;
}

function normalizeTags(rawTags, fallback = []) {
  if (rawTags === undefined) {
    return normalizeExistingTags(fallback);
  }
  if (rawTags === null) {
    return [];
  }
  if (!Array.isArray(rawTags) || rawTags.length > TAG_MAX_COUNT) {
    throw new Error("Invalid tags");
  }

  const tags = [];
  const seen = new Set();
  for (const rawTag of rawTags) {
    const tag = normalizeTagValue(rawTag);
    if (!seen.has(tag)) {
      seen.add(tag);
      tags.push(tag);
    }
  }

  return tags;
}

function normalizeReviewState(payload, fallbackNeedsReview = false) {
  const hasNeedsCategoryReview = hasOwnField(payload, "needs_category_review");
  const hasReviewStatus = hasOwnField(payload, "review_status");

  let resolvedNeedsReview = null;

  if (hasNeedsCategoryReview) {
    if (typeof payload.needs_category_review !== "boolean") {
      throw new Error("Invalid review flag");
    }
    resolvedNeedsReview = payload.needs_category_review;
  }

  if (hasReviewStatus) {
    const status = String(payload.review_status || "").trim().toLowerCase();
    if (!REVIEW_STATUS_VALUES.has(status)) {
      throw new Error("Invalid review status");
    }
    const statusNeedsReview = status === "needs_review";
    if (resolvedNeedsReview != null && resolvedNeedsReview !== statusNeedsReview) {
      throw new Error("Invalid review state conflict");
    }
    resolvedNeedsReview = statusNeedsReview;
  }

  if (resolvedNeedsReview == null) {
    resolvedNeedsReview = Boolean(fallbackNeedsReview);
  }

  return {
    needs_category_review: resolvedNeedsReview,
    review_status: resolvedNeedsReview ? "needs_review" : "reviewed"
  };
}

function normalizeExistingReviewState(transaction) {
  const status = String(transaction?.review_status || "").trim().toLowerCase();
  if (REVIEW_STATUS_VALUES.has(status)) {
    const needsReview = status === "needs_review";
    return {
      needs_category_review: needsReview,
      review_status: status
    };
  }

  const needsReview = Boolean(transaction?.needs_category_review);
  return {
    needs_category_review: needsReview,
    review_status: needsReview ? "needs_review" : "reviewed"
  };
}

function normalizeExistingRecurringRuleId(rawValue) {
  if (rawValue == null) {
    return null;
  }
  const value = String(rawValue).trim();
  if (!value || value.length > RECURRING_RULE_ID_MAX_LENGTH) {
    return null;
  }
  if (!/^[A-Za-z0-9._:-]+$/.test(value)) {
    return null;
  }
  return value;
}

function normalizeRecurringRuleId(rawValue, fallback = null) {
  if (rawValue === undefined) {
    return normalizeExistingRecurringRuleId(fallback);
  }
  if (rawValue == null) {
    return null;
  }

  const value = String(rawValue).trim();
  if (!value) {
    return null;
  }
  if (value.length > RECURRING_RULE_ID_MAX_LENGTH || !/^[A-Za-z0-9._:-]+$/.test(value)) {
    throw new Error("Invalid recurring rule id");
  }

  return value;
}

function normalizeTransactionRecord(transaction) {
  const direction = transaction?.direction === "credit" ? "credit" : "debit";
  const categoryFinal = String(
    transaction?.category_final || (direction === "credit" ? "Income" : "Uncategorized")
  ).trim() || (direction === "credit" ? "Income" : "Uncategorized");

  let transactionType;
  try {
    transactionType = normalizeTransactionType(transaction?.transaction_type, direction, categoryFinal, null);
  } catch {
    transactionType = inferTransactionType(direction, categoryFinal);
  }

  const reviewState = normalizeExistingReviewState(transaction);

  return {
    ...transaction,
    direction,
    category_final: categoryFinal,
    transaction_type: transactionType,
    tags: normalizeExistingTags(transaction?.tags),
    needs_category_review: reviewState.needs_category_review,
    review_status: reviewState.review_status,
    recurring_rule_id: normalizeExistingRecurringRuleId(transaction?.recurring_rule_id)
  };
}

function normalizeManualInput(input, options = {}) {
  const {
    store = null,
    userId = null,
    enforceCategoryConstraint = false
  } = options;

  const transactionDate = parseDate(input.transaction_date);
  const rawAmount = toDecimal(input.amount);
  const description = String(input.description || input.merchant_raw || "").trim();
  const merchantRaw = String(input.merchant_raw || description).trim();

  if (!transactionDate) {
    throw new Error("transaction_date is required");
  }
  if (rawAmount === null) {
    throw new Error("amount must be numeric");
  }
  if (!description) {
    throw new Error("description is required");
  }

  const direction = deriveDirection(input.direction, rawAmount);
  const amount = Math.abs(rawAmount);
  const merchantNormalized = normalizeMerchant(merchantRaw);

  const currency = String(input.currency || "USD").trim().toUpperCase() || "USD";
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error("Invalid currency code");
  }

  const categoryRaw = input.category_raw == null ? null : String(input.category_raw).trim();
  if (categoryRaw && categoryRaw.length > CATEGORY_VALUE_MAX_LENGTH) {
    throw new Error("Invalid category value");
  }

  let categoryFinal = String(input.category_final || (direction === "credit" ? "Income" : "Uncategorized")).trim();
  if (!categoryFinal) {
    throw new Error("category_final is required");
  }
  if (categoryFinal.length > CATEGORY_VALUE_MAX_LENGTH) {
    throw new Error("Invalid category value");
  }

  if (enforceCategoryConstraint) {
    const category = findUserCategoryByName(store, userId, categoryFinal);
    if (!category) {
      throw new Error("Invalid category");
    }
    categoryFinal = category.name;
  }

  const memo = input.memo == null ? null : String(input.memo).trim();

  return {
    transaction_date: transactionDate,
    post_date: parseDate(input.post_date),
    description,
    merchant_raw: merchantRaw,
    merchant_normalized: merchantNormalized,
    amount,
    currency,
    direction,
    category_raw: categoryRaw,
    category_final: categoryFinal,
    category_confidence: normalizeCategoryConfidence(input.category_confidence, 1),
    memo: memo || null
  };
}

function resolveManualContractFields(
  store,
  userId,
  payload,
  normalizedInput,
  fallbackTransaction = null,
  options = {}
) {
  const enforceCategoryConstraint = options.enforceCategoryConstraint === true;
  const fallback = fallbackTransaction ? normalizeTransactionRecord(fallbackTransaction) : null;

  const category = findUserCategoryByName(store, userId, normalizedInput.category_final);
  if (enforceCategoryConstraint && !category) {
    throw new Error("Invalid category");
  }

  const rawTransactionType = pickFirstDefined(payload, ["transaction_type", "type"]);
  const transactionType = normalizeTransactionType(
    rawTransactionType === undefined ? fallback?.transaction_type : rawTransactionType,
    normalizedInput.direction,
    normalizedInput.category_final,
    category?.type || null
  );

  const tags = normalizeTags(pickFirstDefined(payload, ["tags"]), fallback?.tags || []);
  const reviewState = normalizeReviewState(payload || {}, fallback?.needs_category_review || false);
  const recurringRuleId = normalizeRecurringRuleId(
    pickFirstDefined(payload, ["recurring_rule_id", "recurringRuleId"]),
    fallback?.recurring_rule_id ?? null
  );

  return {
    transaction_type: transactionType,
    tags,
    needs_category_review: reviewState.needs_category_review,
    review_status: reviewState.review_status,
    recurring_rule_id: recurringRuleId
  };
}

function maybeCreateRuleFromCorrection(store, userId, transaction, previousCategory, nextCategory) {
  if (!transaction || !previousCategory || !nextCategory || previousCategory === nextCategory) {
    return;
  }

  const matching = store.transactions
    .filter((entry) => entry.user_id === userId && !isSoftDeleted(entry))
    .filter((entry) => entry.merchant_normalized === transaction.merchant_normalized)
    .filter((entry) => entry.category_final === nextCategory)
    .length;

  if (matching < 2) {
    return;
  }

  const pattern = transaction.merchant_normalized;
  const exists = store.categoryRules.some(
    (rule) => rule.userId === userId && rule.type === "contains" && rule.pattern === pattern && rule.category === nextCategory
  );

  if (exists) {
    return;
  }

  store.categoryRules.push({
    id: createId("rule"),
    userId,
    type: "contains",
    pattern,
    category: nextCategory,
    priority: 75,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    generatedFromCorrections: true
  });
}

function normalizeTransactionTypeFilter(rawType) {
  if (rawType == null || String(rawType).trim() === "") {
    return null;
  }

  const normalized = normalizeText(rawType).replace(/\s+/g, "_");
  const transactionType = TRANSACTION_TYPE_ALIASES.get(normalized);
  if (!transactionType) {
    throw new Error("Invalid transaction type");
  }
  return transactionType;
}

function normalizeTagFilter(rawTag) {
  if (rawTag == null || String(rawTag).trim() === "") {
    return null;
  }
  return normalizeTagValue(rawTag);
}

export function listTransactions(userId, filters = {}) {
  const effectiveFilters = { ...filters };
  if (!effectiveFilters.start && !effectiveFilters.end && !effectiveFilters.range) {
    effectiveFilters.range = "all";
  }

  const strategy = ensureCategoryStrategyForUser(userId);
  const resolveCategory = createCategoryResolver(strategy);
  let txns = filterUserTransactions(userId, effectiveFilters);

  if (effectiveFilters.source_type) {
    txns = txns.filter((entry) => entry.source_type === effectiveFilters.source_type);
  }

  if (effectiveFilters.query) {
    const query = normalizeText(effectiveFilters.query);
    txns = txns.filter((entry) =>
      normalizeText(`${entry.merchant_raw} ${entry.description} ${entry.memo || ""}`).includes(query)
    );
  }

  txns = txns.map((entry) => normalizeTransactionRecord(entry));

  if (effectiveFilters.needs_category_review === "true") {
    txns = txns.filter((entry) => entry.needs_category_review);
  }

  const reviewStatusFilter = String(effectiveFilters.review_status || "").trim().toLowerCase();
  if (reviewStatusFilter) {
    if (!REVIEW_STATUS_VALUES.has(reviewStatusFilter)) {
      throw new Error("Invalid review status");
    }
    txns = txns.filter((entry) => entry.review_status === reviewStatusFilter);
  }

  const transactionTypeFilter = normalizeTransactionTypeFilter(effectiveFilters.transaction_type);
  if (transactionTypeFilter) {
    txns = txns.filter((entry) => entry.transaction_type === transactionTypeFilter);
  }

  const tagFilter = normalizeTagFilter(effectiveFilters.tag);
  if (tagFilter) {
    txns = txns.filter((entry) => entry.tags.includes(tagFilter));
  }

  if (effectiveFilters.recurring_rule_id) {
    const recurringRuleIdFilter = normalizeRecurringRuleId(effectiveFilters.recurring_rule_id, null);
    txns = txns.filter((entry) => entry.recurring_rule_id === recurringRuleIdFilter);
  }

  txns = [...txns].sort((a, b) => b.transaction_date.localeCompare(a.transaction_date));

  const total = txns.length;
  const limit = Math.max(1, Math.min(500, Number(effectiveFilters.limit || 100)));
  const offset = Math.max(0, Number(effectiveFilters.offset || 0));
  const items = txns.slice(offset, offset + limit).map((entry) => {
    const categoryMeta = resolveTransactionCategory(resolveCategory, entry);
    return {
      ...entry,
      category_coarse: categoryMeta.categoryCoarse,
      category_coarse_key: categoryMeta.categoryCoarseKey,
      category_emoji: categoryMeta.categoryEmoji,
      category_coarse_emoji: categoryMeta.categoryCoarseEmoji
    };
  });

  return {
    total,
    items,
    meta: {
      appliedRange: buildAppliedRange(effectiveFilters),
      dataBounds: getUserDataBounds(userId),
      categoryView: effectiveFilters.category_view || effectiveFilters.categoryView || "granular"
    }
  };
}

export function createManualTransaction(userId, payload) {
  const store = loadStore();
  const normalized = normalizeManualInput(payload, {
    store,
    userId,
    enforceCategoryConstraint: true
  });

  const account = ensureAccount(store, userId, payload.account_id, payload.account_name);
  const strategy = ensureCategoryStrategyForUser(userId);
  const resolveCategory = createCategoryResolver(strategy);
  const categoryMeta = resolveTransactionCategory(resolveCategory, normalized);
  normalized.category_final = categoryMeta.categoryGranular;

  const contractFields = resolveManualContractFields(store, userId, payload, normalized, null, {
    enforceCategoryConstraint: true
  });

  const tx = {
    id: createId("txn"),
    user_id: userId,
    account_id: account.id,
    account_key: account.normalizedKey,
    source_type: "manual",
    source_file_id: null,
    ...normalized,
    category_coarse: categoryMeta.categoryCoarse,
    category_coarse_key: categoryMeta.categoryCoarseKey,
    category_emoji: categoryMeta.categoryEmoji,
    category_coarse_emoji: categoryMeta.categoryCoarseEmoji,
    category_strategy: "manual",
    transaction_type: contractFields.transaction_type,
    tags: contractFields.tags,
    needs_category_review: contractFields.needs_category_review,
    review_status: contractFields.review_status,
    recurring_rule_id: contractFields.recurring_rule_id,
    dedupe_fingerprint: dedupeFingerprint(
      userId,
      account.normalizedKey,
      normalized.merchant_normalized,
      normalized.direction === "debit" ? -normalized.amount : normalized.amount,
      normalized.transaction_date,
      normalized.memo
    ),
    deleted_at: null,
    deleted_reason: null,
    deleted_by: null,
    created_at: nowIso(),
    updated_at: nowIso()
  };

  store.transactions.push(tx);
  saveStore(store);
  addAuditEvent(userId, "transaction.manual.create", { transactionId: tx.id });

  return normalizeTransactionRecord(tx);
}

export function updateTransaction(userId, transactionId, payload) {
  const store = loadStore();
  const tx = store.transactions.find(
    (entry) => entry.id === transactionId && entry.user_id === userId && !isSoftDeleted(entry)
  );
  if (!tx) {
    throw new Error("Transaction not found");
  }

  const normalizedExisting = normalizeTransactionRecord(tx);
  const previousCategory = normalizedExisting.category_final;
  const categoryFieldTouched = hasOwnField(payload, "category_final");

  const normalized = normalizeManualInput({ ...normalizedExisting, ...payload }, {
    store,
    userId,
    enforceCategoryConstraint: categoryFieldTouched
  });

  const strategy = ensureCategoryStrategyForUser(userId);
  const resolveCategory = createCategoryResolver(strategy);
  const categoryMeta = resolveTransactionCategory(resolveCategory, normalized);
  normalized.category_final = categoryMeta.categoryGranular;

  const contractFields = resolveManualContractFields(
    store,
    userId,
    payload,
    normalized,
    normalizedExisting,
    { enforceCategoryConstraint: categoryFieldTouched }
  );

  const account = ensureAccount(
    store,
    userId,
    payload.account_id || tx.account_id,
    payload.account_name || null
  );

  tx.account_id = account.id;
  tx.account_key = account.normalizedKey;
  tx.transaction_date = normalized.transaction_date;
  tx.post_date = normalized.post_date;
  tx.description = normalized.description;
  tx.merchant_raw = normalized.merchant_raw;
  tx.merchant_normalized = normalized.merchant_normalized;
  tx.amount = normalized.amount;
  tx.currency = normalized.currency;
  tx.direction = normalized.direction;
  tx.category_raw = normalized.category_raw;
  tx.category_final = normalized.category_final;
  tx.category_coarse = categoryMeta.categoryCoarse;
  tx.category_coarse_key = categoryMeta.categoryCoarseKey;
  tx.category_emoji = categoryMeta.categoryEmoji;
  tx.category_coarse_emoji = categoryMeta.categoryCoarseEmoji;
  tx.category_confidence = normalizeCategoryConfidence(payload.category_confidence, tx.category_confidence ?? 1);
  tx.memo = normalized.memo;
  tx.transaction_type = contractFields.transaction_type;
  tx.tags = contractFields.tags;
  tx.needs_category_review = contractFields.needs_category_review;
  tx.review_status = contractFields.review_status;
  tx.recurring_rule_id = contractFields.recurring_rule_id;
  tx.updated_at = nowIso();

  tx.dedupe_fingerprint = dedupeFingerprint(
    userId,
    tx.account_key,
    tx.merchant_normalized,
    tx.direction === "debit" ? -tx.amount : tx.amount,
    tx.transaction_date,
    tx.memo
  );

  maybeCreateRuleFromCorrection(store, userId, tx, previousCategory, tx.category_final);

  saveStore(store);
  addAuditEvent(userId, "transaction.update", { transactionId });

  return normalizeTransactionRecord(tx);
}

export function deleteTransaction(userId, transactionId) {
  const store = loadStore();
  const tx = store.transactions.find((entry) => entry.id === transactionId && entry.user_id === userId);
  if (!tx) {
    throw new Error("Transaction not found");
  }

  if (isSoftDeleted(tx)) {
    return tx;
  }

  tx.deleted_at = nowIso();
  tx.deleted_reason = "user_delete";
  tx.deleted_by = userId;
  tx.updated_at = nowIso();

  saveStore(store);
  addAuditEvent(userId, "transaction.delete.soft", { transactionId });

  return tx;
}

export function restoreTransaction(userId, transactionId) {
  const store = loadStore();
  const tx = store.transactions.find((entry) => entry.id === transactionId && entry.user_id === userId);
  if (!tx) {
    throw new Error("Transaction not found");
  }

  if (!isSoftDeleted(tx)) {
    throw new Error("Transaction is not deleted");
  }

  tx.deleted_at = null;
  tx.deleted_reason = null;
  tx.deleted_by = null;
  tx.updated_at = nowIso();

  saveStore(store);
  addAuditEvent(userId, "transaction.restore", { transactionId });

  return normalizeTransactionRecord(tx);
}
