// services/api/src/llm/agent.ts

import { requireAiFeature } from "../ai.ts";
import { AI_TOOL_CALLING_AGENT_ENABLED } from "../flags.ts";
import { runToolCallingLlm, type ToolCallingMessage } from "./client.ts";
import { TOOLS_BY_MODE, type AgentMode } from "./tools.ts";
import { defaultConversationStore, type ConversationSession } from "./conversation-store.ts";
import { createId, nowIso } from "../utils.ts";
import { DEFAULT_CATEGORIES } from "../../../../packages/domain/src/constants.ts";
import { ALL_TOOLS, type ToolSpec, type ToolCategory, type ToolExecutionContext } from "./tool-spec.ts";

// ---------------------------------------------------------------------------
// Tool dispatch: ToolSpec-based (single source of truth)
// ---------------------------------------------------------------------------

const toolDispatch = new Map<string, ToolSpec>();
for (const t of ALL_TOOLS) {
  toolDispatch.set(t.name, t);
}

async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  context: ToolExecutionContext
): Promise<{ success: boolean; data?: unknown; error?: string; blocks?: Array<{ type: string; data: unknown }> }> {
  const spec = toolDispatch.get(toolName);
  if (!spec) {
    return { success: false, error: `Unknown tool: ${toolName}` };
  }
  try {
    if (context._now) {
      (args as Record<string, unknown>)._now = context._now;
    }
    const result = await spec.execute(context, args);
    return { success: result.success, data: result.data, error: result.error, blocks: result.blocks };
  } catch (err) {
    return {
      success: false,
      error: `Tool ${toolName} threw: ${err instanceof Error ? err.message : String(err)}`
    };
  }
}

const MAX_TOOL_CALLS = 5;
const AGENT_TIMEOUT_MS = 30000;

// ---------------------------------------------------------------------------
// Capability registry
// ---------------------------------------------------------------------------

interface CapabilityDefinition {
  id: string;
  name: string;
  description: string;
  /** Explicit list of tool names this capability enables */
  tools: string[];
  /** System prompt segment to append */
  systemPromptSegment: string;
}

const CAPABILITIES: Map<string, CapabilityDefinition> = new Map();

function defineCapability(def: CapabilityDefinition): CapabilityDefinition {
  CAPABILITIES.set(def.id, def);
  return def;
}

// Built-in analytics capability (maps from mode: "qa")
defineCapability({
  id: "analytics",
  name: "Spending Analytics",
  description: "Analyze transaction data, spending patterns, categories, and merchants",
  tools: [
    "get_data_bounds", "get_overview", "get_category_breakdown",
    "get_merchant_breakdown", "get_anomalies", "list_transactions",
    "reference_previous", "compare_results", "ask_clarification"
  ],
  systemPromptSegment: `
## Spending Analytics
- General spending questions \u2192 get_overview (with specific dates if mentioned)
- Category breakdowns \u2192 get_category_breakdown
- Merchant breakdowns \u2192 get_merchant_breakdown
- Unusual transactions \u2192 get_anomalies
- Transaction listing \u2192 list_transactions
- Compare periods \u2192 get_overview twice then compare_results`
});

// Subscriptions / recurring capability
defineCapability({
  id: "subscriptions",
  name: "Subscriptions & Recurring Charges",
  description: "Track subscriptions, recurring bills, and detect recurring spending patterns",
  tools: [
    "list_recurring_rules", "list_recurring_suggestions",
    "detect_recurring_patterns", "explain_recurring_rule",
    "create_recurring_rule", "dismiss_recurring_suggestion"
  ],
  systemPromptSegment: `
## Subscriptions & Recurring
- "What subscriptions do I have?" \u2192 list_recurring_rules
- "Find recurring charges for [merchant]" \u2192 detect_recurring_patterns (deterministic, runs on transaction data)
- "Show pending suggestions" \u2192 list_recurring_suggestions
- "Explain my [rule] subscription" \u2192 explain_recurring_rule (shows annual cost, next date, changes)
- "Create a rule for [merchant]" \u2192 create_recurring_rule with _mode=preview first, ask user to confirm, then _mode=execute
- "Dismiss suggestion" \u2192 dismiss_recurring_suggestion with _mode=preview first, then _mode=execute after confirm`
});

