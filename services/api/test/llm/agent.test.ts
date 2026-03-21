// services/api/test/llm/agent.test.ts

import test from "node:test";
import assert from "node:assert/strict";
import { runToolCallingAgent, createConversationId } from "../../src/llm/agent.ts";
import { defaultConversationStore } from "../../src/llm/conversation-store.ts";

const TEST_AI_CONTEXT = {
  provider: "openai",
  model: "gpt-4",
  apiKey: "test-key"
};

// Helper to mock fetch for LLM calls
function createFetchMock(responses: Array<{ ok: boolean; content?: string; toolCalls?: Array<{ id: string; name: string; arguments: string }>; error?: string }>) {
  let callIndex = 0;

  return async () => {
    const response = responses[callIndex++] || responses[responses.length - 1];

    if (!response.ok) {
      return {
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ error: { message: response.error || "API error" } })
      };
    }

    const toolCalls = response.toolCalls?.map(tc => ({
      id: tc.id,
      type: "function",
      function: { name: tc.name, arguments: tc.arguments }
    })) || [];

    return {
      ok: true,
      text: async () => JSON.stringify({
        choices: [{
          message: {
            content: response.content || null,
            tool_calls: toolCalls
          }
        }]
      })
    };
  };
}

test("runToolCallingAgent should return error when AI not configured", async () => {
  // Don't provide _testAiContext to simulate missing AI setup
  const result = await runToolCallingAgent({
    mode: "qa",
    userId: "user_123",
    question: "test"
  });

  assert.equal(result.ok, false);
  assert.ok(result.error?.includes("AI") || result.error?.includes("setup"), "Should mention AI setup");
});

test("runToolCallingAgent should enforce max tool calls limit", async () => {
  const originalFetch = global.fetch;
  global.fetch = createFetchMock([
    // Always return tool calls to trigger the limit
    { ok: true, toolCalls: [{ id: "call_1", name: "get_data_bounds", arguments: "{}" }] },
    { ok: true, toolCalls: [{ id: "call_2", name: "get_data_bounds", arguments: "{}" }] },
    { ok: true, toolCalls: [{ id: "call_3", name: "get_data_bounds", arguments: "{}" }] },
    { ok: true, toolCalls: [{ id: "call_4", name: "get_data_bounds", arguments: "{}" }] },
    { ok: true, toolCalls: [{ id: "call_5", name: "get_data_bounds", arguments: "{}" }] }
  ]);

  try {
    const result = await runToolCallingAgent({
      mode: "qa",
      userId: "user_123",
      question: "test",
      _testAiContext: TEST_AI_CONTEXT
    });

    assert.equal(result.ok, false);
    assert.ok(result.error?.includes("Maximum tool calls"), "Should mention max tool calls exceeded");
    assert.equal(result.toolCallsMade, 5);
  } finally {
    global.fetch = originalFetch;
  }
});

test("runToolCallingAgent should handle clarification tool", async () => {
  const originalFetch = global.fetch;
  global.fetch = createFetchMock([
    {
      ok: true,
      toolCalls: [{
        id: "call_1",
        name: "ask_clarification",
        arguments: '{"question": "What time period?", "options": ["This month", "Last month", "This year"]}'
      }]
    }
  ]);

  try {
    const result = await runToolCallingAgent({
      mode: "qa",
      userId: "user_123",
      question: "How much did I spend?",
      _testAiContext: TEST_AI_CONTEXT
    });

    assert.equal(result.ok, true);
    assert.ok(result.clarification, "Should have clarification");
    assert.equal(result.clarification?.question, "What time period?");
    assert.deepEqual(result.clarification?.options, ["This month", "Last month", "This year"]);
  } finally {
    global.fetch = originalFetch;
  }
});

test("runToolCallingAgent should handle Q&A mode final response", async () => {
  const originalFetch = global.fetch;
  global.fetch = createFetchMock([
    {
      ok: true,
      content: JSON.stringify({
        answer: "You spent $1,234.56 last month.",
        highlights: ["Total: $1,234.56"],
        drill_down_filters: { start: "2025-02-01", end: "2025-02-28" }
      })
    }
  ]);

  try {
    const result = await runToolCallingAgent({
      mode: "qa",
      userId: "user_123",
      question: "How much did I spend last month?",
      _testAiContext: TEST_AI_CONTEXT
    });

    assert.equal(result.ok, true);
    assert.equal(result.answer, "You spent $1,234.56 last month.");
    assert.deepEqual(result.highlights, ["Total: $1,234.56"]);
    assert.deepEqual(result.drillDownFilters, { start: "2025-02-01", end: "2025-02-28" });
    assert.ok(result.provider);
    assert.ok(result.model);
    assert.ok(result.latencyMs >= 0);
  } finally {
    global.fetch = originalFetch;
  }
});

