// services/api/src/llm/agent.ts

import { requireAiFeature } from "../ai.ts";
import { AI_TOOL_CALLING_AGENT_ENABLED } from "../flags.ts";
import { runToolCallingLlm, type ToolCallingMessage } from "./client.ts";
import { TOOLS_BY_MODE, type AgentMode } from "./tools.ts";
import { executeTool, type ToolExecutionContext } from "./tool-executor.ts";
import { defaultConversationStore, type ConversationSession } from "./conversation-store.ts";
import { createId, nowIso } from "../utils.ts";
import { DEFAULT_CATEGORIES } from "../../../../packages/domain/src/constants.ts";

const MAX_TOOL_CALLS = 5;
const AGENT_TIMEOUT_MS = 30000;

/** A recorded step in the agent's observable trace */
export interface TraceEntry {
  turn: number;
  type: "llm_call" | "tool_execution" | "terminal";
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  toolSuccess?: boolean;
  toolError?: string;
  llmError?: string;
  latencyMs?: number;
  llmContent?: string;
  llmToolCalls?: Array<{ name: string; args?: string }>;
  terminalType?: "final" | "clarification" | "error" | "timeout" | "max_calls";
  terminalData?: unknown;
}

export interface AgentInput {
  mode: AgentMode;
  userId: string;
  question?: string;
  transaction?: {
    id?: string;
    merchant: string;
    amount: number;
    description?: string;
    date?: string;
  };
  transactions?: Array<{
    id: string;
    merchant: string;
    amount: number;
    description?: string;
  }>;
  conversationId?: string;
  /** Optional injected AI context for testing */
  _testAiContext?: {
    provider: string;
    model: string;
    apiKey: string;
  };
  /** Optional injected LLM function (avoids global fetch for testing) */
  _runToolCallingLlmFn?: typeof runToolCallingLlm;
  /** When true, populates _trace with observable turn/action records */
  _collectTrace?: boolean;
  /** Override "today" date (YYYY-MM-DD) for reproducible date-relative evals */
  _overrideDate?: string;
}

export interface AgentResult {
  ok: boolean;
  answer?: string;
  summary?: string;
  keyPoints?: string[];
  followUp?: string;
  highlights?: string[];
  drillDownFilters?: Record<string, string>;
  clarification?: {
    question: string;
    options?: string[];
  };
  category?: string;
  direction?: "inflow" | "outflow";
  confidence?: number;
  source?: "history" | "inferred";
  isRecurring?: boolean;
  cadence?: "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly";
  suggestedAmount?: number;
  results?: Array<{
    transaction_id: string;
    category: string;
    direction: "inflow" | "outflow";
    confidence: number;
    source: "history" | "inferred";
  }>;
  toolCallsMade: number;
  provider: string;
  model: string;
  latencyMs: number;
  error?: string;
  /** Observable trace of the agent's execution. Only present when _collectTrace is true. */
  _trace?: TraceEntry[];
}

