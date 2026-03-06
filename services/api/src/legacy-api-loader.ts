import { ensureDevTestAccount } from "./auth.ts";
import { normalizeMerchant } from "./categorization.ts";
import { loadStore, saveStore } from "./store.ts";
import { createId, hashPassword, normalizeText, nowIso, parseDate, stableHash, toDecimal } from "./utils.ts";

export const LEGACY_COARSE_CATEGORIES = [
  { key: "essential", name: "Essential", emoji: "🟢", isExcluded: false, order: 1 },
  { key: "extra", name: "Extra", emoji: "🔴", isExcluded: false, order: 2 },
  { key: "neutral", name: "Neutral", emoji: "🟡", isExcluded: false, order: 3 },
  { key: "other", name: "Other", emoji: "⚫", isExcluded: true, order: 4 }
];

const COARSE_NAME_BY_KEY = new Map(LEGACY_COARSE_CATEGORIES.map((entry) => [entry.key, entry.name]));

function readField(row, candidates, fallback = null) {
  if (!row || typeof row !== "object") {
    return fallback;
  }
  for (const candidate of candidates) {
    if (!Object.hasOwn(row, candidate)) {
      continue;
    }
    const value = row[candidate];
    if (value == null) {
      continue;
    }
    if (typeof value === "string" && value.trim() === "") {
      continue;
    }
    return value;
  }
  return fallback;
}

function coerceArray(payload, candidateKeys = []) {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && typeof payload === "object") {
    for (const key of candidateKeys) {
      if (Array.isArray(payload[key])) {
        return payload[key];
      }
    }
  }
  return [];
}

function uniqByNormalized(values = []) {
  const out = [];
  const seen = new Set();
  for (const value of values) {
    const name = String(value || "").trim();
    const normalized = normalizeText(name);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    out.push(name);
  }
  return out;
}

export function inferLegacyTier1CoarseKey(mappedCategory) {
  const normalized = normalizeText(mappedCategory || "");
  if (!normalized) {
    return "other";
  }

  if (/\b(misc|miscellaneous|other|uncategorized|unknown|fees?|adjustments?)\b/.test(normalized)) {
    return "other";
  }

  if (/(income|salary|paycheck|reimburse|refund|credit card payment|transfer|payment|deposit|interest|dividend|investment|withdraw)/.test(normalized)) {
    return "neutral";
  }

  if (/(grocer|utility|bill|housing|home|rent|mortgage|loan|health|medical|pharmacy|insurance|transport|auto|automotive|gas|fuel|car|pet|education|childcare)/.test(normalized)) {
    return "essential";
  }

  if (/(dining|restaurant|food|entertain|shopping|travel|subscription|fashion|hobby|merchandise|gift|coffee|bar|service)/.test(normalized)) {
    return "extra";
  }

  return "other";
}

