import test from "node:test";
import assert from "node:assert/strict";
import type { AssistantQuery } from "@/lib/api/types";
import { ApiError } from "@/lib/api/client";
import {
  appendAssistantQuery,
  ASSISTANT_CONVERSATION_STORAGE_KEY,
  ASSISTANT_TRANSCRIPT_STORAGE_KEY,
  clearStoredAssistantConversationState,
  clearStoredAssistantConversationId,
  createPendingAssistantMessage,
  getStoredAssistantTranscriptSnapshot,
  getStoredAssistantConversationId,
  persistAssistantTranscriptSnapshot,
  persistAssistantConversationId,
  replaceAssistantMessage,
  submitAssistantQuestion
} from "./conversation";

function createAssistantQuery(id: string, question = "How much did I spend?"): AssistantQuery {
  return {
    id,
    userId: "user_1",
    question,
    plan: {
      intent: "spend_total",
      filters: {
        start: "2026-01-01",
        end: "2026-01-31"
      }
    },
    result: {
      answer: `Answer for ${id}`,
      highlights: [id],
      confidence: 0.9,
      numbers: {},
      filters: {},
      details: [],
      drillDownUrl: "/transactions?range=30d",
      provider: "openai",
      model: "gpt-4.1-mini",
      synthesisStatus: "applied"
    },
    createdAt: `2026-01-${String(Number(id.replace(/\D/g, "")) || 1).padStart(2, "0")}T12:00:00.000Z`
  };
}