// Credit card benefits capability
defineCapability({
  id: "benefits",
  name: "Credit Card Benefits",
  description: "Track credit card rewards, benefit caps, annual fees, and find the best card to use",
  tools: [
    "list_credit_cards", "get_card_benefits", "get_benefit_usage",
    "get_best_card_for_category", "get_annual_fee_analysis",
    "get_annual_credits", "save_card_benefit", "delete_card_benefit"
  ],
  systemPromptSegment: `
## Credit Card Benefits
- "What cards do I have?" \u2192 list_credit_cards
- "What are the benefits for [card]?" \u2192 get_card_benefits
- "How much [category] cashback have I used?" \u2192 get_benefit_usage
- "Which card should I use for [category]?" \u2192 get_best_card_for_category (considers caps, not just rates)
- "Is my [card] worth the annual fee?" \u2192 get_annual_fee_analysis
- "What annual credits do I have left?" \u2192 get_annual_credits
- To add a benefit: save_card_benefit with _mode=preview first, then _mode=execute after user confirms
- To delete a benefit: delete_card_benefit with _mode=preview first, then _mode=execute after confirm`
});

// Budgeting capability
defineCapability({
  id: "budgeting",
  name: "Budgeting & Trends",
  description: "Track spending trends, compare to budget targets, and forecast recurring charges",
  tools: [
    "get_spending_trends", "get_recurring_forecast",
    "get_budget_comparison", "save_budget_target"
  ],
  systemPromptSegment: `
## Budgeting & Trends
- "Am I spending more than before?" \u2192 get_spending_trends (month-over-month analysis)
- "What recurring charges are coming up?" \u2192 get_recurring_forecast
- "How am I doing against my budget?" \u2192 get_budget_comparison
- "Set a budget for [category]" \u2192 save_budget_target with _mode=preview first, then _mode=execute after confirm
- For general financial education, I explain concepts using your data. I do not invent current rates or provide personalized financial advice.`
});

// Maps legacy mode to capability IDs
const MODE_TO_CAPABILITIES: Record<string, string[]> = {
  qa: ["analytics"],
  categorization: [],    // These modes use their own hardcoded tools/prompts
  recurring: [],
  import: []
};

/** Get the tool schemas for a set of capabilities */
function getCapabilityTools(capIds: string[]): ToolSpec[] {
  const names = new Set<string>();

  for (const id of capIds) {
    const cap = CAPABILITIES.get(id);
    if (!cap) continue;
    for (const n of cap.tools) names.add(n);
  }

  if (names.size === 0) return [];

  return ALL_TOOLS.filter((t) => names.has(t.name));
}

/** Build combined system prompt from capabilities */
function buildCapabilitySystemPrompt(capIds: string[], existingPrompt: string): string {
  const segments = capIds
    .map((id) => CAPABILITIES.get(id))
    .filter(Boolean)
    .map((cap) => cap!.systemPromptSegment);
  if (segments.length === 0) return existingPrompt;
  return existingPrompt + "\n\n" + segments.join("\n");
}

/** Extend the context with date overrides for deterministic calculations */
export interface ToolExecutionContextWithDate extends ToolExecutionContext {
  /** Override "now" for deterministic date-relative calculations */
  _now?: Date;
}

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
  /** Legacy mode selector. Maps to capabilities automatically. */
  mode?: AgentMode;
  /** Explicit capability IDs (e.g. ["analytics", "subscriptions", "benefits"]) */
  capabilities?: string[];
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
  /** Confirmation preview data */
  confirmationPreview?: Record<string, unknown>;
  pendingActionKey?: string;
  /** Structured data for API response */
  subscriptions?: Array<{ merchant: string; cadence: string; amount: number; nextDate?: string; status: string }>;
  cardBenefits?: Array<{ cardName: string; benefitType: string; category?: string; rate: number; used: number; cap: number | null; remaining: number | null }>;
  budgetComparison?: Array<{ category: string; actual: number; target: number | null; difference: number }>;
  /** Observable trace of the agent's execution. Only present when _collectTrace is true. */
  _trace?: TraceEntry[];
}