function inferLegacyTier2Emoji(mappedCategory, coarseKey) {
  const normalized = normalizeText(mappedCategory || "");

  if (/\b(grocery|market)\b/.test(normalized)) {
    return "🛒";
  }
  if (/\b(dining|restaurant|food|coffee|bar)\b/.test(normalized)) {
    return "🍽️";
  }
  if (/\b(auto|automotive|gas|fuel|car)\b/.test(normalized)) {
    return "🚗";
  }
  if (/\b(health|medical|pharmacy|care)\b/.test(normalized)) {
    return "🩺";
  }
  if (/\b(travel|flight|hotel)\b/.test(normalized)) {
    return "✈️";
  }
  if (/\b(home|housing|rent|mortgage)\b/.test(normalized)) {
    return "🏠";
  }
  if (/\b(income|salary|refund|reimburse|interest|investment)\b/.test(normalized)) {
    return "💰";
  }
  if (/\b(transfer|payment|withdraw|deposit)\b/.test(normalized)) {
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

function inferLegacyCategoryType(mappedCategory, coarseKey, direction = null) {
  const normalized = normalizeText(mappedCategory || "");

  if (/\b(transfer|payment|withdraw|deposit)\b/.test(normalized)) {
    return "transfer";
  }

  if (/\b(income|salary|paycheck|refund|reimburse|interest|dividend|investment)\b/.test(normalized)) {
    return "income";
  }

  if (coarseKey === "essential" || coarseKey === "extra") {
    return "expense";
  }

  if (coarseKey === "neutral") {
    return direction === "credit" ? "income" : "transfer";
  }

  return direction === "credit" ? "income" : "expense";
}

export function resolveLegacyMappedCategory(rawCategory, rawToMappedCategory = new Map()) {
  const rawValue = String(rawCategory || "").trim();
  const normalizedRaw = normalizeText(rawValue);
  if (normalizedRaw && rawToMappedCategory.has(normalizedRaw)) {
    const mapped = String(rawToMappedCategory.get(normalizedRaw) || "").trim();
    if (mapped) {
      return mapped;
    }
  }

  if (rawValue) {
    return rawValue;
  }

  return "Uncategorized";
}

export function buildLegacyCategoryStrategy(mappedCategories = []) {
  const distinctCategories = uniqByNormalized(mappedCategories);
  const categories = distinctCategories.length > 0 ? distinctCategories : ["Uncategorized"];

  return {
    coarseCategories: LEGACY_COARSE_CATEGORIES.map((entry) => ({ ...entry })),
    granularCategories: categories.map((name) => {
      const coarseKey = inferLegacyTier1CoarseKey(name);
      return {
        name,
        coarseKey,
        emoji: inferLegacyTier2Emoji(name, coarseKey),
        aliases: [],
        isSystem: false
      };
    })
  };
}

function normalizeLegacyAccountType(rawType) {
  const normalized = normalizeText(rawType || "");
  if (!normalized) {
    return "checking";
  }
  if (normalized.includes("credit")) {
    return "credit";
  }
  if (normalized.includes("saving")) {
    return "savings";
  }
  if (normalized.includes("loan")) {
    return "loan";
  }
  if (normalized.includes("invest") || normalized.includes("broker")) {
    return "investment";
  }
  if (normalized.includes("cash")) {
    return "cash";
  }
  return "checking";
}

function inferLegacyDirection(rawType, amount) {
  const normalizedType = normalizeText(rawType || "");
  if (normalizedType.includes("debit") || normalizedType.includes("withdraw")) {
    return "debit";
  }
  if (normalizedType.includes("credit") || normalizedType.includes("deposit")) {
    return "credit";
  }
  return amount < 0 ? "debit" : "credit";
}

function parseLegacyUploadAt(rawValue) {
  const value = String(rawValue || "").trim();
  if (!value) {
    return nowIso();
  }

  const legacyTimestamp = value.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
  if (legacyTimestamp) {
    return `${legacyTimestamp[1]}-${legacyTimestamp[2]}-${legacyTimestamp[3]}T${legacyTimestamp[4]}:${legacyTimestamp[5]}:${legacyTimestamp[6]}.000Z`;
  }

  const parsedDate = parseDate(value);
  if (parsedDate) {
    return `${parsedDate}T00:00:00.000Z`;
  }

  return nowIso();
}

function buildFingerprint({ userId, accountKey, merchantNormalized, amount, direction, transactionDate, memo }) {
  return stableHash(
    [
      userId,
      accountKey,
      merchantNormalized,
      Math.abs(Number(amount || 0)).toFixed(2),
      direction,
      transactionDate,
      memo ? stableHash(String(memo)) : ""
    ].join("|")
  );
}

function extractMappedCategoryNames(rawPayload) {
  const rows = coerceArray(rawPayload, ["categories", "items", "results"]);
  return uniqByNormalized(
    rows.map((row) =>
      readField(row, ["category", "name", "minanceCategory", "mapped_category", "mappedCategory"], "")
    )
  );
}

function extractRawCategoryNames(rawPayload) {
  const rows = coerceArray(rawPayload, ["items", "categories", "results"]);
  return uniqByNormalized(
    rows.map((row) => readField(row, ["rawCategory", "raw_category", "category", "name"], ""))
  );
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Request failed (${response.status}) for ${url}: ${body || response.statusText}`);
  }

  return response.json();
}

function normalizeBaseUrl(baseUrl) {
  return String(baseUrl || "").trim().replace(/\/+$/, "");
}

export async function fetchLegacyApiData({ baseUrl, startDate, endDate }) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  if (!normalizedBaseUrl) {
    throw new Error("baseUrl is required");
  }
  if (!parseDate(startDate) || !parseDate(endDate)) {
    throw new Error("startDate and endDate must be valid dates in YYYY-MM-DD format");
  }

  const warnings = [];
  const accountsPayload = await fetchJson(`${normalizedBaseUrl}/1.0/minance/account/listAll`);
  const transactionsPayload = await fetchJson(
    `${normalizedBaseUrl}/1.0/minance/transactions/retrieve/${startDate}/${endDate}`
  );

  const accounts = coerceArray(accountsPayload, ["accounts", "items", "results"]);
  const transactions = coerceArray(transactionsPayload, ["transactions", "items", "results"]);

  let mappedCategories = [];
  const rawToMappedCategory = new Map();

  try {
    const mappedCategoriesPayload = await fetchJson(
      `${normalizedBaseUrl}/1.0/minance/mapping_category/minanceCategory/retrieveAll`
    );
    mappedCategories = extractMappedCategoryNames(mappedCategoriesPayload);

    await Promise.all(
      mappedCategories.map(async (mappedCategory) => {
        try {
          const linkedRawPayload = await fetchJson(
            `${normalizedBaseUrl}/1.0/minance/mapping_category/retrieve/${encodeURIComponent(mappedCategory)}`
          );
          const linkedRawCategories = extractRawCategoryNames(linkedRawPayload);
          for (const rawCategory of linkedRawCategories) {
            rawToMappedCategory.set(normalizeText(rawCategory), mappedCategory);
          }
        } catch (error) {
          warnings.push(
            `Failed to fetch raw category links for ${mappedCategory}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      })
    );
  } catch (error) {
    warnings.push(`Failed to load mapped category catalog: ${error instanceof Error ? error.message : String(error)}`);
  }

  return {
    accounts,
    transactions,
    mappedCategories,
    rawToMappedCategory,
    warnings
  };
}

