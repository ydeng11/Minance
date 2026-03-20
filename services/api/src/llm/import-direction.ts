import { requireAiFeature } from "../ai.ts";
import { IMPORT_DIRECTION_LLM_ENABLED, AI_TOOL_CALLING_AGENT_ENABLED } from "../flags.ts";
import { runStructuredLlm } from "./client.ts";
import { buildImportDirectionPrompt } from "./prompts.ts";
import { runToolCallingAgent } from "./agent.ts";

const ALLOWED_AMOUNT_MODES = new Set(["single_amount", "split_outflow_inflow"]);
const ALLOWED_SIGN_CONVENTIONS = new Set(["negative_is_outflow", "positive_is_outflow", "split_columns"]);
export const IMPORT_BATCH_SIZE = 15;

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
  const signConvention = amountMode === "split_outflow_inflow" ? "split_columns" : rawConvention;

  // Map legacy sign conventions for backward compatibility
  const mappedConvention = signConvention === "negative_is_debit" ? "negative_is_outflow"
    : signConvention === "positive_is_debit" ? "positive_is_outflow"
      : signConvention;

  if (!ALLOWED_SIGN_CONVENTIONS.has(mappedConvention)) {
    return { ok: false, reason: "invalid_sign_convention" };
  }

  return {
    ok: true,
    amountMode,
    signConvention: mappedConvention,
    confidence_internal: normalizeConfidence(llm.data?.confidence_internal, 0.7),
    reason_short: String(llm.data?.reason_short || "").trim() || "LLM direction inference",
    warnings: normalizeStringArray(llm.data?.warnings),
    provider: aiContext.provider,
    model: aiContext.model
  };
}

export interface ImportBatchTransaction {
  id: string;
  merchant: string;
  amount: number;
  description?: string;
}

export interface ImportBatchResult {
  transaction_id: string;
  category: string;
  direction: "inflow" | "outflow";
  confidence: number;
  source: "history" | "inferred";
}

export interface ProcessImportBatchInput {
  userId: string;
  transactions: ImportBatchTransaction[];
  /** Optional injected AI context for testing */
  _testAiContext?: {
    provider: string;
    model: string;
    apiKey: string;
  };
  /** Optional injected agent function for testing */
  _testAgent?: typeof runToolCallingAgent;
}

export interface ProcessImportBatchOutput {
  ok: boolean;
  results: ImportBatchResult[];
  provider?: string;
  model?: string;
  latencyMs: number;
  error?: string;
}

/**
 * Process a batch of imported transactions using the tool-calling agent.
 * Batches up to 15 transactions per agent call.
 * On failure, returns uncategorized results (doesn't block the import).
 */
export async function processImportBatch(input: ProcessImportBatchInput): Promise<ProcessImportBatchOutput> {
  const startedAt = Date.now();
  const { userId, transactions, _testAiContext, _testAgent } = input;

  // Check feature flag
  if (!AI_TOOL_CALLING_AGENT_ENABLED) {
    return {
      ok: false,
      results: createUncategorizedResults(transactions),
      latencyMs: Date.now() - startedAt,
      error: "Tool-calling agent is disabled"
    };
  }

  // Validate batch size
  if (transactions.length === 0) {
    return {
      ok: true,
      results: [],
      latencyMs: Date.now() - startedAt
    };
  }

  if (transactions.length > IMPORT_BATCH_SIZE) {
    return {
      ok: false,
      results: createUncategorizedResults(transactions),
      latencyMs: Date.now() - startedAt,
      error: `Batch size exceeds maximum of ${IMPORT_BATCH_SIZE}`
    };
  }

  // Resolve AI provider
  let aiContext;
  if (_testAiContext) {
    aiContext = _testAiContext;
  } else {
    try {
      aiContext = requireAiFeature(userId, "categorization");
    } catch {
      return {
        ok: false,
        results: createUncategorizedResults(transactions),
        latencyMs: Date.now() - startedAt,
        error: "AI setup required"
      };
    }
  }

  // Run the tool-calling agent
  const agentFn = _testAgent || runToolCallingAgent;

  try {
    const result = await agentFn({
      mode: "import",
      userId,
      transactions: transactions.map(t => ({
        id: t.id,
        merchant: t.merchant,
        amount: t.amount,
        description: t.description
      })),
      _testAiContext
    });

    if (!result.ok) {
      return {
        ok: false,
        results: createUncategorizedResults(transactions),
        provider: result.provider,
        model: result.model,
        latencyMs: Date.now() - startedAt,
        error: result.error
      };
    }

    // Map results back to transaction IDs
    const resultMap = new Map<string, ImportBatchResult>();
    if (result.results) {
      for (const r of result.results) {
        resultMap.set(r.transaction_id, {
          transaction_id: r.transaction_id,
          category: r.category,
          direction: r.direction,
          confidence: r.confidence,
          source: r.source
        });
      }
    }

    // Build final results, using uncategorized for any missing transactions
    const finalResults: ImportBatchResult[] = transactions.map(t => {
      const existing = resultMap.get(t.id);
      if (existing) {
        return existing;
      }
      // Fallback to uncategorized for missing results
      return {
        transaction_id: t.id,
        category: "Uncategorized",
        direction: inferDirectionFromAmount(t.amount),
        confidence: 0.3,
        source: "inferred" as const
      };
    });

    return {
      ok: true,
      results: finalResults,
      provider: result.provider,
      model: result.model,
      latencyMs: Date.now() - startedAt
    };
  } catch (error) {
    // Log error for debugging, but don't block import
    console.error("processImportBatch error:", error);

    return {
      ok: false,
      results: createUncategorizedResults(transactions),
      provider: aiContext?.provider,
      model: aiContext?.model,
      latencyMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Create uncategorized results for all transactions.
 * Used as fallback when agent fails or is disabled.
 */
function createUncategorizedResults(transactions: ImportBatchTransaction[]): ImportBatchResult[] {
  return transactions.map(t => ({
    transaction_id: t.id,
    category: "Uncategorized",
    direction: inferDirectionFromAmount(t.amount),
    confidence: 0.3,
    source: "inferred" as const
  }));
}

/**
 * Infer direction from amount sign.
 * Positive amounts are typically outflows (payments/purchases).
 * Negative amounts are typically inflows (refunds/deposits).
 */
function inferDirectionFromAmount(amount: number): "inflow" | "outflow" {
  // If amount is negative, it's likely an inflow (refund, deposit)
  // If amount is positive, it's likely an outflow (purchase, payment)
  return amount < 0 ? "inflow" : "outflow";
}
