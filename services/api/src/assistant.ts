import { loadStore, saveStore, addAuditEvent } from "./store.ts";
import { requireAiFeature } from "./ai.ts";
import { createId, nowIso } from "./utils.ts";
import { runToolCallingAgent, createConversationId } from "./llm/agent.ts";
import { defaultConversationStore, type ConversationSession } from "./llm/conversation-store.ts";
import { AI_TOOL_CALLING_AGENT_ENABLED, AI_CARD_BENEFITS_ENABLED } from "./flags.ts";
import type { AgentResult } from "./llm/agent.ts";

function buildDrillDownUrl(filters) {
  const params = new URLSearchParams();
  if (filters.start) params.set("start", filters.start);
  if (filters.end) params.set("end", filters.end);
  if (filters.category) params.set("category", filters.category);
  if (filters.merchant) params.set("merchant", filters.merchant);
  return `/transactions?${params.toString()}`;
}

/**
 * Create a new conversation session for multi-turn assistant queries.
 * Returns the conversation ID that can be passed to runAssistantQuery.
 */
export async function createConversation(
  userId: string,
  deps?: {
    conversationStore?: typeof defaultConversationStore;
    createIdFn?: typeof createConversationId;
    nowFn?: typeof nowIso;
  }
): Promise<string> {
  const store = deps?.conversationStore ?? defaultConversationStore;
  const genId = deps?.createIdFn ?? createConversationId;
  const nowFn = deps?.nowFn ?? nowIso;
  const conversationId = genId();
  const session: ConversationSession = {
    id: conversationId,
    userId,
    messages: [],
    resultCache: new Map(),
    createdAt: nowFn(),
    expiresAt: new Date(Date.now() + 3600000).toISOString()
  };
  await store.set(conversationId, session);
  return conversationId;
}

/**
 * Get an existing conversation session.
 * Returns null if the conversation doesn't exist or has expired.
 */
export async function getConversation(conversationId: string): Promise<ConversationSession | null> {
  return defaultConversationStore.get(conversationId);
}

/**
 * Get a conversation and verify ownership.
 * Returns null if the conversation doesn't exist, has expired, or doesn't belong to the user.
 */
export async function requireConversationOwnership(
  conversationId: string,
  userId: string
): Promise<ConversationSession | null> {
  const conversation = await getConversation(conversationId);
  if (!conversation || conversation.userId !== userId) {
    return null;
  }
  return conversation;
}