export async function runToolCallingAgent(input: AgentInput): Promise<AgentResult> {
  const startedAt = Date.now();
  const { mode, userId, _collectTrace } = input;
  const trace: TraceEntry[] = [];
  let turn = 0;

  const recordTrace = (entry: TraceEntry) => {
    if (_collectTrace) trace.push(entry);
  };

  // Check feature flag
  if (!AI_TOOL_CALLING_AGENT_ENABLED) {
    const result: AgentResult = {
      ok: false,
      error: "Tool-calling agent is disabled",
      toolCallsMade: 0,
      provider: "none",
      model: "none",
      latencyMs: Date.now() - startedAt
    };
    if (_collectTrace) result._trace = trace;
    return result;
  }

  // Resolve AI provider (use injected context for testing, otherwise resolve from store)
  let aiContext;
  if (input._testAiContext) {
    aiContext = input._testAiContext;
  } else {
    try {
      aiContext = requireAiFeature(userId, mode === "qa" ? "assistant" : "categorization");
    } catch {
      const result: AgentResult = {
        ok: false,
        error: "AI setup required",
        toolCallsMade: 0,
        provider: "none",
        model: "none",
        latencyMs: Date.now() - startedAt
      };
      if (_collectTrace) result._trace = trace;
      return result;
    }
  }

  // Get tools for this mode
  const tools = TOOLS_BY_MODE[mode];
  if (!tools) {
    const result: AgentResult = {
      ok: false,
      error: `Unknown mode: ${mode}`,
      toolCallsMade: 0,
      provider: aiContext.provider,
      model: aiContext.model,
      latencyMs: Date.now() - startedAt
    };
    if (_collectTrace) result._trace = trace;
    return result;
  }

  // Build system prompt for this mode
  const systemPrompt = buildSystemPrompt(mode, input);

  // Get or create conversation session (Q&A mode only)
  let session: ConversationSession | null = null;
  let resultCache = new Map<string, unknown>();

  if (mode === "qa" && input.conversationId) {
    session = await defaultConversationStore.get(input.conversationId);
    if (session) {
      resultCache = session.resultCache;
    }
  }

  // Initialize messages
  const messages: ToolCallingMessage[] = [
    { role: "system", content: systemPrompt }
  ];

  // Add conversation history
  if (session?.messages.length) {
    messages.push(...session.messages);
  }

  // Add current input
  if (mode === "qa" && input.question) {
    messages.push({ role: "user", content: input.question });
  } else if (mode === "categorization" && input.transaction) {
    messages.push({
      role: "user",
      content: JSON.stringify({
        task: "categorize",
        transaction: input.transaction
      })
    });
  } else if (mode === "recurring" && input.transaction) {
    messages.push({
      role: "user",
      content: JSON.stringify({
        task: "detect_recurring",
        transaction: input.transaction
      })
    });
  } else if (mode === "import" && input.transactions) {
    messages.push({
      role: "user",
      content: JSON.stringify({
        task: "process_import",
        transactions: input.transactions
      })
    });
  }

  let toolCallsMade = 0;

  // Resolve the LLM function to use (injected or default)
  const llmFn = input._runToolCallingLlmFn ?? runToolCallingLlm;

  // Agent loop
  while (toolCallsMade < MAX_TOOL_CALLS) {
    // Check timeout
    if (Date.now() - startedAt > AGENT_TIMEOUT_MS) {
      const result: AgentResult = {
        ok: false,
        error: "Agent timeout",
        toolCallsMade,
        provider: aiContext.provider,
        model: aiContext.model,
        latencyMs: Date.now() - startedAt
      };
      recordTrace({ turn, type: "terminal", terminalType: "timeout" });
      if (_collectTrace) result._trace = trace;
      return result;
    }

    turn++;

    // Call LLM with tools
    const response = await llmFn({
      provider: aiContext.provider,
      apiKey: aiContext.apiKey,
      model: aiContext.model,
      messages,
      tools
    });

    if (!response.ok) {
      const result: AgentResult = {
        ok: false,
        error: response.error || "LLM request failed",
        toolCallsMade,
        provider: aiContext.provider,
        model: aiContext.model,
        latencyMs: Date.now() - startedAt
      };
      recordTrace({ turn, type: "llm_call", latencyMs: response.latencyMs, toolName: undefined, llmError: response.error });
      if (_collectTrace) result._trace = trace;
      return result;
    }

    recordTrace({
      turn,
      type: "llm_call",
      latencyMs: response.latencyMs,
      llmContent: response.content ?? undefined,
      llmToolCalls: response.toolCalls?.map(tc => ({ name: tc.function.name, args: tc.function.arguments }))
    });

    // Check if LLM wants to call tools
    if (response.toolCalls && response.toolCalls.length > 0) {
      // Add assistant message with tool calls
      messages.push({
        role: "assistant",
        content: response.content || "",
        toolCalls: response.toolCalls
      });

      // Execute each tool call — each counts toward MAX_TOOL_CALLS
      for (const toolCall of response.toolCalls) {
        toolCallsMade++;

        // Check if we've exceeded the limit mid-batch
        if (toolCallsMade > MAX_TOOL_CALLS) {
          const result: AgentResult = {
            ok: false,
            error: "Maximum tool calls exceeded",
            toolCallsMade,
            provider: aiContext.provider,
            model: aiContext.model,
            latencyMs: Date.now() - startedAt
          };
          recordTrace({ turn, type: "terminal", terminalType: "max_calls" });
          if (_collectTrace) result._trace = trace;
          return result;
        }

        let args: Record<string, unknown>;
        try {
          args = JSON.parse(toolCall.function.arguments);
        } catch {
          args = {};
        }

        const context: ToolExecutionContext = {
          userId,
          resultCache,
          conversationId: input.conversationId
        };

        const toolStart = Date.now();
        const result = await executeTool(toolCall.function.name, args, context);
        const toolLatency = Date.now() - toolStart;

        recordTrace({
          turn,
          type: "tool_execution",
          toolName: toolCall.function.name,
          toolArgs: args,
          toolSuccess: result.success,
          toolError: result.success ? undefined : result.error,
          latencyMs: toolLatency
        });

        // Check for clarification
        const data = result.success ? result.data as Record<string, unknown> | undefined : undefined;
        if (data?.needsClarification) {
          const resultVal: AgentResult = {
            ok: true,
            clarification: {
              question: String(data.question || "Could you provide more details?"),
              options: Array.isArray(data.options) ? data.options.map(String) : undefined
            },
            toolCallsMade,
            provider: aiContext.provider,
            model: aiContext.model,
            latencyMs: Date.now() - startedAt
          };
          recordTrace({ turn, type: "terminal", terminalType: "clarification", terminalData: resultVal.clarification });
          if (_collectTrace) resultVal._trace = trace;
          return resultVal;
        }

        // Check for terminal tools (assign_category, assign_results, create_recurring_suggestion)
        if (["assign_category", "assign_results", "create_recurring_suggestion"].includes(toolCall.function.name)) {
          // Validate terminal tool arguments before accepting
          const validationError = validateTerminalToolArgs(toolCall.function.name, args);
          if (validationError) {
            // Return error to agent loop so LLM can retry
            messages.push({
              role: "tool",
              toolCallId: toolCall.id,
              content: JSON.stringify({ success: false, error: validationError })
            });
            continue;
          }

          const parsed = parseTerminalToolResult(toolCall.function.name, args, mode);
          const resultVal: AgentResult = {
            ok: true,
            ...parsed,
            toolCallsMade,
            provider: aiContext.provider,
            model: aiContext.model,
            latencyMs: Date.now() - startedAt
          };
          recordTrace({ turn, type: "terminal", terminalType: "final", terminalData: parsed });
          if (_collectTrace) resultVal._trace = trace;
          return resultVal;
        }

        // Cache result for conversation references
        if (mode === "qa" && result.success) {
          const resultId = `result_${resultCache.size + 1}`;
          resultCache.set(resultId, result.data);
        }

        // Add tool result to messages (success or failure — LLM sees both)
        messages.push({
          role: "tool",
          toolCallId: toolCall.id,
          content: JSON.stringify(result)
        });
      }

      continue;
    }

    // LLM provided a final response
    if (response.content) {
      messages.push({
        role: "assistant",
        content: response.content
      });

      const parsed = parseAgentResponse(response.content, mode);

      // Update conversation session
      if (mode === "qa" && input.conversationId) {
        await updateConversationSession(input.conversationId, userId, messages, resultCache);
      }

      const resultVal: AgentResult = {
        ok: true,
        ...parsed,
        toolCallsMade,
        provider: aiContext.provider,
        model: aiContext.model,
        latencyMs: Date.now() - startedAt
      };
      recordTrace({ turn, type: "terminal", terminalType: "final", terminalData: parsed });
      if (_collectTrace) resultVal._trace = trace;
      return resultVal;
    }
  }

  // Exceeded max tool calls
  const result: AgentResult = {
    ok: false,
    error: "Maximum tool calls exceeded",
    toolCallsMade,
    provider: aiContext.provider,
    model: aiContext.model,
    latencyMs: Date.now() - startedAt
  };
  recordTrace({ turn, type: "terminal", terminalType: "max_calls" });
  if (_collectTrace) result._trace = trace;
  return result;
}