function createStorage() {
  const values = new Map<string, string>();

  return {
    getItem(key: string) {
      return values.has(key) ? values.get(key)! : null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
    removeItem(key: string) {
      values.delete(key);
    }
  };
}

test("assistant conversation storage helpers persist and clear the active conversation id", () => {
  const storage = createStorage();

  assert.equal(getStoredAssistantConversationId(storage), null);

  persistAssistantConversationId(storage, "conv_123");
  assert.equal(storage.getItem(ASSISTANT_CONVERSATION_STORAGE_KEY), "conv_123");
  assert.equal(getStoredAssistantConversationId(storage), "conv_123");

  clearStoredAssistantConversationId(storage);
  assert.equal(getStoredAssistantConversationId(storage), null);
});

test("assistant transcript snapshot helpers persist and restore a valid transcript", () => {
  const storage = createStorage();
  const messages = appendAssistantQuery([], createAssistantQuery("asst_1"));
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  persistAssistantTranscriptSnapshot(storage, {
    conversationId: "conv_123",
    messages,
    expiresAt
  });

  assert.equal(storage.getItem(ASSISTANT_TRANSCRIPT_STORAGE_KEY) !== null, true);
  assert.deepEqual(getStoredAssistantTranscriptSnapshot(storage), {
    conversationId: "conv_123",
    messages,
    expiresAt
  });
});

test("assistant transcript snapshot helpers clear expired transcript state", () => {
  const storage = createStorage();
  persistAssistantConversationId(storage, "conv_expired");
  storage.setItem(ASSISTANT_TRANSCRIPT_STORAGE_KEY, JSON.stringify({
    conversationId: "conv_expired",
    messages: appendAssistantQuery([], createAssistantQuery("asst_1")),
    expiresAt: new Date(Date.now() - 1000).toISOString()
  }));

  assert.equal(getStoredAssistantTranscriptSnapshot(storage), null);
  assert.equal(getStoredAssistantConversationId(storage), null);
  assert.equal(storage.getItem(ASSISTANT_TRANSCRIPT_STORAGE_KEY), null);
});

test("assistant transcript snapshot helpers clear malformed transcript state", () => {
  const storage = createStorage();
  persistAssistantConversationId(storage, "conv_broken");
  storage.setItem(ASSISTANT_TRANSCRIPT_STORAGE_KEY, JSON.stringify({
    conversationId: "conv_broken",
    messages: [{ id: 123 }],
    expiresAt: "not-a-date"
  }));

  assert.equal(getStoredAssistantTranscriptSnapshot(storage), null);
  assert.equal(getStoredAssistantConversationId(storage), null);
  assert.equal(storage.getItem(ASSISTANT_TRANSCRIPT_STORAGE_KEY), null);
});

test("assistant conversation state clear helper removes transcript and conversation id", () => {
  const storage = createStorage();
  persistAssistantConversationId(storage, "conv_clear");
  persistAssistantTranscriptSnapshot(storage, {
    conversationId: "conv_clear",
    messages: appendAssistantQuery([], createAssistantQuery("asst_3")),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
  });

  clearStoredAssistantConversationState(storage);

  assert.equal(getStoredAssistantConversationId(storage), null);
  assert.equal(getStoredAssistantTranscriptSnapshot(storage), null);
  assert.equal(storage.getItem(ASSISTANT_TRANSCRIPT_STORAGE_KEY), null);
});

test("appendAssistantQuery keeps messages in chronological order and caps the newest 25", () => {
  const initial = Array.from({ length: 25 }, (_, index) => createAssistantQuery(`asst_${index + 1}`)).map((query) =>
    appendAssistantQuery([], query)
  ).flat();

  const next = appendAssistantQuery(initial, createAssistantQuery("asst_26", "Ignore transfers"));

  assert.equal(next.length, 25);
  assert.equal(next[0]?.id, "asst_2");
  assert.equal(next.at(-1)?.id, "asst_26");
});

test("createPendingAssistantMessage creates an optimistic assistant turn", () => {
  const pending = createPendingAssistantMessage("How much did I spend last month?", {
    id: "pending_1",
    emoji: "🧠",
    createdAt: "2026-01-31T12:00:00.000Z"
  });

  assert.equal(pending.id, "pending_1");
  assert.equal(pending.question, "How much did I spend last month?");
  assert.equal(pending.state, "pending");
  assert.equal(pending.pendingEmoji, "🧠");
  assert.equal(pending.answer, "");
  assert.deepEqual(pending.keyPoints, []);
});

test("replaceAssistantMessage swaps a pending turn with the final assistant response", () => {
  const pending = createPendingAssistantMessage("How much did I spend last month?", {
    id: "pending_1",
    emoji: "🧠",
    createdAt: "2026-01-31T12:00:00.000Z"
  });

  const replaced = replaceAssistantMessage([pending], "pending_1", createAssistantQuery("asst_27"));

  assert.equal(replaced.length, 1);
  assert.equal(replaced[0]?.id, "asst_27");
  assert.equal(replaced[0]?.state, "complete");
  assert.equal(replaced[0]?.question, "How much did I spend?");
});

test("replaceAssistantMessage can convert a pending turn into an inline error state", () => {
  const pending = createPendingAssistantMessage("Ignore transfer transactions", {
    id: "pending_2",
    emoji: "🤖",
    createdAt: "2026-01-31T12:00:00.000Z"
  });

  const failed = replaceAssistantMessage([pending], "pending_2", {
    ...pending,
    state: "error",
    answer: "Conversation not found."
  });

  assert.equal(failed.length, 1);
  assert.equal(failed[0]?.id, "pending_2");
  assert.equal(failed[0]?.state, "error");
  assert.equal(failed[0]?.answer, "Conversation not found.");
});

test("submitAssistantQuestion creates a conversation when one is not stored", async () => {
  const storage = createStorage();
  const calls: string[] = [];

  const result = await submitAssistantQuestion({
    question: "How much did I spend last month?",
    storage,
    assistant: {
      async createConversation() {
        calls.push("create");
        return { conversationId: "conv_new" };
      },
      async askInConversation(conversationId, question) {
        calls.push(`ask:${conversationId}:${question}`);
        return { query: createAssistantQuery("asst_1", question) };
      }
    }
  });

  assert.equal(result.conversationId, "conv_new");
  assert.equal(result.query.id, "asst_1");
  assert.deepEqual(calls, ["create", "ask:conv_new:How much did I spend last month?"]);
  assert.equal(getStoredAssistantConversationId(storage), "conv_new");
});

test("submitAssistantQuestion retries once with a fresh conversation after a 404", async () => {
  const storage = createStorage();
  persistAssistantConversationId(storage, "conv_stale");
  persistAssistantTranscriptSnapshot(storage, {
    conversationId: "conv_stale",
    messages: appendAssistantQuery([], createAssistantQuery("asst_9")),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
  });

  const calls: string[] = [];
  let askCount = 0;

  const result = await submitAssistantQuestion({
    question: "Ignore transfer transactions",
    storage,
    assistant: {
      async createConversation() {
        calls.push("create");
        return { conversationId: "conv_fresh" };
      },
      async askInConversation(conversationId, question) {
        calls.push(`ask:${conversationId}:${question}`);
        askCount += 1;
        if (askCount === 1) {
          throw new ApiError("Conversation not found", 404, {
            error: {
              message: "Conversation not found"
            }
          });
        }
        return { query: createAssistantQuery("asst_2", question) };
      }
    }
  });

  assert.equal(result.conversationId, "conv_fresh");
  assert.equal(result.query.id, "asst_2");
  assert.deepEqual(calls, [
    "ask:conv_stale:Ignore transfer transactions",
    "create",
    "ask:conv_fresh:Ignore transfer transactions"
  ]);
  assert.equal(getStoredAssistantConversationId(storage), "conv_fresh");
  assert.equal(getStoredAssistantTranscriptSnapshot(storage), null);
});