test("runToolCallingAgent should handle categorization mode with assign_category", async () => {
  const originalFetch = global.fetch;
  global.fetch = createFetchMock([
    {
      ok: true,
      toolCalls: [{
        id: "call_1",
        name: "assign_category",
        arguments: '{"category": "Entertainment", "confidence": 0.95, "source": "history"}'
      }]
    }
  ]);

  try {
    const result = await runToolCallingAgent({
      mode: "categorization",
      userId: "user_123",
      transaction: { merchant: "Netflix", amount: 15.99 },
      _testAiContext: TEST_AI_CONTEXT
    });

    assert.equal(result.ok, true);
    assert.equal(result.category, "Entertainment");
    assert.equal(result.confidence, 0.95);
    assert.equal(result.source, "history");
  } finally {
    global.fetch = originalFetch;
  }
});

test("runToolCallingAgent should handle recurring mode with create_recurring_suggestion", async () => {
  const originalFetch = global.fetch;
  global.fetch = createFetchMock([
    {
      ok: true,
      toolCalls: [{
        id: "call_1",
        name: "create_recurring_suggestion",
        arguments: '{"merchant": "Netflix", "cadence": "monthly", "suggested_amount": 15.99, "confidence": 0.95}'
      }]
    }
  ]);

  try {
    const result = await runToolCallingAgent({
      mode: "recurring",
      userId: "user_123",
      transaction: { merchant: "Netflix", amount: 15.99 },
      _testAiContext: TEST_AI_CONTEXT
    });

    assert.equal(result.ok, true);
    assert.equal(result.isRecurring, true);
    assert.equal(result.cadence, "monthly");
    assert.equal(result.suggestedAmount, 15.99);
    assert.equal(result.confidence, 0.95);
  } finally {
    global.fetch = originalFetch;
  }
});

test("runToolCallingAgent should handle import mode with assign_results", async () => {
  const originalFetch = global.fetch;
  global.fetch = createFetchMock([
    {
      ok: true,
      toolCalls: [{
        id: "call_1",
        name: "assign_results",
        arguments: JSON.stringify({
          results: [
            { transaction_id: "t1", category: "Entertainment", direction: "outflow", confidence: 0.9, source: "history" },
            { transaction_id: "t2", category: "Shopping", direction: "outflow", confidence: 0.7, source: "inferred" }
          ]
        })
      }]
    }
  ]);

  try {
    const result = await runToolCallingAgent({
      mode: "import",
      userId: "user_123",
      transactions: [
        { id: "t1", merchant: "Netflix", amount: 15.99 },
        { id: "t2", merchant: "Amazon", amount: 50 }
      ],
      _testAiContext: TEST_AI_CONTEXT
    });

    assert.equal(result.ok, true);
    assert.ok(result.results, "Should have results");
    assert.equal(result.results?.length, 2);
    assert.equal(result.results?.[0].category, "Entertainment");
    assert.equal(result.results?.[0].source, "history");
    assert.equal(result.results?.[1].category, "Shopping");
    assert.equal(result.results?.[1].source, "inferred");
  } finally {
    global.fetch = originalFetch;
  }
});

test("runToolCallingAgent should return error for unknown mode", async () => {
  const result = await runToolCallingAgent({
    mode: "unknown" as "qa",
    userId: "user_123",
    question: "test",
    _testAiContext: TEST_AI_CONTEXT
  });

  assert.equal(result.ok, false);
  assert.ok(result.error?.includes("Unknown mode"));
});

test("runToolCallingAgent should handle LLM API errors", async () => {
  const originalFetch = global.fetch;
  global.fetch = createFetchMock([
    { ok: false, error: "Rate limit exceeded" }
  ]);

  try {
    const result = await runToolCallingAgent({
      mode: "qa",
      userId: "user_123",
      question: "test",
      _testAiContext: TEST_AI_CONTEXT
    });

    assert.equal(result.ok, false);
    assert.ok(result.error?.includes("Rate limit") || result.error?.includes("failed"));
  } finally {
    global.fetch = originalFetch;
  }
});

