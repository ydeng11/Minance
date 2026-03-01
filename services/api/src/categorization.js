import { CATEGORY_KEYWORDS } from "../../../packages/domain/src/constants.js";
import { normalizeText, clamp } from "./utils.js";
import { resolveTrainingCategory } from "./training.js";

const AUTO_HINT_PATTERN = /\b(jeep|honda|honda finance|honda financial|american honda)\b/i;

function applyAutoCanonicalization(result, transaction) {
  if (!result?.category) {
    return result;
  }

  const normalizedCategory = normalizeText(result.category);
  const text = normalizeText(
    `${transaction.merchant_normalized || ""} ${transaction.description || ""} ${transaction.memo || ""} ${transaction.category_raw || ""}`
  );
  const shouldUseAuto = normalizedCategory === "automotive" || AUTO_HINT_PATTERN.test(text);

  if (!shouldUseAuto) {
    return result;
  }

  if (result.category === "Auto") {
    return result;
  }

  return {
    ...result,
    category: "Auto"
  };
}

export function normalizeMerchant(raw) {
  const normalized = normalizeText(raw)
    .replace(/\b(sq|pos|purchase|debit|card|payment|txn)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return "unknown merchant";
  }

  return normalized;
}

function applyRule(userRules, transaction) {
  const sorted = [...userRules].sort((a, b) => (b.priority || 0) - (a.priority || 0));
  const text = `${transaction.merchant_normalized} ${normalizeText(transaction.description)} ${normalizeText(
    transaction.memo
  )}`;

  for (const rule of sorted) {
    const pattern = String(rule.pattern || "").toLowerCase();
    if (!pattern) {
      continue;
    }

    if (rule.type === "exact" && text === pattern) {
      return { category: rule.category, confidence: 0.98, strategy: "rule_exact" };
    }
    if (rule.type === "contains" && text.includes(pattern)) {
      return { category: rule.category, confidence: 0.92, strategy: "rule_contains" };
    }
    if (rule.type === "regex") {
      try {
        const regex = new RegExp(rule.pattern, "i");
        if (regex.test(text)) {
          return { category: rule.category, confidence: 0.9, strategy: "rule_regex" };
        }
      } catch {
        continue;
      }
    }
  }

  return null;
}

function applyMerchantMemory(memory, transaction) {
  const key = transaction.merchant_normalized;
  if (!memory[key]) {
    return null;
  }

  return {
    category: memory[key],
    confidence: 0.87,
    strategy: "merchant_memory"
  };
}

function applyKeywordModel(transaction) {
  const text = `${transaction.merchant_normalized} ${normalizeText(transaction.description)} ${normalizeText(
    transaction.memo
  )}`;

  let best = {
    category: transaction.direction === "credit" ? "Income" : "Uncategorized",
    confidence: transaction.direction === "credit" ? 0.8 : 0.45,
    strategy: "heuristic_fallback"
  };

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const matches = keywords.filter((keyword) => text.includes(keyword)).length;
    if (!matches) {
      continue;
    }

    const score = clamp(0.55 + matches * 0.12, 0, 0.9);
    if (score > best.confidence) {
      best = {
        category,
        confidence: score,
        strategy: "keyword_model"
      };
    }
  }

  return best;
}

export function categorizeTransaction({ transaction, userRules, merchantMemory }) {
  const byRule = applyRule(userRules, transaction);
  if (byRule) {
    return applyAutoCanonicalization(byRule, transaction);
  }

  const byMemory = applyMerchantMemory(merchantMemory, transaction);
  if (byMemory) {
    return applyAutoCanonicalization(byMemory, transaction);
  }

  const byTraining = resolveTrainingCategory({
    categoryRaw: transaction.category_raw,
    merchantNormalized: transaction.merchant_normalized,
    description: transaction.description,
    memo: transaction.memo
  });
  if (byTraining) {
    return applyAutoCanonicalization(byTraining, transaction);
  }

  return applyAutoCanonicalization(applyKeywordModel(transaction), transaction);
}

export function buildMerchantMemory(transactions) {
  const memory = {};
  const counts = {};

  for (const tx of transactions) {
    if (!tx.merchant_normalized || !tx.category_final) {
      continue;
    }
    const key = `${tx.merchant_normalized}::${tx.category_final}`;
    counts[key] = (counts[key] || 0) + 1;
  }

  const grouped = {};
  for (const key of Object.keys(counts)) {
    const [merchant, category] = key.split("::");
    if (!grouped[merchant]) {
      grouped[merchant] = [];
    }
    grouped[merchant].push({ category, count: counts[key] });
  }

  for (const [merchant, options] of Object.entries(grouped)) {
    options.sort((a, b) => b.count - a.count);
    memory[merchant] = options[0].category;
  }

  return memory;
}
