// services/api/test/llm/conversation-store.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { InMemoryConversationStore, type ConversationSession } from "../../src/llm/conversation-store.ts";

test("InMemoryConversationStore returns null for non-existent session", async () => {
  const store = new InMemoryConversationStore();
  const session = await store.get("nonexistent");
  assert.equal(session, null);
});

test("InMemoryConversationStore stores and retrieves a session", async () => {
  const store = new InMemoryConversationStore();
  const session: ConversationSession = {
    id: "conv_1",
    userId: "user_123",
    messages: [{ role: "user", content: "test" }],
    resultCache: new Map(),
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 3600000).toISOString()
  };

  await store.set("conv_1", session);
  const retrieved = await store.get("conv_1");

  assert.notEqual(retrieved, null);
  assert.equal(retrieved?.id, "conv_1");
  assert.equal(retrieved?.userId, "user_123");
});

test("InMemoryConversationStore deletes a session", async () => {
  const store = new InMemoryConversationStore();
  const session: ConversationSession = {
    id: "conv_1",
    userId: "user_123",
    messages: [],
    resultCache: new Map(),
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 3600000).toISOString()
  };

  await store.set("conv_1", session);
  await store.delete("conv_1");
  const retrieved = await store.get("conv_1");

  assert.equal(retrieved, null);
});

test("InMemoryConversationStore returns null for expired session", async () => {
  const store = new InMemoryConversationStore();
  const expiredSession: ConversationSession = {
    id: "conv_expired",
    userId: "user_123",
    messages: [],
    resultCache: new Map(),
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    expiresAt: new Date(Date.now() - 3600000).toISOString() // expired 1 hour ago
  };

  await store.set("conv_expired", expiredSession);
  const retrieved = await store.get("conv_expired");

  assert.equal(retrieved, null);
});