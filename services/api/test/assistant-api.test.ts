// services/api/test/assistant-api.test.ts
// Tests for the top-level assistant API (assistant.ts)

import test from "node:test";
import assert from "node:assert/strict";
import { resetStoreForTests } from "../src/store.ts";
import { InMemoryConversationStore } from "../src/llm/conversation-store.ts";

const {
  createConversation,
  getConversation,
  requireConversationOwnership,
  runAssistantQuery,
  getAssistantQuery
} = await import("../src/assistant.ts");

function makeEmptyStore() {
  return {
    users: [{ id: "user_1", email: "user@example.com", createdAt: "2026-01-01", updatedAt: "2026-01-01" }],
    sessions: [],
    accounts: [],
    transactions: [],
    categories: [],
    categoryRules: [],
    categoryStrategies: [],
    imports: [],
    importRowsRaw: [],
    importRowDiagnostics: [],
    aiProviderCredentials: [],
    aiProviderPreferences: [],
    assistantQueries: [],
    savedViews: [],
    auditEvents: []
  };
}

// Helper to create a mock store
function makeStoreWithCreds() {
  const store = makeEmptyStore();
  store.aiProviderCredentials = [{
    id: "cred_test",
    userId: "user_1",
    provider: "openai",
    label: "Test Key",
    model: "gpt-4",
    encrypted: { iv: "dGVzdA==", ciphertext: "dGVzdA==", tag: "dGVzdA==" },
    maskedKey: "sk-***345",
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    lastValidatedAt: "2026-01-01T00:00:00.000Z"
  }];
  store.aiProviderPreferences = [{
    userId: "user_1",
    activeProfileId: "cred_test",
    updatedAt: "2026-01-01T00:00:00.000Z"
  }];
  return store;
}

// ============================================================================
// createConversation
// ============================================================================

test("createConversation returns valid conversation ID", async () => {
  resetStoreForTests(makeEmptyStore());

  const convId = await createConversation("user_1");
  assert.ok(convId.startsWith("conv_"), "Should start with conv_");
  assert.ok(convId.length > 5, "Should have sufficient length");
});

test("createConversation stores session with correct userId", async () => {
  resetStoreForTests(makeEmptyStore());

  const convId = await createConversation("user_1");
  const session = await getConversation(convId);
  assert.ok(session, "Session should exist");
  assert.equal(session?.userId, "user_1");
  assert.equal(session?.id, convId);
});

test("createConversation creates session with empty messages", async () => {
  resetStoreForTests(makeEmptyStore());

  const convId = await createConversation("user_1");
  const session = await getConversation(convId);
  assert.deepEqual(session?.messages, []);
});

test("createConversation with injected store", async () => {
  resetStoreForTests(makeEmptyStore());

  const injectedStore = new InMemoryConversationStore();
  let capturedId = "";
  const injectedCreateId = () => {
    capturedId = "conv_custom_test_id";
    return capturedId;
  };

  const convId = await createConversation("user_1", {
    conversationStore: injectedStore,
    createIdFn: injectedCreateId
  });

  assert.equal(convId, "conv_custom_test_id");

  // Verify it's stored in the injected store, not the default one
  const inDefault = await getConversation(convId);
  assert.equal(inDefault, null, "Should not be in default store");

  const inInjected = await injectedStore.get(convId);
  assert.ok(inInjected, "Should be in injected store");
  assert.equal(inInjected?.userId, "user_1");
});

// ============================================================================
// getConversation
// ============================================================================

test("getConversation returns null for non-existent conversation", async () => {
  resetStoreForTests(makeEmptyStore());

  const session = await getConversation("conv_nonexistent");
  assert.equal(session, null);
});

test("getConversation returns null for expired conversation", async () => {
  resetStoreForTests(makeEmptyStore());

  // Create a conversation with an injected store that returns expired
  const injectedStore = new InMemoryConversationStore();
  const convId = await createConversation("user_1", { conversationStore: injectedStore });

  // Manually expire it
  const session = await injectedStore.get(convId);
  if (session) {
    session.expiresAt = new Date(Date.now() - 1000).toISOString();
    await injectedStore.set(convId, session);
  }

  const retrieved = await injectedStore.get(convId);
  assert.equal(retrieved, null, "Expired session should return null");
});

// ============================================================================
// requireConversationOwnership
// ============================================================================

test("requireConversationOwnership returns session for own user", async () => {
  resetStoreForTests(makeEmptyStore());

  const convId = await createConversation("user_1");
  const session = await requireConversationOwnership(convId, "user_1");
  assert.ok(session, "Should return session for own user");
  assert.equal(session?.userId, "user_1");
});

test("requireConversationOwnership returns null for other user's conversation", async () => {
  resetStoreForTests(makeEmptyStore());

  const convId = await createConversation("user_1");
  const session = await requireConversationOwnership(convId, "user_2");
  assert.equal(session, null, "Should not return another user's conversation");
});