export async function runToolCallingAgent(input: AgentInput): Promise<AgentResult> {
  const startedAt = Date.now();
  const { mode: inputMode, capabilities: inputCapabilities, userId, _collectTrace } = input;
  const trace: TraceEntry[] = [];
  let turn = 0;

  const recordTrace = (entry: TraceEntry) => {
    if (_collectTrace) trace.push(entry);
  };

  // Resolve capabilities: explicit > mode mapping > default
  const resolvedCapabilities = inputCapabilities?.length
    ? inputCapabilities
    : (inputMode ? MODE_TO_CAPABILITIES[inputMode] ?? [] : []);

  // Resolve mode for backward compat (legacy modes that don't use capabilities)
  const mode: AgentMode = inputMode || "qa";

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

  // Get tools: if capabilities are resolved, use capability-derived tools;
  // otherwise fall back to legacy TOOLS_BY_MODE
  const tools = resolvedCapabilities.length > 0
    ? getCapabilityTools(resolvedCapabilities).map((t) => t.schema)
    : TOOLS_BY_MODE[mode];

  if (!tools || tools.length === 0) {
    const result: AgentResult = {
      ok: false,
      error: `No tools available for ${mode}`,
      toolCallsMade: 0,
      provider: aiContext.provider,
      model: aiContext.model,
      latencyMs: Date.now() - startedAt
    };
    if (_collectTrace) result._trace = trace;
    return result;
  }

  // Build system prompt
  const basePrompt = buildSystemPrompt(mode, input);
  const systemPrompt = resolvedCapabilities.length > 0
    ? buildCapabilitySystemPrompt(resolvedCapabilities, basePrompt)
    : basePrompt;

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
  // Accumulate structured data from tool results for the final response
  const structuredData: Record<string, unknown> = {};

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

        // Compute override date for deterministic calculations
        const nowDate = input._overrideDate
          ? new Date(input._overrideDate + "T12:00:00Z")
          : undefined;

        const context: ToolExecutionContext = {
          userId,
          resultCache,
          conversationId: input.conversationId,
          _now: nowDate
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

        // Check for confirmation requirement (requiresConfirmation tools in preview mode)
        if (result.success && result.data && typeof result.data === "object") {
          const d = result.data as Record<string, unknown>;
          if (d._requiresConfirmation === true) {
            // Store the pending action so we can replay it on confirmation
            const { storePendingAction } = await import("./pending-actions.ts");
            const pendingKey = storePendingAction(
              userId,
              input.conversationId || "",
              toolCall.function.name,
              args,
              (d.preview as Record<string, unknown>) || {}
            );

            const clarificationResult: AgentResult = {
              ok: true,
              clarification: {
                question: String(d.confirmationQuestion || "Do you want to proceed?"),
                options: ["Yes, confirm", "No, cancel"]
              },
              toolCallsMade,
              provider: aiContext.provider,
              model: aiContext.model,
              latencyMs: Date.now() - startedAt
            };
            // Include preview data so the frontend can render it
            (clarificationResult as Record<string, unknown>).confirmationPreview = d.preview;
            // Store the pending key so the UI can pass it back
            (clarificationResult as Record<string, unknown>).pendingActionKey = pendingKey;
            recordTrace({
              turn, type: "terminal", terminalType: "clarification",
              terminalData: { confirmationQuestion: d.confirmationQuestion, preview: d.preview, pendingActionKey: pendingKey }
            });
            if (_collectTrace) clarificationResult._trace = trace;
            return clarificationResult;
          }
        }

        // Cache result for conversation references
        if (mode === "qa" && result.success) {
          const resultId = `result_${resultCache.size + 1}`;
          resultCache.set(resultId, result.data);
        }

        // Extract structured blocks from ToolResult (generic — no tool-name special cases)
        if (result.success && result.blocks) {
          for (const block of result.blocks) {
            if (block.type === "subscriptions") {
              structuredData.subscriptions = block.data as Array<Record<string, unknown>>;
            } else if (block.type === "cardBenefits") {
              structuredData.cardBenefits = block.data as Array<Record<string, unknown>>;
            } else if (block.type === "budgetComparison") {
              structuredData.budgetComparison = block.data as Array<Record<string, unknown>>;
            }
          }
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
        ...(structuredData.subscriptions ? { subscriptions: structuredData.subscriptions } : {}),
        ...(structuredData.cardBenefits ? { cardBenefits: structuredData.cardBenefits } : {}),
        ...(structuredData.budgetComparison ? { budgetComparison: structuredData.budgetComparison } : {}),
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
