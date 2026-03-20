import { loadStore, saveStore, addAuditEvent } from "./store.ts";
import { requireAiFeature } from "./ai.ts";
import { createId, nowIso } from "./utils.ts";
import { runToolCallingAgent, createConversationId } from "./llm/agent.ts";
import { defaultConversationStore, type ConversationSession } from "./llm/conversation-store.ts";
import { AI_TOOL_CALLING_AGENT_ENABLED } from "./flags.ts";

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
export async function createConversation(userId: string): Promise<string> {
  const conversationId = createConversationId();
  const session: ConversationSession = {
    id: conversationId,
    userId,
    messages: [],
    resultCache: new Map(),
    createdAt: nowIso(),
    expiresAt: new Date(Date.now() + 3600000).toISOString()
  };
  await defaultConversationStore.set(conversationId, session);
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

export async function runAssistantQuery(userId, question, conversationId?: string) {
  if (!question || String(question).trim().length < 3) {
    throw new Error("Question is required");
  }

  const aiContext = requireAiFeature(userId, "assistant");
  const store = loadStore();

  // Run the tool-calling agent
  if (!AI_TOOL_CALLING_AGENT_ENABLED) {
    throw new Error("Assistant feature is not enabled");
  }

  const agentResult = await runToolCallingAgent({
    mode: "qa",
    userId,
    question,
    conversationId
  });

  if (!agentResult.ok) {
    throw new Error(`Assistant query failed: ${agentResult.error || "unknown error"}`);
  }

  const record = {
    id: createId("asst"),
    userId,
    question,
    result: {
      answer: agentResult.answer || "",
      highlights: agentResult.highlights || [],
      filters: agentResult.drillDownFilters || {},
      drillDownUrl: buildDrillDownUrl(agentResult.drillDownFilters || {}),
      provider: aiContext.provider,
      model: aiContext.model,
      confidence: 0.9,
      toolCallsMade: agentResult.toolCallsMade,
      agentLatencyMs: agentResult.latencyMs,
      clarification: agentResult.clarification
    },
    createdAt: nowIso()
  };

  store.assistantQueries.push(record);
  saveStore(store);
  addAuditEvent(userId, "assistant.query", {
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