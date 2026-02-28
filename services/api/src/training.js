import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { ROOT_DIR } from "./config.js";
import { clamp, normalizeText } from "./utils.js";
import { DEFAULT_CATEGORIES } from "../../../packages/domain/src/constants.js";

const DEFAULT_TRAINING_DB = "backup_2026-02-26_00-00-03.db";
const STRIP_MERCHANT_TOKENS = /\b(sq|pos|purchase|debit|card|payment|txn)\b/g;

const CATEGORY_ALIASES = {
  groceries: "Groceries",
  "food and drink": "Dining",
  restaurants: "Dining",
  "restaurants dining": "Dining",
  dining: "Dining",
  travel: "Transport",
  "travel entertainment": "Transport",
  "travel parking": "Transport",
  gas: "Transport",
  automotive: "Transport",
  utilities: "Utilities",
  bills: "Utilities",
  "bills utilities": "Utilities",
  "subscriptions services": "Utilities",
  "dues and subscriptions": "Utilities",
  "service charges": "Utilities",
  "service charges fees": "Utilities",
  "postage shipping": "Utilities",
  "postage and shipping": "Utilities",
  mortgage: "Housing",
  mortgages: "Housing",
  "mortgage loan": "Housing",
  loans: "Housing",
  health: "Healthcare",
  personal: "Healthcare",
  "personal care": "Healthcare",
  "health wellness": "Healthcare",
  entertainment: "Entertainment",
  entertainments: "Entertainment",
  "entertainments growth": "Entertainment",
  "outdoor activities": "Entertainment",
  shopping: "Shopping",
  fashion: "Shopping",
  "clothing shoes": "Shopping",
  home: "Shopping",
  "home improvement": "Shopping",
  "home maintenance": "Shopping",
  merchandise: "Shopping",
  "general merchandise": "Shopping",
  salary: "Income",
  "paychecks salary": "Income",
  "other income": "Income",
  "investment income": "Income",
  interest: "Income",
  reimbursement: "Income",
  "expense reimbursement": "Income",
  rewards: "Income",
  refunds: "Income",
  "refunds adjustments": "Income",
  "tax return": "Income",
  transfer: "Transfer",
  transfers: "Transfer",
  "transfer withdrawl": "Transfer",
  "credit card payments": "Transfer",
  payment: "Transfer",
  payments: "Transfer",
  "payments and credits": "Transfer",
  "bank deposit to pp account": "Transfer",
  "general card deposit": "Transfer",
  paypal: "Transfer",
  "paypal buyer credit payment funding": "Transfer",
  "paypal inc": "Transfer",
  "reversal of ach deposit": "Transfer",
  miscellaneous: "Uncategorized",
  "other expenses": "Uncategorized",
  "fees adjustments": "Uncategorized",
  fees: "Uncategorized",
  "gifts donations": "Uncategorized",
  education: "Uncategorized",
  pets: "Uncategorized",
  "pets pet care": "Uncategorized"
};

let trainingCache = null;
let trainingLoadAttempted = false;

function normalizeMerchantValue(value) {
  const normalized = normalizeText(value)
    .replace(STRIP_MERCHANT_TOKENS, "")
    .replace(/\s+/g, " ")
    .trim();
  return normalized || null;
}

function resolveTrainingDbPath() {
  const configured = String(process.env.MINANCE_TRAINING_DB_PATH || "").trim();
  if (!configured) {
    return path.join(ROOT_DIR, DEFAULT_TRAINING_DB);
  }

  if (path.isAbsolute(configured)) {
    return configured;
  }
  return path.join(ROOT_DIR, configured);
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

function toCanonicalCategory(value) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return null;
  }

  const direct = DEFAULT_CATEGORIES.find((entry) => normalizeText(entry) === normalized);
  if (direct) {
    return direct;
  }

  const aliased = CATEGORY_ALIASES[normalized];
  if (aliased) {
    return aliased;
  }

  if (normalized.includes("income") || normalized.includes("salary")) {
    return "Income";
  }
  if (normalized.includes("transfer") || normalized.includes("payment")) {
    return "Transfer";
  }
  if (normalized.includes("grocery")) {
    return "Groceries";
  }
  if (normalized.includes("dining") || normalized.includes("restaurant") || normalized.includes("food")) {
    return "Dining";
  }
  if (normalized.includes("travel") || normalized.includes("gas") || normalized.includes("automotive")) {
    return "Transport";
  }
  if (normalized.includes("utility") || normalized.includes("bill")) {
    return "Utilities";
  }
  if (normalized.includes("mortgage") || normalized.includes("loan") || normalized.includes("rent")) {
    return "Housing";
  }
  if (normalized.includes("health") || normalized.includes("care") || normalized.includes("pharmacy")) {
    return "Healthcare";
  }
  if (normalized.includes("entertain")) {
    return "Entertainment";
  }
  if (normalized.includes("shopping") || normalized.includes("merchandise") || normalized.includes("fashion")) {
    return "Shopping";
  }

  return null;
}

function buildEmptyTrainingState(reason) {
  return {
    enabled: false,
    reason,
    dbPath: null,
    rawCategoryMap: {},
    merchantPriorMap: {},
    merchantExemplars: [],
    rawCategoryMappings: []
  };
}

