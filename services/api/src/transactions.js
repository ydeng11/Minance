import { loadStore, saveStore, addAuditEvent } from "./store.js";
import { parseDate, toDecimal, nowIso, createId, normalizeText, stableHash } from "./utils.js";
import { normalizeMerchant } from "./categorization.js";
import { filterUserTransactions, getUserDataBounds, buildAppliedRange } from "./analytics.js";
import { createCategoryResolver, ensureCategoryStrategyForUser } from "./category-strategy.js";

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

function normalizeManualInput(input) {
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

  return {
    transaction_date: transactionDate,
    post_date: parseDate(input.post_date),
    description,
    merchant_raw: merchantRaw,
    merchant_normalized: merchantNormalized,
    amount,
    currency: String(input.currency || "USD").trim().toUpperCase() || "USD",
    direction,
    category_raw: input.category_raw ? String(input.category_raw).trim() : null,
    category_final: String(input.category_final || (direction === "credit" ? "Income" : "Uncategorized")),
    category_confidence: Number(input.category_confidence ?? 1),
    memo: input.memo ? String(input.memo).trim() : null
  };
}

function maybeCreateRuleFromCorrection(store, userId, transaction, previousCategory, nextCategory) {
  if (!transaction || !previousCategory || !nextCategory || previousCategory === nextCategory) {
    return;
  }

  const matching = store.transactions
    .filter((entry) => entry.user_id === userId)
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

  if (effectiveFilters.needs_category_review === "true") {
    txns = txns.filter((entry) => entry.needs_category_review);
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
  const normalized = normalizeManualInput(payload);
  const account = ensureAccount(store, userId, payload.account_id, payload.account_name);
  const strategy = ensureCategoryStrategyForUser(userId);
  const resolveCategory = createCategoryResolver(strategy);
  const categoryMeta = resolveTransactionCategory(resolveCategory, normalized);
  normalized.category_final = categoryMeta.categoryGranular;

  const tx = {
    id: createId("txn"),
    user_id: userId,
    account_id: account.id,
    account_key: account.normalizedKey,
    source_type: "manual",
    source_file_id: null,
    ...normalized,
    category_coarse: categoryMeta.categoryCoarse,
    category_emoji: categoryMeta.categoryEmoji,
    category_strategy: "manual",
    needs_category_review: false,
    dedupe_fingerprint: dedupeFingerprint(
      userId,
      account.normalizedKey,
      normalized.merchant_normalized,
      normalized.direction === "debit" ? -normalized.amount : normalized.amount,
      normalized.transaction_date,
      normalized.memo
    ),
    created_at: nowIso(),
    updated_at: nowIso()
  };

  store.transactions.push(tx);
  saveStore(store);
  addAuditEvent(userId, "transaction.manual.create", { transactionId: tx.id });

  return tx;
}

export function updateTransaction(userId, transactionId, payload) {
  const store = loadStore();
  const tx = store.transactions.find((entry) => entry.id === transactionId && entry.user_id === userId);
  if (!tx) {
    throw new Error("Transaction not found");
  }

  const previousCategory = tx.category_final;
  const normalized = normalizeManualInput({ ...tx, ...payload });
  const strategy = ensureCategoryStrategyForUser(userId);
  const resolveCategory = createCategoryResolver(strategy);
  const categoryMeta = resolveTransactionCategory(resolveCategory, normalized);
  normalized.category_final = categoryMeta.categoryGranular;
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
  tx.category_emoji = categoryMeta.categoryEmoji;
  tx.category_confidence = Number(payload.category_confidence ?? tx.category_confidence ?? 1);
  tx.memo = normalized.memo;
  tx.needs_category_review = false;
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

  return tx;
}

export function deleteTransaction(userId, transactionId) {
  const store = loadStore();
  const before = store.transactions.length;
  store.transactions = store.transactions.filter(
    (entry) => !(entry.id === transactionId && entry.user_id === userId)
  );

  if (before === store.transactions.length) {
    throw new Error("Transaction not found");
  }

  saveStore(store);
  addAuditEvent(userId, "transaction.delete", { transactionId });

  return true;
}
