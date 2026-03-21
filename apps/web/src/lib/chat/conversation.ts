import { ApiError } from "@/lib/api/client";
import type { AssistantQuery } from "@/lib/api/types";
import { assistantQueryToMessage, type AssistantMessageCard } from "./adapter";

export const ASSISTANT_CONVERSATION_STORAGE_KEY = "minance.assistant.conversationId";
export const ASSISTANT_TRANSCRIPT_STORAGE_KEY = "minance.assistant.transcript";
const ASSISTANT_TRANSCRIPT_TTL_MS = 60 * 60 * 1000;

export interface AssistantConversationStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface AssistantConversationApi {
  createConversation(): Promise<{ conversationId: string }>;
  askInConversation(conversationId: string, question: string): Promise<{ query: AssistantQuery }>;
}

export interface AssistantTranscriptSnapshot {
  conversationId: string;
  messages: AssistantMessageCard[];
  expiresAt: string;
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

export function createAssistantTranscriptExpiry(now = Date.now()): string {
  return new Date(now + ASSISTANT_TRANSCRIPT_TTL_MS).toISOString();
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function isValidAssistantMessage(value: unknown): value is AssistantMessageCard {
  if (!value || typeof value !== "object") {
    return false;
  }

  const message = value as Partial<AssistantMessageCard>;
  return typeof message.id === "string"
    && typeof message.question === "string"
    && typeof message.answer === "string"
    && isStringList(message.highlights)
    && typeof message.provider === "string"
    && typeof message.model === "string"
    && typeof message.drillDownUrl === "string"
    && typeof message.createdAt === "string";
}

function isValidAssistantTranscriptSnapshot(value: unknown): value is AssistantTranscriptSnapshot {
  if (!value || typeof value !== "object") {
    return false;
  }

  const snapshot = value as Partial<AssistantTranscriptSnapshot>;
  return typeof snapshot.conversationId === "string"
    && Array.isArray(snapshot.messages)
    && snapshot.messages.every((entry) => isValidAssistantMessage(entry))
    && typeof snapshot.expiresAt === "string"
    && Number.isNaN(Date.parse(snapshot.expiresAt)) === false;
}

export function persistAssistantTranscriptSnapshot(
  storage: AssistantConversationStorage | null | undefined,
  snapshot: AssistantTranscriptSnapshot
): void {
  storage?.setItem(ASSISTANT_TRANSCRIPT_STORAGE_KEY, JSON.stringify(snapshot));
}

export function clearStoredAssistantTranscriptSnapshot(storage?: AssistantConversationStorage | null): void {
  storage?.removeItem(ASSISTANT_TRANSCRIPT_STORAGE_KEY);
}

export function clearStoredAssistantConversationState(storage?: AssistantConversationStorage | null): void {
  clearStoredAssistantConversationId(storage);
  clearStoredAssistantTranscriptSnapshot(storage);
}

export function getStoredAssistantTranscriptSnapshot(
  storage?: AssistantConversationStorage | null
): AssistantTranscriptSnapshot | null {
  const raw = storage?.getItem(ASSISTANT_TRANSCRIPT_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!isValidAssistantTranscriptSnapshot(parsed) || Date.parse(parsed.expiresAt) <= Date.now()) {
      clearStoredAssistantConversationState(storage);
      return null;
    }

    if (getStoredAssistantConversationId(storage) !== parsed.conversationId) {
      persistAssistantConversationId(storage, parsed.conversationId);
    }

    return parsed;
  } catch {
    clearStoredAssistantConversationState(storage);
    return null;
  }
}

export function appendAssistantQuery(
  messages: AssistantMessageCard[],
  query: AssistantQuery,
  limit = 25
): AssistantMessageCard[] {
  return [...messages, assistantQueryToMessage(query)].slice(-limit);
}

export function createPendingAssistantMessage(
  question: string,
  {
    id = `pending_${Date.now()}`,
    emoji = "🧠",
    createdAt = new Date().toISOString()
  }: {
    id?: string;
    emoji?: string;
    createdAt?: string;
  } = {}
): AssistantMessageCard {
  return {
    id,
    question,
    answer: "",
    keyPoints: [],
    highlights: [],
    provider: "",
    model: "",
    drillDownUrl: "",
    createdAt,
    state: "pending",
    pendingEmoji: emoji
  };
}

export function replaceAssistantMessage(
  messages: AssistantMessageCard[],
  messageId: string,
  nextMessage: AssistantMessageCard | AssistantQuery
): AssistantMessageCard[] {
  const resolved = "result" in nextMessage ? assistantQueryToMessage(nextMessage) : nextMessage;
  return messages.map((message) => (message.id === messageId ? resolved : message));
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

    clearStoredAssistantConversationState(storage);
    const nextConversationId = await createAndStoreConversation(assistant, storage);
    const retried = await assistant.askInConversation(nextConversationId, question);
    return { conversationId: nextConversationId, query: retried.query };
  }
}
