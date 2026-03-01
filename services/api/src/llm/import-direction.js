import { requireAiFeature } from "../ai.js";
import { IMPORT_DIRECTION_LLM_ENABLED } from "../flags.js";
import { runStructuredLlm } from "./client.js";
import { buildImportDirectionPrompt } from "./prompts.js";

const ALLOWED_AMOUNT_MODES = new Set(["single_amount", "split_debit_credit"]);
const ALLOWED_SIGN_CONVENTIONS = new Set(["negative_is_debit", "positive_is_debit", "split_columns"]);

function normalizeConfidence(value, fallback = 0.5) {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return fallback;
  }
  return Math.max(0, Math.min(1, numeric));
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((entry) => String(entry || "").trim()).filter(Boolean).slice(0, 8);
}

export async function inferImportDirectionWithLlm({
  userId,
  sample,
  deterministicInference,
  requireAiFeatureFn = requireAiFeature,
  runStructuredLlmFn = runStructuredLlm
}) {
  if (!IMPORT_DIRECTION_LLM_ENABLED) {
    return { ok: false, reason: "disabled" };
  }

  let aiContext = null;
  try {
    aiContext = requireAiFeatureFn(userId, "import_mapping");
  } catch {
    return { ok: false, reason: "no_ai_setup" };
  }

  if (!["openrouter", "openai"].includes(aiContext.provider)) {
    return { ok: false, reason: "provider_not_supported" };
  }

  const { systemPrompt, userPrompt } = buildImportDirectionPrompt({
    sample,
    deterministicInference
  });

  const llm = await runStructuredLlmFn({
    provider: aiContext.provider,
    apiKey: aiContext.apiKey,
    model: aiContext.model,
    systemPrompt,
    userPrompt,
    maxTokens: 380,
    temperature: 0
  });

  if (!llm.ok) {
    return { ok: false, reason: llm.error || "llm_failed" };
  }

  const amountMode = String(llm.data?.amount_mode || deterministicInference?.amountMode || "single_amount").trim();
  if (!ALLOWED_AMOUNT_MODES.has(amountMode)) {
    return { ok: false, reason: "invalid_amount_mode" };
  }

  const rawConvention = String(llm.data?.sign_convention || "").trim();
  const signConvention = amountMode === "split_debit_credit" ? "split_columns" : rawConvention;

  if (!ALLOWED_SIGN_CONVENTIONS.has(signConvention)) {
    return { ok: false, reason: "invalid_sign_convention" };
  }

  return {
    ok: true,
    amountMode,
    signConvention,
    confidence_internal: normalizeConfidence(llm.data?.confidence_internal, 0.7),
    reason_short: String(llm.data?.reason_short || "").trim() || "LLM direction inference",
    warnings: normalizeStringArray(llm.data?.warnings),
    provider: aiContext.provider,
    model: aiContext.model
  };
}
