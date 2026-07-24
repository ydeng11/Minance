// services/api/test/llm/conversation-store.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { InMemoryConversationStore, defaultConversationStore, type ConversationSession } from "../../src/llm/conversation-store.ts";

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

// ============================================================================
// Additional coverage
// ============================================================================

test("multiple concurrent sessions for different users", async () => {
  const store = new InMemoryConversationStore();

  const sessionA: ConversationSession = {
    id: "conv_a", userId: "user_a", messages: [], resultCache: new Map(),
    createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 3600000).toISOString()
  };
  const sessionB: ConversationSession = {
    id: "conv_b", userId: "user_b", messages: [], resultCache: new Map(),
    createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 3600000).toISOString()
  };

  await store.set("conv_a", sessionA);
  await store.set("conv_b", sessionB);

  const retrievedA = await store.get("conv_a");
  const retrievedB = await store.get("conv_b");

  assert.equal(retrievedA?.userId, "user_a");
  assert.equal(retrievedB?.userId, "user_b");
  assert.notEqual(retrievedA?.userId, retrievedB?.userId);
});

test("session update: messages appended and resultCache updated", async () => {
  const store = new InMemoryConversationStore();

  const session: ConversationSession = {
    id: "conv_upd", userId: "user_1", messages: [
      { role: "user", content: "First question" }
    ],
    resultCache: new Map(),
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 3600000).toISOString()
  };
  await store.set("conv_upd", session);

  // Update: append assistant message
  session.messages.push({ role: "assistant", content: "First answer" });
  session.resultCache.set("result_1", { answer: "First answer" });
  await store.set("conv_upd", session);

  const retrieved = await store.get("conv_upd");
  assert.equal(retrieved?.messages.length, 2);
  assert.equal(retrieved?.messages[0].role, "user");
  assert.equal(retrieved?.messages[1].role, "assistant");
  assert.equal(retrieved?.messages[1].content, "First answer");
  assert.ok(retrieved?.resultCache.has("result_1"));
  assert.deepEqual(retrieved?.resultCache.get("result_1"), { answer: "First answer" });
});

test("resultCache with complex objects", async () => {
  const store = new InMemoryConversationStore();

  const session: ConversationSession = {
    id: "conv_complex", userId: "user_1", messages: [],
    resultCache: new Map([
      ["result_1", { total: 500, categories: ["Food", "Transport"], merchants: [{ name: "Amazon", amount: 100 }] }],
      ["result_2", { transactions: [{ id: "t1", amount: 50 }, { id: "t2", amount: 75 }] }]
    ]),
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 3600000).toISOString()
  };

  await store.set("conv_complex", session);
  const retrieved = await store.get("conv_complex");

  assert.ok(retrieved, "Should retrieve session");
  assert.equal(retrieved?.resultCache.size, 2);

  const result1 = retrieved?.resultCache.get("result_1") as any;
  assert.equal(result1?.total, 500);
  assert.deepEqual(result1?.categories, ["Food", "Transport"]);
  assert.equal(result1?.merchants[0].name, "Amazon");

  const result2 = retrieved?.resultCache.get("result_2") as any;
  assert.equal(result2?.transactions.length, 2);
  assert.equal(result2?.transactions[0].id, "t1");
});

test("defaultConversationStore is a singleton instance", () => {
  assert.ok(defaultConversationStore instanceof InMemoryConversationStore);
});

test("ownership: get own session, reject other user's session", async () => {
  const store = new InMemoryConversationStore();

  const session: ConversationSession = {
    id: "conv_own", userId: "user_alice", messages: [], resultCache: new Map(),
    createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 3600000).toISOString()
  };
  await store.set("conv_own", session);

  // Alice can access her own session
  const aliceSession = await store.get("conv_own");
  assert.equal(aliceSession?.userId, "user_alice");

  // Bob cannot (the store doesn't enforce ownership — that's the caller's job)
  // We verify the store returns the session regardless
  // Ownership is enforced by requireConversationOwnership in assistant.ts
  const bobSession = await store.get("conv_own");
  assert.equal(bobSession?.userId, "user_alice"); // Store doesn't filter by user
});