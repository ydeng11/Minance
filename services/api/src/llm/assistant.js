import { requireAiFeature } from "../ai.js";
import { AI_LLM_ASSISTANT_SYNTHESIS_ENABLED } from "../flags.js";
import { runStructuredLlm } from "./client.js";
import { buildAssistantSynthesisPrompt } from "./prompts.js";

function sanitizeFilters(value) {
  if (!value || typeof value !== "object") {
    return {};
  }

  const out = {};
  for (const key of ["start", "end", "range", "category", "merchant"]) {
    if (value[key] != null && value[key] !== "") {
      out[key] = String(value[key]);
    }
  }
  return out;
}

export async function synthesizeAssistantAnswerWithLlm({
  userId,
  question,
  plan,
  deterministicResult
}) {
  if (!AI_LLM_ASSISTANT_SYNTHESIS_ENABLED) {
    return { ok: false, reason: "disabled" };
  }

  let aiContext = null;
  try {
    aiContext = requireAiFeature(userId, "assistant");
  } catch {
    return { ok: false, reason: "no_ai_setup" };
  }

  if (!["openrouter", "openai"].includes(aiContext.provider)) {
    return { ok: false, reason: "provider_not_supported" };
  }

  const { systemPrompt, userPrompt } = buildAssistantSynthesisPrompt({
    question,
    plan,
    deterministicResult
  });

  const llm = await runStructuredLlm({
    provider: aiContext.provider,
    apiKey: aiContext.apiKey,
    model: aiContext.model,
    systemPrompt,
    userPrompt,
    maxTokens: 450,
    temperature: 0.2
  });

  if (!llm.ok) {
    return { ok: false, reason: llm.error || "llm_failed" };
  }

  const answer = String(llm.data?.answer || "").trim();
  if (!answer) {
    return { ok: false, reason: "empty_answer" };
  }

  const highlights = Array.isArray(llm.data?.highlights)
    ? llm.data.highlights.map((entry) => String(entry)).filter(Boolean).slice(0, 4)
    : [];

  const drillDownFilters = sanitizeFilters(llm.data?.drill_down_filters);

  return {
    ok: true,
    answer,
    highlights,
    drillDownFilters,
    provider: aiContext.provider,
    model: aiContext.model
  };
}