test("requireConversationOwnership returns null for non-existent conversation", async () => {
  resetStoreForTests(makeEmptyStore());

  const session = await requireConversationOwnership("conv_nonexistent", "user_1");
  assert.equal(session, null);
});

test("requireConversationOwnership returns null for expired conversation", async () => {
  resetStoreForTests(makeEmptyStore());

  const injectedStore = new InMemoryConversationStore();
  const convId = await createConversation("user_1", { conversationStore: injectedStore });

  // Expire it
  const session = await injectedStore.get(convId);
  if (session) {
    session.expiresAt = new Date(Date.now() - 1000).toISOString();
    await injectedStore.set(convId, session);
  }

  const result = await requireConversationOwnership(convId, "user_1");
  assert.equal(result, null, "Expired session should return null");
});

// ============================================================================
// runAssistantQuery
// ============================================================================

test("runAssistantQuery rejects short question", async () => {
  resetStoreForTests(makeEmptyStore());

  await assert.rejects(
    () => runAssistantQuery("user_1", "ab"),
    /Question is required/
  );
});

test("runAssistantQuery rejects empty question", async () => {
  resetStoreForTests(makeEmptyStore());

  await assert.rejects(
    () => runAssistantQuery("user_1", ""),
    /Question is required/
  );
});

test("runAssistantQuery rejects whitespace-only question", async () => {
  resetStoreForTests(makeEmptyStore());

  await assert.rejects(
    () => runAssistantQuery("user_1", "   "),
    /Question is required/
  );
});

test("runAssistantQuery throws when AI not configured", async () => {
  resetStoreForTests(makeEmptyStore());

  await assert.rejects(
    () => runAssistantQuery("user_1", "How much did I spend?", undefined, {
      requireAiFeatureFn: () => { throw Object.assign(new Error("AI setup required"), { code: "AI_SETUP_REQUIRED" }); },
      runAgentFn: async () => ({ ok: false, error: "AI setup required", toolCallsMade: 0, provider: "none", model: "none", latencyMs: 0 })
    }),
    /AI setup/
  );
});

test("runAssistantQuery stores query record with injected agent", async () => {
  const credStore = makeStoreWithCreds();
  resetStoreForTests(credStore);

  const mockAgentResult = {
    ok: true,
    answer: "You spent $500 on dining.",
    summary: "Dining was your top category.",
    keyPoints: ["Dining: $500", "Groceries: $300"],
    followUp: "I can break it down by merchant.",
    highlights: ["Total dining: $500"],
    drillDownFilters: { category: "Dining" },
    toolCallsMade: 2,
    provider: "openai",
    model: "gpt-4",
    latencyMs: 150
  };

  const record = await runAssistantQuery("user_1", "How much did I spend on dining?", undefined, {
    requireAiFeatureFn: () => ({
      ok: true, provider: "openai", model: "gpt-4", credentialId: "cred_test", apiKey: "sk-test"
    }),
    runAgentFn: async () => mockAgentResult,
    createIdFn: (prefix: string) => `${prefix}_test_001`,
    nowFn: () => "2026-06-15T12:00:00.000Z",
    loadStoreFn: () => makeStoreWithCreds(),
    saveStoreFn: (s: any) => {
      resetStoreForTests(s);
    },
    addAuditEventFn: () => {}
  });

  assert.ok(record.id, "Should have an ID");
  assert.equal(record.userId, "user_1");
  assert.equal(record.question, "How much did I spend on dining?");
  assert.equal(record.result.answer, "You spent $500 on dining.");
  assert.equal(record.result.summary, "Dining was your top category.");
  assert.deepEqual(record.result.keyPoints, ["Dining: $500", "Groceries: $300"]);
  assert.equal(record.result.followUp, "I can break it down by merchant.");
  assert.deepEqual(record.result.highlights, ["Total dining: $500"]);
  assert.deepEqual(record.result.filters, { category: "Dining" });
  assert.ok(record.result.drillDownUrl?.includes("/transactions?"));
  assert.equal(record.result.provider, "openai");
  assert.equal(record.result.model, "gpt-4");
  assert.equal(record.result.toolCallsMade, 2);
  assert.equal(record.result.agentLatencyMs, 150);
  assert.equal(record.createdAt, "2026-06-15T12:00:00.000Z");
});

test("runAssistantQuery with conversationId enforces ownership", async () => {
  resetStoreForTests(makeEmptyStore());

  // Create a conversation for user_2
  const convId = await createConversation("user_2");

  // Try to query it as user_1
  await assert.rejects(
    () => runAssistantQuery("user_1", "How much did I spend?", convId, {
      requireAiFeatureFn: (userId: string) => ({
        ok: true, provider: "openai", model: "gpt-4", credentialId: "cred_test", apiKey: "sk-test"
      }),
      runAgentFn: async () => ({ ok: true, answer: "Test", highlights: [], toolCallsMade: 0, provider: "openai", model: "gpt-4", latencyMs: 0 }),
      conversationStore: undefined // use default
    }),
    /access denied/
  );
});