export async function runAssistantQuery(
  userId: string,
  question: string,
  conversationId?: string,
  deps?: {
    requireAiFeatureFn?: typeof requireAiFeature;
    runAgentFn?: typeof runToolCallingAgent;
    createIdFn?: typeof createId;
    nowFn?: typeof nowIso;
    loadStoreFn?: typeof loadStore;
    saveStoreFn?: typeof saveStore;
    addAuditEventFn?: typeof addAuditEvent;
    conversationStore?: typeof defaultConversationStore;
  }
) {
  if (!question || String(question).trim().length < 3) {
    throw new Error("Question is required");
  }

  const aiFn = deps?.requireAiFeatureFn ?? requireAiFeature;
  const agentFn = deps?.runAgentFn ?? runToolCallingAgent;
  const genId = deps?.createIdFn ?? createId;
  const nowFn = deps?.nowFn ?? nowIso;
  const storeFn = deps?.loadStoreFn ?? loadStore;
  const saveFn = deps?.saveStoreFn ?? saveStore;
  const auditFn = deps?.addAuditEventFn ?? addAuditEvent;
  const convStore = deps?.conversationStore ?? defaultConversationStore;

  const aiContext = aiFn(userId, "assistant");

  // Run the tool-calling agent
  if (!AI_TOOL_CALLING_AGENT_ENABLED) {
    throw new Error("Assistant feature is not enabled");
  }

  // Cross-user conversation isolation: verify ownership before loading history
  if (conversationId) {
    const session = await convStore.get(conversationId);
    if (!session || session.userId !== userId) {
      throw new Error("Conversation not found or access denied");
    }
  }

  // Confirmation flow: check for pending action before calling the agent
  const trimmedQuestion = question.trim();
  const isConfirm = /^(yes|confirm|proceed|do it|go ahead)/i.test(trimmedQuestion);
  const isCancel = /^(no|cancel|stop|never mind|don't)/i.test(trimmedQuestion);
  let confirmationResult: Record<string, unknown> | undefined;

  if ((isConfirm || isCancel) && conversationId) {
    const { getPendingActionByConversation, consumePendingAction, getPendingAction } = await import("./llm/pending-actions.ts");
    const pending = getPendingActionByConversation(userId, conversationId);

    if (pending) {
      if (isCancel) {
        consumePendingAction(pending.key);
        confirmationResult = {
          answer: `Cancelled: ${pending.toolName.replace(/_/g, " ")} was not executed.`,
          summary: "Action cancelled.",
          highlights: [],
          drillDownFilters: {},
          provider: aiContext.provider,
          model: aiContext.model,
          confirmed: false
        };
      } else if (isConfirm) {
        // Execute the pending tool action with its exact stored args
        try {
          const { ALL_TOOLS } = await import("./llm/tool-spec.ts");
          const toolSpec = ALL_TOOLS.find((t) => t.name === pending.toolName);
          if (toolSpec) {
            // Execute with _mode=execute
            const execArgs = { ...pending.args, _mode: "execute" };
            const result = await toolSpec.execute(
              { userId, conversationId, resultCache: new Map() },
              execArgs
            );
            consumePendingAction(pending.key);
            const msg = (result.data as Record<string, unknown>)?.message || `${pending.toolName} executed successfully.`;
            confirmationResult = {
              answer: String(msg),
              summary: "Confirmed.",
              highlights: [],
              drillDownFilters: {},
              provider: aiContext.provider,
              model: aiContext.model,
              confirmed: true,
              confirmationResultData: result.data
            };
          }
        } catch (err) {
          confirmationResult = {
            answer: `Failed to execute: ${err instanceof Error ? err.message : String(err)}`,
            summary: "Execution failed.",
            highlights: [],
            drillDownFilters: {},
            provider: aiContext.provider,
            model: aiContext.model,
            confirmed: false
          };
        }
      }
    }
  }

  if (confirmationResult) {
    // Return confirmation result without calling agent
    const store = storeFn();
    const record = {
      id: genId("asst"),
      userId,
      question,
      result: {
        answer: String(confirmationResult.answer || ""),
        summary: String(confirmationResult.summary || ""),
        keyPoints: [] as string[],
        followUp: undefined as string | undefined,
        highlights: (confirmationResult.highlights as string[]) || [],
        filters: (confirmationResult.drillDownFilters as Record<string, string>) || {},
        drillDownUrl: buildDrillDownUrl((confirmationResult.drillDownFilters as Record<string, string>) || {}),
        provider: aiContext.provider,
        model: aiContext.model,
        confidence: 0.9,
        toolCallsMade: 0,
        agentLatencyMs: 0,
        clarification: undefined as { question: string; options?: string[] } | undefined,
        confirmationPreview: confirmationResult.confirmationPreview as Record<string, unknown> | undefined,
        pendingActionKey: undefined as string | undefined,
        subscriptions: undefined as Array<Record<string, unknown>> | undefined,
        cardBenefits: undefined as Array<Record<string, unknown>> | undefined,
        budgetComparison: undefined as Array<Record<string, unknown>> | undefined
      },
      createdAt: nowFn()
    };
    store.assistantQueries.push(record);
    saveFn(store);
    return record;
  }

  const capabilities = ["analytics", "subscriptions", "budgeting"];
  if (AI_CARD_BENEFITS_ENABLED) capabilities.push("benefits");

  const agentResult = await agentFn({
    mode: "qa",
    capabilities,
    userId,
    question,
    conversationId
  });

  if (!agentResult.ok) {
    throw new Error(`Assistant query failed: ${agentResult.error || "unknown error"}`);
  }

  const store = storeFn();
  const record = {
    id: genId("asst"),
    userId,
    question,
    result: {
      answer: agentResult.answer || "",
      summary: agentResult.summary,
      keyPoints: agentResult.keyPoints || [],
      followUp: agentResult.followUp,
      highlights: agentResult.highlights || [],
      filters: agentResult.drillDownFilters || {},
      drillDownUrl: buildDrillDownUrl(agentResult.drillDownFilters || {}),
      provider: aiContext.provider,
      model: aiContext.model,
      confidence: 0.9,
      toolCallsMade: agentResult.toolCallsMade,
      agentLatencyMs: agentResult.latencyMs,
      clarification: agentResult.clarification,
      confirmationPreview: agentResult.confirmationPreview,
      pendingActionKey: agentResult.pendingActionKey,
      subscriptions: agentResult.subscriptions,
      cardBenefits: agentResult.cardBenefits,
      budgetComparison: agentResult.budgetComparison
    },
    createdAt: nowFn()
  };

  store.assistantQueries.push(record);
  saveFn(store);
  auditFn(userId, "assistant.query", {
    assistantQueryId: record.id,
    provider: aiContext.provider,
    model: aiContext.model,
    toolCallsMade: agentResult.toolCallsMade
  });

  return record;
}

export function getAssistantQuery(userId, queryId) {
  const store = loadStore();
  const query = store.assistantQueries.find((entry) => entry.id === queryId && entry.userId === userId);
  if (!query) {
    throw new Error("Assistant query not found");
  }
  return query;
}