test("runToolCallingAgent should handle plain text response in Q&A mode", async () => {
  const originalFetch = global.fetch;
  global.fetch = createFetchMock([
    {
      ok: true,
      content: "You spent approximately $500 on groceries this month."
    }
  ]);

  try {
    const result = await runToolCallingAgent({
      mode: "qa",
      userId: "user_123",
      question: "How much did I spend on groceries?",
      _testAiContext: TEST_AI_CONTEXT
    });

    assert.equal(result.ok, true);
    assert.equal(result.answer, "You spent approximately $500 on groceries this month.");
    assert.deepEqual(result.highlights, []);
    assert.deepEqual(result.drillDownFilters, {});
  } finally {
    global.fetch = originalFetch;
  }
});

test("createConversationId should generate valid conversation ID", () => {
  const id = createConversationId();
  assert.ok(id.startsWith("conv_"), "ID should start with conv_");
  assert.ok(id.length > 5, "ID should have sufficient length");
});

test("runToolCallingAgent should support conversation session", async () => {
  const originalFetch = global.fetch;
  const responseContent = JSON.stringify({
    answer: "In your follow-up question...",
    highlights: []
  });
  global.fetch = createFetchMock([
    {
      ok: true,
      content: responseContent
    }
  ]);

  const conversationId = createConversationId();

  try {
    const result = await runToolCallingAgent({
      mode: "qa",
      userId: "user_123",
      question: "Tell me more about those transactions",
      conversationId,
      _testAiContext: TEST_AI_CONTEXT
    });

    assert.equal(result.ok, true);
    assert.ok(result.answer);
    const session = await defaultConversationStore.get(conversationId);
    assert.ok(session, "Conversation session should be stored");
    assert.equal(session?.messages.at(-1)?.role, "assistant");
    assert.equal(session?.messages.at(-1)?.content, responseContent);
  } finally {
    global.fetch = originalFetch;
  }
});

test("runToolCallingAgent should track tool calls made", async () => {
  const originalFetch = global.fetch;
  global.fetch = createFetchMock([
    { ok: true, toolCalls: [{ id: "call_1", name: "get_data_bounds", arguments: "{}" }] },
    { ok: true, toolCalls: [{ id: "call_2", name: "get_overview", arguments: "{}" }] },
    {
      ok: true,
      content: JSON.stringify({
        answer: "Done",
        highlights: []
      })
    }
  ]);

  try {
    const result = await runToolCallingAgent({
      mode: "qa",
      userId: "user_123",
      question: "What did I spend?",
      _testAiContext: TEST_AI_CONTEXT
    });

    assert.equal(result.ok, true);
    assert.equal(result.toolCallsMade, 2, "Should track 2 tool calls made");
  } finally {
    global.fetch = originalFetch;
  }
});

test("runToolCallingAgent should handle categorization mode with JSON response", async () => {
  const originalFetch = global.fetch;
  global.fetch = createFetchMock([
    {
      ok: true,
      content: JSON.stringify({
        category: "Groceries",
        confidence: 0.85,
        source: "inferred"
      })
    }
  ]);

  try {
    const result = await runToolCallingAgent({
      mode: "categorization",
      userId: "user_123",
      transaction: { merchant: "Whole Foods", amount: 75.50 },
      _testAiContext: TEST_AI_CONTEXT
    });

    assert.equal(result.ok, true);
    assert.equal(result.category, "Groceries");
    assert.equal(result.confidence, 0.85);
    assert.equal(result.source, "inferred");
  } finally {
    global.fetch = originalFetch;
  }
});

test("runToolCallingAgent should handle recurring mode with JSON response", async () => {
  const originalFetch = global.fetch;
  global.fetch = createFetchMock([
    {
      ok: true,
      content: JSON.stringify({
        is_recurring: false
      })
    }
  ]);

  try {
    const result = await runToolCallingAgent({
      mode: "recurring",
      userId: "user_123",
      transaction: { merchant: "Gas Station", amount: 45.00 },
      _testAiContext: TEST_AI_CONTEXT
    });

    assert.equal(result.ok, true);
    assert.equal(result.isRecurring, false);
  } finally {
    global.fetch = originalFetch;
  }
});