function buildSystemPrompt(mode: AgentMode, input: AgentInput): string {
  const today = input._overrideDate || new Date().toISOString().split("T")[0];

  const prompts: Record<AgentMode, string> = {
    qa: `Today's date: ${today}

You are a personal finance assistant. Call the right tool, get data, then present a clear answer.

## RULES

1. Avoid ask_clarification. The user expects an answer, not a question. Make reasonable assumptions:
   - No time period specified → use range "all" (all available data).
   - "Last month" → compute start/end dates from today and pass them.
   - Always try the appropriate analytics tool before resorting to ask_clarification.

2. Always include the actual dollar amounts from tool results. Never give a vague answer.
   Bad: "You spent on dining last month"
   Good: "You spent $450.23 on dining last month across 19 transactions"

3. Keep the answer compact, scannable, and data-driven. One short paragraph is ideal.

## Tool reference
- get_overview: total spending, income, net flow, or filter by category/merchant/account
- get_category_breakdown: spending by category, top categories
- get_merchant_breakdown: spending by merchant, top merchants
- get_anomalies: unusual or suspicious transactions
- list_transactions: specific transactions, optionally filtered by merchant
- get_data_bounds: what date range of data exists (optional, call only if you need this info)
- compare_results: compare two previously cached results
- reference_previous: fetch a result from earlier in the conversation
- ask_clarification: LAST RESORT — ask only when you truly can't proceed

**Result IDs**: After each tool call, the result is cached as result_1, result_2, etc. Use these IDs with reference_previous or compare_results.

## Output format (return ONLY this JSON, no markdown)
{
  "answer": "Your response to the user with specific dollar amounts",
  "summary": "One-line summary",
  "key_points": ["Bullet 1", "Bullet 2"],
  "highlights": ["Top finding"],
  "drill_down_filters": { "start": "2026-01-01", "end": "2026-01-31" }
}`,

    categorization: `You are categorizing a transaction.
1. Get all available categories with get_categories
2. Check if merchant exists in history with get_merchant_history
3. If found in history, use the same category
4. If not found, infer the best category based on merchant name and amount
5. Call assign_category with your final decision

Output JSON: { "category": string, "confidence": number, "source": "history" | "inferred" }`,

    recurring: `You are detecting if a transaction might be recurring.
1. First, decide if this transaction type could be recurring (subscriptions, bills, etc.)
2. If potentially recurring, get 6-month history with get_merchant_transactions_6_months
3. Analyze the dates and amounts for patterns (weekly, monthly, quarterly, yearly)
4. If pattern found with consistent amounts (within 5%), call create_recurring_suggestion
5. If no pattern or not recurring type, respond without calling create_recurring_suggestion

Output JSON: { "is_recurring": boolean, "cadence"?: "weekly"|"biweekly"|"monthly"|"quarterly"|"yearly", "suggested_amount"?: number, "confidence"?: number }`,

    import: `You are processing imported transactions.
1. Get categories with get_categories
2. For each transaction, check merchant history with get_merchant_history
3. If merchant in history: use history's category and direction
4. If not in history: infer category from merchant/amount, direction from amount sign
5. Call assign_results with all processed transactions

Output JSON: { "results": [{ "transaction_id": string, "category": string, "direction": "inflow"|"outflow", "confidence": number, "source": "history"|"inferred" }] }`
  };

  return prompts[mode];
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function readStringList(value: unknown, limit = 4): string[] {
  return Array.isArray(value) ? value.slice(0, limit).map(String) : [];
}

function parseAgentResponse(content: string, mode: AgentMode): Partial<AgentResult> {
  try {
    const parsed = JSON.parse(content);

    if (mode === "qa") {
      const keyPoints = readStringList(parsed.key_points);
      return {
        answer: String(parsed.answer || content),
        summary: readOptionalString(parsed.summary),
        keyPoints: keyPoints.length ? keyPoints : readStringList(parsed.keyPoints),
        followUp: readOptionalString(parsed.follow_up) || readOptionalString(parsed.followUp),
        highlights: readStringList(parsed.highlights),
        drillDownFilters: sanitizeFilters(parsed.drill_down_filters)
      };
    }

    if (mode === "categorization") {
      return {
        category: String(parsed.category || ""),
        confidence: Number(parsed.confidence) || 0.5,
        source: parsed.source === "history" || parsed.source === "inferred" ? parsed.source : "inferred"
      };
    }

    if (mode === "recurring") {
      return {
        isRecurring: Boolean(parsed.is_recurring),
        cadence: parsed.cadence,
        suggestedAmount: parsed.suggested_amount ? Number(parsed.suggested_amount) : undefined,
        confidence: parsed.confidence ? Number(parsed.confidence) : undefined
      };
    }

    if (mode === "import") {
      return {
        results: Array.isArray(parsed.results) ? parsed.results.map((r: Record<string, unknown>) => ({
          transaction_id: String(r.transaction_id),
          category: String(r.category),
          direction: r.direction === "inflow" || r.direction === "outflow" ? r.direction : "outflow",
          confidence: Number(r.confidence) || 0.5,
          source: r.source === "history" || r.source === "inferred" ? r.source : "inferred"
        })) : []
      };
    }
  } catch {
    // Return as plain text answer for Q&A mode
    if (mode === "qa") {
      return { answer: content, keyPoints: [], highlights: [], drillDownFilters: {} };
    }
  }

  return {};
}

/**
 * Validate terminal-tool arguments before accepting them.
 * Returns an error string if invalid, or undefined if valid.
 */
function validateTerminalToolArgs(toolName: string, args: Record<string, unknown>): string | undefined {
  const ALLOWED_CATEGORIES = DEFAULT_CATEGORIES;
  const VALID_CADENCES = ["weekly", "biweekly", "monthly", "quarterly", "yearly"];
  const VALID_SOURCES = ["history", "inferred"];
  const VALID_DIRECTIONS = ["inflow", "outflow"];

  if (toolName === "assign_category") {
    if (!args.category || typeof args.category !== "string" || !ALLOWED_CATEGORIES.includes(args.category)) {
      return `Invalid category: "${args.category}". Must be one of: ${ALLOWED_CATEGORIES.join(", ")}`;
    }
    const confidence = Number(args.confidence);
    if (Number.isNaN(confidence) || confidence < 0 || confidence > 1) {
      return `Invalid confidence: ${args.confidence}. Must be a number in [0, 1].`;
    }
    if (!VALID_SOURCES.includes(args.source as string)) {
      return `Invalid source: "${args.source}". Must be "history" or "inferred".`;
    }
    return undefined;
  }

  if (toolName === "create_recurring_suggestion") {
    if (!args.merchant || typeof args.merchant !== "string" || !args.merchant.trim()) {
      return "Merchant is required.";
    }
    if (!VALID_CADENCES.includes(args.cadence as string)) {
      return `Invalid cadence: "${args.cadence}". Must be one of: ${VALID_CADENCES.join(", ")}`;
    }
    const amount = Number(args.suggested_amount);
    if (Number.isNaN(amount) || amount <= 0) {
      return `Invalid suggested_amount: ${args.suggested_amount}. Must be a positive number.`;
    }
    const confidence = Number(args.confidence);
    if (Number.isNaN(confidence) || confidence < 0 || confidence > 1) {
      return `Invalid confidence: ${args.confidence}. Must be a number in [0, 1].`;
    }
    return undefined;
  }

  if (toolName === "assign_results") {
    if (!Array.isArray(args.results)) {
      return "results must be an array.";
    }
    for (let i = 0; i < args.results.length; i++) {
      const r = args.results[i] as Record<string, unknown>;
      if (!r.transaction_id || typeof r.transaction_id !== "string") {
        return `results[${i}].transaction_id is required.`;
      }
      if (!r.category || typeof r.category !== "string" || !ALLOWED_CATEGORIES.includes(r.category)) {
        return `results[${i}].category invalid: "${r.category}".`;
      }
      if (!VALID_DIRECTIONS.includes(r.direction as string)) {
        return `results[${i}].direction invalid: "${r.direction}".`;
      }
      const conf = Number(r.confidence);
      if (Number.isNaN(conf) || conf < 0 || conf > 1) {
        return `results[${i}].confidence invalid: ${r.confidence}.`;
      }
      if (!VALID_SOURCES.includes(r.source as string)) {
        return `results[${i}].source invalid: "${r.source}".`;
      }
    }
    return undefined;
  }

  return undefined;
}

function parseTerminalToolResult(
  toolName: string,
  args: Record<string, unknown>,
  mode: AgentMode
): Partial<AgentResult> {
  if (toolName === "assign_category") {
    return {
      category: String(args.category || ""),
      confidence: Number(args.confidence) || 0.5,
      source: args.source === "history" || args.source === "inferred" ? args.source : "inferred"
    };
  }

  if (toolName === "create_recurring_suggestion") {
    return {
      isRecurring: true,
      cadence: args.cadence as "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly" | undefined,
      suggestedAmount: args.suggested_amount ? Number(args.suggested_amount) : undefined,
      confidence: args.confidence ? Number(args.confidence) : undefined
    };
  }

  if (toolName === "assign_results") {
    const results = Array.isArray(args.results) ? args.results.map((r: Record<string, unknown>) => ({
      transaction_id: String(r.transaction_id),
      category: String(r.category),
      direction: r.direction === "inflow" || r.direction === "outflow" ? r.direction : "outflow",
      confidence: Number(r.confidence) || 0.5,
      source: r.source === "history" || r.source === "inferred" ? r.source : "inferred"
    })) : [];
    return { results };
  }

  return {};
}

function sanitizeFilters(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") return {};

  const out: Record<string, string> = {};
  const allowed = ["start", "end", "range", "category", "merchant"];

  for (const key of allowed) {
    const v = (value as Record<string, unknown>)[key];
    if (v != null && v !== "") {
      out[key] = String(v);
    }
  }

  return out;
}

async function updateConversationSession(
  conversationId: string,
  userId: string,
  messages: ToolCallingMessage[],
  resultCache: Map<string, unknown>
): Promise<void> {
  const session: ConversationSession = {
    id: conversationId,
    userId,
    messages: messages.filter(m => m.role !== "system"),
    resultCache,
    createdAt: nowIso(),
    expiresAt: new Date(Date.now() + 3600000).toISOString()
  };

  await defaultConversationStore.set(conversationId, session);
}

export function createConversationId(): string {
  return createId("conv");
}
