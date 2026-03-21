import { ApiError } from "@/lib/api/client";
import type { AssistantQuery } from "@/lib/api/types";
import { assistantQueryToMessage, type AssistantMessageCard } from "./adapter";

export const ASSISTANT_CONVERSATION_STORAGE_KEY = "minance.assistant.conversationId";

export interface AssistantConversationStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface AssistantConversationApi {
  createConversation(): Promise<{ conversationId: string }>;
  askInConversation(conversationId: string, question: string): Promise<{ query: AssistantQuery }>;
}

export function getStoredAssistantConversationId(storage?: AssistantConversationStorage | null): string | null {
  return storage?.getItem(ASSISTANT_CONVERSATION_STORAGE_KEY)?.trim() || null;
}

export function persistAssistantConversationId(
  storage: AssistantConversationStorage | null | undefined,
  conversationId: string
): void {
  storage?.setItem(ASSISTANT_CONVERSATION_STORAGE_KEY, conversationId);
}

export function clearStoredAssistantConversationId(storage?: AssistantConversationStorage | null): void {
  storage?.removeItem(ASSISTANT_CONVERSATION_STORAGE_KEY);
}

export function appendAssistantQuery(
  messages: AssistantMessageCard[],
  query: AssistantQuery,
  limit = 25
): AssistantMessageCard[] {
  return [...messages, assistantQueryToMessage(query)].slice(-limit);
}

async function createAndStoreConversation(
  assistant: AssistantConversationApi,
  storage?: AssistantConversationStorage | null
): Promise<string> {
  const created = await assistant.createConversation();
  persistAssistantConversationId(storage, created.conversationId);
  return created.conversationId;
}

function isMissingConversationError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 404;
}

export async function submitAssistantQuestion({
  question,
  assistant,
  storage,
  conversationId
}: {
  question: string;
  assistant: AssistantConversationApi;
  storage?: AssistantConversationStorage | null;
  conversationId?: string | null;
}): Promise<{ conversationId: string; query: AssistantQuery }> {
  const activeConversationId =
    conversationId || getStoredAssistantConversationId(storage) || await createAndStoreConversation(assistant, storage);

  try {
    const result = await assistant.askInConversation(activeConversationId, question);
    persistAssistantConversationId(storage, activeConversationId);
    return { conversationId: activeConversationId, query: result.query };
  } catch (error) {
    if (!isMissingConversationError(error)) {
      throw error;
    }

    clearStoredAssistantConversationId(storage);
    const nextConversationId = await createAndStoreConversation(assistant, storage);
    const retried = await assistant.askInConversation(nextConversationId, question);
    return { conversationId: nextConversationId, query: retried.query };
  }
}
