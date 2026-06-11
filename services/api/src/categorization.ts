import { CATEGORY_KEYWORDS } from "../../../packages/domain/src/constants.ts";
import { normalizeText, clamp } from "./utils.ts";
import { runToolCallingAgent, type AgentResult } from "./llm/agent.ts";
import { AI_TOOL_CALLING_AGENT_ENABLED } from "./flags.ts";

/** Categorization strategy identifiers */
export const CATEGORIZATION_STRATEGY = {
  RULE_EXACT: "rule_exact",
  RULE_CONTAINS: "rule_contains",
  RULE_REGEX: "rule_regex",
  MERCHANT_MEMORY: "merchant_memory",
  KEYWORD_MODEL: "keyword_model",
  BANK_ALIAS: "bank_alias",
  HEURISTIC_FALLBACK: "heuristic_fallback",
  AGENT_HISTORY: "agent_history",
  AGENT_INFERRED: "agent_inferred"
} as const;

export type CategorizationStrategy = typeof CATEGORIZATION_STRATEGY[keyof typeof CATEGORIZATION_STRATEGY];

export const AUTO_HINT_PATTERN = /\b(jeep|honda|honda finance|honda financial|american honda)\b/i;

export function applyAutoCanonicalization(result, transaction) {
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

export function applyRule(userRules, transaction) {
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
      return { category: rule.category, confidence: 0.98, strategy: CATEGORIZATION_STRATEGY.RULE_EXACT };
    }
    if (rule.type === "contains" && text.includes(pattern)) {
      return { category: rule.category, confidence: 0.92, strategy: CATEGORIZATION_STRATEGY.RULE_CONTAINS };
    }
    if (rule.type === "regex") {
      try {
        const regex = new RegExp(rule.pattern, "i");
        if (regex.test(text)) {
          return { category: rule.category, confidence: 0.9, strategy: CATEGORIZATION_STRATEGY.RULE_REGEX };
        }
      } catch {
        continue;
      }
    }
  }

  return null;
}

export function applyMerchantMemory(memory, transaction) {
  const key = transaction.merchant_normalized;
  if (!memory[key]) {
    return null;
  }

  return {
    category: memory[key],
    confidence: 0.87,
    strategy: CATEGORIZATION_STRATEGY.MERCHANT_MEMORY
  };
}

export function applyKeywordModel(transaction) {
  const text = `${transaction.merchant_normalized} ${normalizeText(transaction.description)} ${normalizeText(
    transaction.memo
  )}`;

  let best = {
    category: transaction.direction === "inflow" ? "Income" : "Uncategorized",
    confidence: transaction.direction === "inflow" ? 0.8 : 0.45,
    strategy: CATEGORIZATION_STRATEGY.HEURISTIC_FALLBACK
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
        strategy: CATEGORIZATION_STRATEGY.KEYWORD_MODEL
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

export interface CategorizationResult {
  category: string;
  confidence: number;
  strategy: string;
}

export interface CategorizeWithAgentInput {
  transaction: {
    merchant_normalized: string;
    description?: string;
    memo?: string;
    direction?: string;
    category_raw?: string;
    amount?: number;
  };
  userRules: Array<{
    type: string;
    pattern?: string;
    category: string;
    priority?: number;
  }>;
  merchantMemory: Record<string, string>;
  userId: string;
  /** Optional injected agent function for testing */
  _testAgentFn?: () => Promise<{ ok: boolean; category?: string; confidence?: number; source?: string }>;
  /** Optional override for agent enabled flag (testing only) */
  _testAgentEnabled?: boolean;
}

/**
 * Categorizes a transaction with AI agent integration.
 * Priority: rules > merchant memory > agent > keyword model
 */
export async function categorizeTransactionWithAgent(
  input: CategorizeWithAgentInput
): Promise<CategorizationResult> {
  const { transaction, userRules, merchantMemory, userId, _testAgentFn, _testAgentEnabled } = input;

  // 1. Rules-first priority
  const byRule = applyRule(userRules, transaction);
  if (byRule) {
    return applyAutoCanonicalization(byRule, transaction);
  }

  // 2. Merchant memory
  const byMemory = applyMerchantMemory(merchantMemory, transaction);
  if (byMemory) {
    return applyAutoCanonicalization(byMemory, transaction);
  }

  // 3. Agent (if enabled)
  const agentEnabled = _testAgentEnabled !== undefined ? _testAgentEnabled : AI_TOOL_CALLING_AGENT_ENABLED;
  if (agentEnabled) {
    const agentResult = await callAgentForCategorization(userId, transaction, _testAgentFn);
    if (agentResult) {
      return applyAutoCanonicalization(
        {
          category: agentResult.category,
          confidence: agentResult.confidence,
          strategy: agentResult.source === "history"
            ? CATEGORIZATION_STRATEGY.AGENT_HISTORY
            : CATEGORIZATION_STRATEGY.AGENT_INFERRED
        },
        transaction
      );
    }
  }

  // 4. Keyword model fallback
  return applyAutoCanonicalization(applyKeywordModel(transaction), transaction);
}

async function callAgentForCategorization(
  userId: string,
  transaction: CategorizeWithAgentInput["transaction"],
  testAgentFn?: CategorizeWithAgentInput["_testAgentFn"]
): Promise<{ category: string; confidence: number; source: string } | null> {
  try {
    const result = testAgentFn
      ? await testAgentFn()
      : await runToolCallingAgent({
          mode: "categorization",
          userId,
          transaction: {
            merchant: transaction.merchant_normalized,
            amount: transaction.amount ?? 0,
            description: transaction.description
          }
        });

    if (result.ok && result.category) {
      return {
        category: result.category,
        confidence: result.confidence ?? 0.5,
        source: result.source ?? "inferred"
      };
    }

    return null;
  } catch {
    return null;
  }
}