function loadTrainingState() {
  if (trainingLoadAttempted) {
    return trainingCache;
  }
  trainingLoadAttempted = true;

  const dbPath = resolveTrainingDbPath();
  if (!fs.existsSync(dbPath)) {
    trainingCache = buildEmptyTrainingState("training_db_missing");
    return trainingCache;
  }

  const rawMappings = sqliteJsonQuery(
    dbPath,
    `
      SELECT
        rc.raw_category AS raw_category,
        mc.category AS mapped_category
      FROM raw_category_to_minance_category rc
      LEFT JOIN minance_category mc
        ON mc.m_category_id = rc.minance_category_id;
    `
  );
  const transactions = sqliteJsonQuery(
    dbPath,
    `
      SELECT
        category,
        description,
        memo
      FROM transactions
      WHERE description IS NOT NULL
        AND description <> '';
    `
  );

  const rawCategoryMap = {};
  for (const row of rawMappings) {
    const rawCategory = normalizeText(row?.raw_category);
    const canonical = toCanonicalCategory(row?.mapped_category);
    if (!rawCategory || !canonical) {
      continue;
    }
    rawCategoryMap[rawCategory] = canonical;
  }

  const merchantCounts = new Map();
  const merchantTotals = new Map();
  for (const row of transactions) {
    const merchant = normalizeMerchantValue(row?.description || row?.memo);
    const canonical = toCanonicalCategory(row?.category);
    if (!merchant || !canonical) {
      continue;
    }

    const key = `${merchant}::${canonical}`;
    merchantCounts.set(key, (merchantCounts.get(key) || 0) + 1);
    merchantTotals.set(merchant, (merchantTotals.get(merchant) || 0) + 1);
  }

  const groupedByMerchant = new Map();
  for (const [key, count] of merchantCounts.entries()) {
    const [merchant, category] = key.split("::");
    if (!groupedByMerchant.has(merchant)) {
      groupedByMerchant.set(merchant, []);
    }
    groupedByMerchant.get(merchant).push({ category, count });
  }

  const merchantPriorMap = {};
  const merchantExemplars = [];
  for (const [merchant, options] of groupedByMerchant.entries()) {
    options.sort((a, b) => b.count - a.count);
    const top = options[0];
    const total = merchantTotals.get(merchant) || top.count;
    const share = total > 0 ? top.count / total : 0;
    const confidence = clamp(0.62 + share * 0.22 + Math.min(15, top.count) * 0.01, 0, 0.95);

    merchantPriorMap[merchant] = {
      category: top.category,
      count: top.count,
      total,
      share: Math.round(share * 1000) / 1000,
      confidence: Math.round(confidence * 1000) / 1000
    };

    merchantExemplars.push({
      merchant,
      category: top.category,
      count: top.count,
      total,
      share: Math.round(share * 1000) / 1000
    });
  }

  merchantExemplars.sort((a, b) => b.count - a.count);

  const rawCategoryMappings = Object.entries(rawCategoryMap)
    .map(([rawCategory, canonicalCategory]) => ({ rawCategory, canonicalCategory }))
    .sort((a, b) => a.rawCategory.localeCompare(b.rawCategory));

  trainingCache = {
    enabled: true,
    reason: null,
    dbPath,
    rawCategoryMap,
    merchantPriorMap,
    merchantExemplars,
    rawCategoryMappings
  };
  return trainingCache;
}

export function resolveTrainingCategory({
  categoryRaw,
  merchantNormalized,
  description,
  memo
}) {
  const training = loadTrainingState();
  if (!training?.enabled) {
    return null;
  }

  const rawKey = normalizeText(categoryRaw);
  if (rawKey && training.rawCategoryMap[rawKey]) {
    return {
      category: training.rawCategoryMap[rawKey],
      confidence: 0.9,
      strategy: "training_raw_category"
    };
  }

  const merchantKey = normalizeMerchantValue(merchantNormalized || description || memo);
  if (!merchantKey) {
    return null;
  }

  const prior = training.merchantPriorMap[merchantKey];
  if (!prior || prior.count < 2 || prior.share < 0.55) {
    return null;
  }

  return {
    category: prior.category,
    confidence: prior.confidence,
    strategy: "training_merchant_memory"
  };
}

export function getTrainingPromptContext({
  maxRawCategoryMappings = 50,
  maxMerchantExemplars = 50
} = {}) {
  const training = loadTrainingState();
  if (!training?.enabled) {
    return {
      enabled: false,
      rawCategoryMappings: [],
      merchantExemplars: []
    };
  }

  return {
    enabled: true,
    rawCategoryMappings: training.rawCategoryMappings.slice(0, maxRawCategoryMappings),
    merchantExemplars: training.merchantExemplars.slice(0, maxMerchantExemplars)
  };
}

export function getTrainingStatus() {
  const training = loadTrainingState();
  return {
    enabled: training.enabled,
    reason: training.reason,
    dbPath: training.dbPath,
    rawCategoryMappings: training.rawCategoryMappings.length,
    merchantExemplars: training.merchantExemplars.length
  };
}