function resolveLegacyLoaderUserId(userEmail = null) {
  const normalizedEmail = String(userEmail || "").trim().toLowerCase();

  if (!normalizedEmail) {
    const seeded = ensureDevTestAccount();
    if (seeded?.user?.id) {
      return seeded.user.id;
    }

    const store = loadStore();
    if (store.users.length > 0) {
      return String(store.users[0].id);
    }

    throw new Error("No user available. Provide --user-email or enable dev account seeding.");
  }

  const store = loadStore();
  const existing = store.users.find((entry) => String(entry.email || "").toLowerCase() === normalizedEmail);
  if (existing) {
    return existing.id;
  }

  const now = nowIso();
  const defaultPassword = String(process.env.DEV_TEST_ACCOUNT_PASSWORD || "devpassword123");
  const { passwordHash, salt } = hashPassword(defaultPassword);
  const user = {
    id: createId("user"),
    email: normalizedEmail,
    passwordHash,
    passwordSalt: salt,
    createdAt: now,
    updatedAt: now
  };

  store.users.push(user);
  saveStore(store);
  return user.id;
}

export function applyLegacyApiDataToStore({
  userId,
  accounts = [],
  transactions = [],
  mappedCategories = [],
  rawToMappedCategory = new Map(),
  resetUserData = true
}) {
  if (!userId) {
    throw new Error("userId is required");
  }

  const store = loadStore();

  if (resetUserData) {
    store.accounts = store.accounts.filter((entry) => entry.userId !== userId);
    store.transactions = store.transactions.filter((entry) => entry.user_id !== userId);
    store.categories = store.categories.filter((entry) => entry.userId !== userId);
    store.categoryRules = store.categoryRules.filter((entry) => entry.userId !== userId);
    store.categoryStrategies = store.categoryStrategies.filter((entry) => entry.userId !== userId);
  }

  const summary = {
    userId,
    accountsScanned: 0,
    accountsImported: 0,
    transactionsScanned: 0,
    transactionsImported: 0,
    invalidTransactions: 0,
    duplicateTransactionsSkipped: 0,
    categoriesImported: 0,
    mappedCategoryCount: 0,
    resetUserData: Boolean(resetUserData)
  };

  const legacyAccountIdToNewId = new Map();
  const accountNameToNewId = new Map();

  for (const row of accounts) {
    summary.accountsScanned += 1;

    const accountName = String(readField(row, ["account_name", "accountName", "name"], "Legacy Account")).trim();
    const bankName = String(readField(row, ["bank_name", "bankName", "institution", "bank"], "")).trim();
    const accountType = normalizeLegacyAccountType(readField(row, ["account_type", "accountType", "type"], "checking"));
    const keySource = `${bankName} ${accountName}`.trim() || accountName || `legacy-account-${summary.accountsScanned}`;
    const normalizedKey = normalizeText(keySource) || `legacy_account_${summary.accountsScanned}`;

    let existing = store.accounts.find((entry) => entry.userId === userId && entry.normalizedKey === normalizedKey);
    if (!existing) {
      existing = {
        id: createId("acct"),
        userId,
        normalizedKey,
        displayName: accountName,
        sourceInstitution: bankName || null,
        accountType,
        currency: "USD",
        initialBalance: 0,
        status: "active",
        includeInCharts: true,
        version: 1,
        createdAt: nowIso(),
        updatedAt: nowIso()
      };
      store.accounts.push(existing);
      summary.accountsImported += 1;
    }

    const legacyAccountId = String(readField(row, ["account_id", "accountId", "id"], "")).trim();
    if (legacyAccountId) {
      legacyAccountIdToNewId.set(legacyAccountId, existing.id);
    }

    const normalizedAccountName = normalizeText(accountName);
    if (normalizedAccountName) {
      accountNameToNewId.set(normalizedAccountName, existing.id);
    }
  }

  const mappedCategoryNames = uniqByNormalized(mappedCategories);

  const existingFingerprints = new Set(
    store.transactions
      .filter((entry) => entry.user_id === userId)
      .map((entry) => String(entry.dedupe_fingerprint || ""))
      .filter(Boolean)
  );

  for (const row of transactions) {
    summary.transactionsScanned += 1;

    const transactionDate = parseDate(
      readField(row, ["transaction_date", "transactionDate", "date", "post_date", "postDate"], null)
    );
    const rawAmount = toDecimal(readField(row, ["amount", "transaction_amount", "value"], null));
    const description = String(readField(row, ["description", "merchant", "payee", "memo"], "")).trim();

    if (!transactionDate || rawAmount == null || !description) {
      summary.invalidTransactions += 1;
      continue;
    }

    const legacyAccountId = String(readField(row, ["account_id", "accountId", "account"], "")).trim();
    const accountName = String(readField(row, ["account_name", "accountName"], "")).trim();
    const accountId = legacyAccountIdToNewId.get(legacyAccountId)
      || accountNameToNewId.get(normalizeText(accountName))
      || null;

    const account = accountId ? store.accounts.find((entry) => entry.id === accountId) : null;
    const accountKey = account?.normalizedKey || normalizeText(accountName) || "legacy_account";

    const direction = inferLegacyDirection(readField(row, ["transaction_type", "transactionType", "type"], ""), rawAmount);
    const amount = Math.abs(rawAmount);

    const rawCategory = String(readField(row, ["category", "raw_category", "category_raw"], "")).trim();
    const categoryFinal = resolveLegacyMappedCategory(rawCategory, rawToMappedCategory);
    if (categoryFinal) {
      mappedCategoryNames.push(categoryFinal);
    }

    const coarseKey = inferLegacyTier1CoarseKey(categoryFinal);
    const coarseName = COARSE_NAME_BY_KEY.get(coarseKey) || "Other";
    const categoryEmoji = inferLegacyTier2Emoji(categoryFinal, coarseKey);
    const transactionType = inferLegacyCategoryType(categoryFinal, coarseKey, direction);

    const memo = readField(row, ["memo", "notes"], null);
    const merchantRaw = description;
    const merchantNormalized = normalizeMerchant(merchantRaw);
    const fingerprint = buildFingerprint({
      userId,
      accountKey,
      merchantNormalized,
      amount,
      direction,
      transactionDate,
      memo
    });

    if (existingFingerprints.has(fingerprint)) {
      summary.duplicateTransactionsSkipped += 1;
      continue;
    }

    existingFingerprints.add(fingerprint);

    store.transactions.push({
      id: createId("txn"),
      user_id: userId,
      account_id: accountId,
      account_key: accountKey,
      source_type: "legacy_api",
      source_file_id: null,
      transaction_date: transactionDate,
      post_date: parseDate(readField(row, ["post_date", "postDate"], null)),
      merchant_raw: merchantRaw,
      merchant_normalized: merchantNormalized,
      description,
      amount,
      currency: String(readField(row, ["currency"], "USD")).toUpperCase(),
      direction,
      transaction_type: transactionType,
      category_raw: null,
      category_final: categoryFinal,
      category_coarse: coarseName,
      category_emoji: categoryEmoji,
      category_confidence: 1,
      category_strategy: "legacy_api_mapping",
      needs_category_review: false,
      memo: memo ? String(memo) : null,
      dedupe_fingerprint: fingerprint,
      created_at: parseLegacyUploadAt(readField(row, ["upload_time", "uploadTime", "created_at", "createdAt"], null)),
      updated_at: nowIso()
    });

    summary.transactionsImported += 1;
  }

  const distinctCategories = uniqByNormalized(mappedCategoryNames);
  const strategy = buildLegacyCategoryStrategy(distinctCategories);

  for (const categoryName of distinctCategories) {
    const normalized = normalizeText(categoryName);
    const exists = store.categories.find(
      (entry) => entry.userId === userId && normalizeText(entry.name) === normalized
    );
    if (exists) {
      continue;
    }

    const coarseKey = inferLegacyTier1CoarseKey(categoryName);
    store.categories.push({
      id: createId("cat"),
      userId,
      name: categoryName,
      emoji: inferLegacyTier2Emoji(categoryName, coarseKey),
      coarseKey,
      type: inferLegacyCategoryType(categoryName, coarseKey),
      isSystem: false,
      createdAt: nowIso(),
      updatedAt: nowIso()
    });
    summary.categoriesImported += 1;
  }

  const now = nowIso();
  const existingStrategy = store.categoryStrategies.find((entry) => entry.userId === userId);
  if (existingStrategy) {
    existingStrategy.sourceUrl = "legacy-api-loader";
    existingStrategy.version = "legacy-api-v1";
    existingStrategy.coarseCategories = strategy.coarseCategories;
    existingStrategy.granularCategories = strategy.granularCategories;
    existingStrategy.updatedAt = now;
  } else {
    store.categoryStrategies.push({
      id: createId("cstrat"),
      userId,
      sourceUrl: "legacy-api-loader",
      version: "legacy-api-v1",
      coarseCategories: strategy.coarseCategories,
      granularCategories: strategy.granularCategories,
      createdAt: now,
      updatedAt: now
    });
  }

  summary.mappedCategoryCount = distinctCategories.length;

  store.auditEvents.push({
    id: createId("audit"),
    userId,
    action: "legacy_api_loader.completed",
    details: {
      accountsImported: summary.accountsImported,
      transactionsImported: summary.transactionsImported,
      categoriesImported: summary.categoriesImported,
      mappedCategoryCount: summary.mappedCategoryCount,
      resetUserData: summary.resetUserData
    },
    createdAt: nowIso()
  });

  saveStore(store);
  return summary;
}

export async function seedFromLegacyApiToStore({
  baseUrl,
  startDate,
  endDate,
  userEmail = null,
  resetUserData = true
}) {
  const userId = resolveLegacyLoaderUserId(userEmail);
  const dataset = await fetchLegacyApiData({ baseUrl, startDate, endDate });
  const summary = applyLegacyApiDataToStore({
    userId,
    accounts: dataset.accounts,
    transactions: dataset.transactions,
    mappedCategories: dataset.mappedCategories,
    rawToMappedCategory: dataset.rawToMappedCategory,
    resetUserData
  });

  return {
    ...summary,
    baseUrl: normalizeBaseUrl(baseUrl),
    startDate,
    endDate,
    warnings: dataset.warnings
  };
}
