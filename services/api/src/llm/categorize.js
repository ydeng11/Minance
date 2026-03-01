import { DEFAULT_CATEGORIES } from "../../../../packages/domain/src/constants.js";
import { requireAiFeature } from "../ai.js";
import { AI_LLM_CATEGORIZATION_ENABLED } from "../flags.js";
import { loadStore } from "../store.js";
import { runStructuredLlm } from "./client.js";
import { buildCategorizationPrompt, buildMerchantExemplars } from "./prompts.js";

function normalizeConfidence(value, fallback = 0.5) {
  const num = Number(value);
  if (Number.isNaN(num)) {
    return fallback;
  }
  return Math.max(0, Math.min(1, num));
}

export async function categorizeTransactionWithLlm({ userId, transaction, userRules = [] }) {
  if (!AI_LLM_CATEGORIZATION_ENABLED) {
    return { ok: false, reason: "disabled" };
  }

  let aiContext = null;
  try {
    aiContext = requireAiFeature(userId, "categorization");
  } catch {
    return { ok: false, reason: "no_ai_setup" };
  }

  if (!["openrouter", "openai"].includes(aiContext.provider)) {
    return { ok: false, reason: "provider_not_supported" };
  }

  const store = loadStore();
  const userTransactions = store.transactions.filter((entry) => entry.user_id === userId);
  const exemplars = buildMerchantExemplars(userTransactions);

  const promptTx = {
    transaction_date: transaction.transaction_date,
    direction: transaction.direction,
    amount: transaction.amount,
    currency: transaction.currency,
    merchant_raw: transaction.merchant_raw,
    merchant_normalized: transaction.merchant_normalized,
    description: transaction.description,
    memo: transaction.memo,
    category_raw: transaction.category_raw,
    account_key: transaction.account_key
  };

  const { systemPrompt, userPrompt } = buildCategorizationPrompt({
    transaction: promptTx,
    userRules,
    exemplars
  });

  const llm = await runStructuredLlm({
    provider: aiContext.provider,
    apiKey: aiContext.apiKey,
    model: aiContext.model,
    systemPrompt,
    userPrompt,
    maxTokens: 350,
    temperature: 0
  });

  if (!llm.ok) {
    return { ok: false, reason: llm.error || "llm_failed" };
  }

  const category = String(llm.data?.category || "").trim();
  if (!DEFAULT_CATEGORIES.includes(category)) {
    return { ok: false, reason: "invalid_category" };
  }

  const confidenceInternal = normalizeConfidence(llm.data?.confidence_internal, 0.7);
  const reasonShort = String(llm.data?.reason_short || "").trim() || "LLM categorization";
  const signalsUsed = Array.isArray(llm.data?.signals_used)
    ? llm.data.signals_used.map((entry) => String(entry)).slice(0, 6)
    : [];

  return {
    ok: true,
    category,
    confidence_internal: confidenceInternal,
    reason_short: reasonShort,
    signals_used: signalsUsed,
    provider: aiContext.provider,
    model: aiContext.model
  };
}