test("runAssistantQuery with conversationId stores history", async () => {
  resetStoreForTests(makeEmptyStore());

  const convId = await createConversation("user_1");
  const credStore = makeStoreWithCreds();
  resetStoreForTests(credStore);

  const mockAgentResult = {
    ok: true,
    answer: "You spent $500.",
    highlights: ["Total: $500"],
    drillDownFilters: {},
    toolCallsMade: 1,
    provider: "openai",
    model: "gpt-4",
    latencyMs: 100
  };

  await runAssistantQuery("user_1", "How much?", convId, {
    requireAiFeatureFn: () => ({ ok: true, provider: "openai", model: "gpt-4", credentialId: "cred_test", apiKey: "sk-test" }),
    // Mock agent function that also stores conversation history (like the real agent does)
    runAgentFn: async (input: any) => {
      // Simulate what the real agent does: update conversation session on success
      const { defaultConversationStore } = await import("../src/llm/conversation-store.ts");
      const session = await defaultConversationStore.get(convId);
      if (session && input.conversationId) {
        session.messages.push(
          { role: "user", content: input.question || "" },
          { role: "assistant", content: JSON.stringify({ answer: "You spent $500.", highlights: ["Total: $500"], drill_down_filters: {} }) }
        );
        session.resultCache = new Map();
        await defaultConversationStore.set(convId, session);
      }
      return mockAgentResult;
    },
    createIdFn: (prefix: string) => `${prefix}_test`,
    nowFn: () => "2026-06-15T12:00:00.000Z",
    loadStoreFn: () => makeStoreWithCreds(),
    saveStoreFn: (s: any) => {
      // Write back to global store so subsequent reads work
      // @ts-ignore - use resetStoreForTests to persist
      resetStoreForTests(s);
    },
    addAuditEventFn: () => {}
  });

  // Verify conversation was updated
  const { getConversation } = await import("../src/assistant.ts");
  const session = await getConversation(convId);
  assert.ok(session, "Conversation should still exist");
  assert.equal(session?.userId, "user_1");
  // Should have messages: user + assistant
  const messages = session?.messages || [];
  assert.ok(messages.length >= 2, "Should have user + assistant messages");
  assert.equal(messages[0].role, "user");
  assert.equal(messages[0].content, "How much?");
  assert.equal(messages[1].role, "assistant");
  const parsedContent = JSON.parse(messages[1].content);
  assert.equal(parsedContent.answer, "You spent $500.");
});

// ============================================================================
// getAssistantQuery
// ============================================================================

test("getAssistantQuery retrieves stored query by ID", async () => {
  const credStore = makeStoreWithCreds();
  resetStoreForTests(credStore);

  const record = await runAssistantQuery("user_1", "Test question", undefined, {
    requireAiFeatureFn: () => ({ ok: true, provider: "openai", model: "gpt-4", credentialId: "cred_test", apiKey: "sk-test" }),
    runAgentFn: async () => ({
      ok: true, answer: "Test answer", highlights: [], toolCallsMade: 0, provider: "openai", model: "gpt-4", latencyMs: 0
    }),
    createIdFn: (prefix: string) => `${prefix}_query_1`,
    nowFn: () => "2026-06-15T12:00:00.000Z",
    loadStoreFn: () => makeStoreWithCreds(),
    saveStoreFn: (s: any) => {
      // Persist to global store so getAssistantQuery can find it
      resetStoreForTests(s);
    },
    addAuditEventFn: () => {}
  });

  const retrieved = getAssistantQuery("user_1", record.id);
  assert.equal(retrieved.id, record.id);
  assert.equal(retrieved.userId, "user_1");
  assert.equal(retrieved.result.answer, "Test answer");
});

test("getAssistantQuery enforces user isolation", async () => {
  const credStore = makeStoreWithCreds();
  resetStoreForTests(credStore);

  const record = await runAssistantQuery("user_1", "Test", undefined, {
    requireAiFeatureFn: () => ({ ok: true, provider: "openai", model: "gpt-4", credentialId: "cred_test", apiKey: "sk-test" }),
    runAgentFn: async () => ({
      ok: true, answer: "Test", highlights: [], toolCallsMade: 0, provider: "openai", model: "gpt-4", latencyMs: 0
    }),
    createIdFn: (prefix: string) => `${prefix}_query_1`,
    nowFn: () => "2026-06-15T12:00:00.000Z",
    loadStoreFn: () => makeStoreWithCreds(),
    saveStoreFn: (s: any) => {
      resetStoreForTests(s);
    },
    addAuditEventFn: () => {}
  });

  assert.throws(() => {
    getAssistantQuery("user_2", record.id);
  }, /not found/);
});

test("getAssistantQuery throws for non-existent query", () => {
  resetStoreForTests(makeEmptyStore());

  assert.throws(() => {
    getAssistantQuery("user_1", "asst_nonexistent");
  }, /not found/);
});
