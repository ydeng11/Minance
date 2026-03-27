// services/api/src/llm/agent.ts

import { requireAiFeature } from "../ai.ts";
import { AI_TOOL_CALLING_AGENT_ENABLED } from "../flags.ts";
import { runToolCallingLlm, type ToolCallingMessage } from "./client.ts";
import { TOOLS_BY_MODE, type AgentMode } from "./tools.ts";
import { executeTool, type ToolExecutionContext } from "./tool-executor.ts";
import { defaultConversationStore, type ConversationSession } from "./conversation-store.ts";
import { createId, nowIso } from "../utils.ts";

const MAX_TOOL_CALLS = 5;
const AGENT_TIMEOUT_MS = 30000;

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
}

export async function runToolCallingAgent(input: AgentInput): Promise<AgentResult> {
  const startedAt = Date.now();
  const { mode, userId } = input;

  // Check feature flag
  if (!AI_TOOL_CALLING_AGENT_ENABLED) {
    return {
      ok: false,
      error: "Tool-calling agent is disabled",
      toolCallsMade: 0,
      provider: "none",
      model: "none",
      latencyMs: Date.now() - startedAt
    };
  }

  // Resolve AI provider (use injected context for testing, otherwise resolve from store)
  let aiContext;
  if (input._testAiContext) {
    aiContext = input._testAiContext;
  } else {
    try {
      aiContext = requireAiFeature(userId, mode === "qa" ? "assistant" : "categorization");
    } catch {
      return {
        ok: false,
        error: "AI setup required",
        toolCallsMade: 0,
        provider: "none",
        model: "none",
        latencyMs: Date.now() - startedAt
      };
    }
  }

  // Get tools for this mode
  const tools = TOOLS_BY_MODE[mode];
  if (!tools) {
    return {
      ok: false,
      error: `Unknown mode: ${mode}`,
      toolCallsMade: 0,
      provider: aiContext.provider,
      model: aiContext.model,
      latencyMs: Date.now() - startedAt
    };
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

  // Agent loop
  while (toolCallsMade < MAX_TOOL_CALLS) {
    // Check timeout
    if (Date.now() - startedAt > AGENT_TIMEOUT_MS) {
      return {
        ok: false,
        error: "Agent timeout",
        toolCallsMade,
        provider: aiContext.provider,
        model: aiContext.model,
        latencyMs: Date.now() - startedAt
      };
    }

    // Call LLM with tools
    const response = await runToolCallingLlm({
      provider: aiContext.provider,
      apiKey: aiContext.apiKey,
      model: aiContext.model,
      messages,
      tools
    });

    if (!response.ok) {
      return {
        ok: false,
        error: response.error || "LLM request failed",
        toolCallsMade,
        provider: aiContext.provider,
        model: aiContext.model,
        latencyMs: Date.now() - startedAt
      };
    }
    // Check if LLM wants to call tools
    if (response.toolCalls && response.toolCalls.length > 0) {
      // Add assistant message with tool calls
      messages.push({
        role: "assistant",
        content: response.content || "",
        toolCalls: response.toolCalls
      });

      // Execute each tool call
      for (const toolCall of response.toolCalls) {
        toolCallsMade++;

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

        const result = await executeTool(toolCall.function.name, args, context);

        // Check for clarification
        const data = result.success ? result.data as Record<string, unknown> | undefined : undefined;
        if (data?.needsClarification) {
          return {
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
        }

        // Check for terminal tools (assign_category, assign_results, create_recurring_suggestion)
        if (["assign_category", "assign_results", "create_recurring_suggestion"].includes(toolCall.function.name)) {
          const parsed = parseTerminalToolResult(toolCall.function.name, args, mode);
          return {
            ok: true,
            ...parsed,
            toolCallsMade,
            provider: aiContext.provider,
            model: aiContext.model,
            latencyMs: Date.now() - startedAt
          };
        }

        // Cache result for conversation references
        if (mode === "qa" && result.success) {
          const resultId = `result_${resultCache.size + 1}`;
          resultCache.set(resultId, result.data);
        }

        // Add tool result to messages
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

      return {
        ok: true,
        ...parsed,
        toolCallsMade,
        provider: aiContext.provider,
        model: aiContext.model,
        latencyMs: Date.now() - startedAt
      };
    }
  }

  // Exceeded max tool calls
  return {
    ok: false,
    error: "Maximum tool calls exceeded",
    toolCallsMade,
    provider: aiContext.provider,
    model: aiContext.model,
    latencyMs: Date.now() - startedAt
  };
}

function buildSystemPrompt(mode: AgentMode, input: AgentInput): string {
  const today = new Date().toISOString().split("T")[0];

  const prompts: Record<AgentMode, string> = {
    qa: `Today's date: ${today}

You are a personal finance assistant. Use tools to get real data.
1. Start with get_data_bounds to understand available data
2. Use appropriate date ranges based on user's question
3. If ambiguous, use ask_clarification sparingly
4. Provide specific numbers in your answer
5. For follow-ups, use reference_previous to access earlier results
6. Keep the response compact and easy to scan
7. If the user asks about a specific account, include the account filter on analytics/list tools

You can reference previous results by their ID (e.g., result_1, result_2).
Use compare_results to compare two result sets.

Output JSON: { "answer": string, "summary"?: string, "key_points"?: string[], "follow_up"?: string, "highlights": string[], "drill_down_filters": { "start"?, "end"?, "category"?, "merchant"? } }`,

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
