import { loadStore } from "./store.ts";
import { normalizeText, toDecimal } from "./utils.ts";

const TAG_MAX_LENGTH = 40;
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

function normalizeTagFilter(rawTag) {
  if (rawTag == null || String(rawTag).trim() === "") {
    return null;
  }
  return normalizeTagValue(rawTag);
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
    }
  }

  return out;
}

function normalizeAmountFilter(rawValue, label) {
  if (rawValue == null || String(rawValue).trim() === "") {
    return null;
  }

  const amount = toDecimal(rawValue);
  if (amount === null || amount < 0) {
    throw new Error(`Invalid ${label}`);
  }

  return Math.abs(amount);
}

function normalizeReviewStatus(entry) {
  const status = String(entry?.review_status || "").trim().toLowerCase();
  if (REVIEW_STATUS_VALUES.has(status)) {
    return status;
  }

  return entry?.needs_category_review ? "needs_review" : "reviewed";
}

function normalizeDirection(entry) {
  const rawAmount = Number(entry?.amount ?? 0);
  const rawDirection = String(entry?.direction || "").trim().toLowerCase();
  if (rawDirection === "inflow" || rawDirection === "outflow") {
    return rawDirection;
  }
  if (rawDirection === "credit") {
    return "inflow";
  }
  if (rawDirection === "debit") {
    return "outflow";
  }
  return rawAmount > 0 ? "inflow" : "outflow";
}

function resolveCategoryType(entry, categoryTypeLookup) {
  const userId = String(entry?.user_id || entry?.userId || "").trim();
  const categoryName = normalizeText(entry?.category_final || "");
  if (!userId || !categoryName) {
    return null;
  }

  return categoryTypeLookup.get(`${userId}::${categoryName}`) || null;
}

function normalizeTransactionType(entry, categoryTypeLookup) {
  const explicit = normalizeTransactionTypeFilter(entry?.transaction_type);
  if (explicit) {
    return explicit;
  }

  const categoryType = resolveCategoryType(entry, categoryTypeLookup);
  if (categoryType) {
    return categoryType;
  }

  const categoryFinal = normalizeText(entry?.category_final || "");
  if (categoryFinal === "transfer") {
    return "transfer";
  }
  return normalizeDirection(entry) === "inflow" ? "income" : "expense";
}

function matchesAccount(entry, rawAccount) {
  const accountFilter = normalizeText(rawAccount);
  const accountKey = normalizeText(entry?.account_key || "");
  const accountId = normalizeText(entry?.account_id || "");
  return accountKey === accountFilter || accountId === accountFilter;
}

export function applySharedTransactionFilters(transactions, filters = {}) {
  let txns = [...transactions];
  const categoryTypeLookup = new Map(
    loadStore().categories
      .filter((entry) => entry.userId && entry.name && entry.type)
      .map((entry) => [`${entry.userId}::${normalizeText(entry.name)}`, entry.type])
  );

  if (filters.query) {
    const query = normalizeText(filters.query);
    txns = txns.filter((entry) =>
      normalizeText(`${entry?.merchant_raw || ""} ${entry?.description || ""} ${entry?.memo || ""}`).includes(query)
    );
  }

  if (filters.account) {
    txns = txns.filter((entry) => matchesAccount(entry, filters.account));
  }

  const needsCategoryReview = filters.needs_category_review === true || filters.needs_category_review === "true";
  if (needsCategoryReview) {
    txns = txns.filter((entry) => normalizeReviewStatus(entry) === "needs_review");
  }

  const reviewStatusFilter = String(filters.review_status || "").trim().toLowerCase();
  if (reviewStatusFilter) {
    if (!REVIEW_STATUS_VALUES.has(reviewStatusFilter)) {
      throw new Error("Invalid review status");
    }
    txns = txns.filter((entry) => normalizeReviewStatus(entry) === reviewStatusFilter);
  }

  const transactionTypeFilter = normalizeTransactionTypeFilter(filters.transaction_type);
  if (transactionTypeFilter) {
    txns = txns.filter((entry) => normalizeTransactionType(entry, categoryTypeLookup) === transactionTypeFilter);
  }

  const tagFilter = normalizeTagFilter(filters.tag);
  if (tagFilter) {
    txns = txns.filter((entry) => normalizeExistingTags(entry?.tags).includes(tagFilter));
  }

  const minAmountFilter = normalizeAmountFilter(filters.min_amount ?? filters.minAmount, "min amount");
  const maxAmountFilter = normalizeAmountFilter(filters.max_amount ?? filters.maxAmount, "max amount");
  if (minAmountFilter != null || maxAmountFilter != null) {
    txns = txns.filter((entry) => {
      const amount = Math.abs(Number(entry?.amount || 0));
      if (minAmountFilter != null && amount < minAmountFilter) {
        return false;
      }
      if (maxAmountFilter != null && amount > maxAmountFilter) {
        return false;
      }
      return true;
    });
  }

  return txns;
}
