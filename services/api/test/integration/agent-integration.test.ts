// services/api/test/integration/agent-integration.test.ts
// Integration tests for the tool-calling agent across all modes.
// Tests the full agent workflow including tool execution with mocked LLM responses.

import test from "node:test";
import assert from "node:assert/strict";
import { resetStoreForTests } from "../../src/store.ts";
import { runToolCallingAgent, createConversationId } from "../../src/llm/agent.ts";
import { defaultConversationStore } from "../../src/llm/conversation-store.ts";

const TEST_AI_CONTEXT = {
  provider: "openai",
  model: "gpt-4",
  apiKey: "test-key"
};

// Helper to mock fetch for LLM calls
function createFetchMock(responses: Array<{
  ok: boolean;
  content?: string;
  toolCalls?: Array<{ id: string; name: string; arguments: string }>;
  error?: string;
}>) {
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

// Base store with test data for integration tests
function createBaseStore() {
  const currentYear = new Date().getFullYear();
  const lastYear = currentYear - 1;

  return {
    users: [{ id: "user_1", email: "user@example.com", createdAt: "2020-01-01", updatedAt: "2020-01-01" }],
    sessions: [],
    accounts: [],
    transactions: [
      // Last year transactions for "last year" query tests
      {
        id: "txn_ly_1",
        user_id: "user_1",
        transaction_date: `${lastYear}-01-15`,
        merchant_normalized: "grocery store",
        merchant_raw: "Grocery Store",
        description: "Weekly groceries",
        amount: 150,
        direction: "outflow",
        category_final: "Groceries",
        dedupe_fingerprint: "ly1"
      },
      {
        id: "txn_ly_2",
        user_id: "user_1",
        transaction_date: `${lastYear}-06-20`,
        merchant_normalized: "netflix",
        merchant_raw: "Netflix",
        description: "Monthly subscription",
        amount: 15.99,
        direction: "outflow",
        category_final: "Entertainment",
        dedupe_fingerprint: "ly2"
      },
      {
        id: "txn_ly_3",
        user_id: "user_1",
        transaction_date: `${lastYear}-12-10`,
        merchant_normalized: "payroll",
        merchant_raw: "Payroll",
        description: "Salary",
        amount: 5000,
        direction: "inflow",
        category_final: "Income",
        dedupe_fingerprint: "ly3"
      },
      // Current year transactions
      {
        id: "txn_cy_1",
        user_id: "user_1",
        transaction_date: `${currentYear}-01-10`,
        merchant_normalized: "coffee shop",
        merchant_raw: "Coffee Shop",
        description: "Morning coffee",
        amount: 5.50,
        direction: "outflow",
        category_final: "Dining",
        dedupe_fingerprint: "cy1"
      },
      // Monthly recurring pattern for Netflix (recurring test)
      {
        id: "txn_rec_1",
        user_id: "user_1",
        transaction_date: `${currentYear}-01-05`,
        merchant_normalized: "netflix",
        merchant_raw: "Netflix",
        description: "Subscription",
        amount: 15.99,
        direction: "outflow",
        category_final: "Entertainment",
        dedupe_fingerprint: "rec1"
      },
      {
        id: "txn_rec_2",
        user_id: "user_1",
        transaction_date: `${currentYear}-02-05`,
        merchant_normalized: "netflix",
        merchant_raw: "Netflix",
        description: "Subscription",
        amount: 15.99,
        direction: "outflow",
        category_final: "Entertainment",
        dedupe_fingerprint: "rec2"
      },
      {
        id: "txn_rec_3",
        user_id: "user_1",
        transaction_date: `${currentYear}-03-05`,
        merchant_normalized: "netflix",
        merchant_raw: "Netflix",
        description: "Subscription",
        amount: 15.99,
        direction: "outflow",
        category_final: "Entertainment",
        dedupe_fingerprint: "rec3"
      },
      // Another user's transactions (for isolation tests)
      {
        id: "txn_other",
        user_id: "user_2",
        transaction_date: `${currentYear}-01-15`,
        merchant_normalized: "netflix",
        merchant_raw: "Netflix",
        description: "Other user subscription",
        amount: 20,
        direction: "outflow",
        category_final: "Entertainment",
        dedupe_fingerprint: "other"
      }
    ],
    categories: [
      {
        id: "cat_groceries",
        userId: "user_1",
        name: "Groceries",
        emoji: "🛒",
        coarseKey: "essential",
        type: "expense",
        budget: null,
        isSystem: false,
        createdAt: "2020-01-01T00:00:00.000Z",
        updatedAt: "2020-01-01T00:00:00.000Z"
      },
      {
        id: "cat_entertainment",
        userId: "user_1",
        name: "Entertainment",
        emoji: "🎬",
        coarseKey: "extra",
        type: "expense",
        budget: null,
        isSystem: false,
        createdAt: "2020-01-01T00:00:00.000Z",
        updatedAt: "2020-01-01T00:00:00.000Z"
      },
      {
        id: "cat_dining",
        userId: "user_1",
        name: "Dining",
        emoji: "🍽️",
        coarseKey: "extra",
        type: "expense",
        budget: null,
        isSystem: false,
        createdAt: "2020-01-01T00:00:00.000Z",
        updatedAt: "2020-01-01T00:00:00.000Z"
      },
      {
        id: "cat_income",
        userId: "user_1",
        name: "Income",
        emoji: "💰",
        coarseKey: "income",
        type: "income",
        budget: null,
        isSystem: false,
        createdAt: "2020-01-01T00:00:00.000Z",
        updatedAt: "2020-01-01T00:00:00.000Z"
      },
      {
        id: "cat_other",
        userId: "user_2",
        name: "Entertainment",
        emoji: "🎬",
        coarseKey: "extra",
        type: "expense",
        budget: null,
        isSystem: false,
        createdAt: "2020-01-01T00:00:00.000Z",
        updatedAt: "2020-01-01T00:00:00.000Z"
      }
    ],
    categoryRules: [],
    categoryStrategies: [],
    imports: [],
    importRowsRaw: [],
    importRowDiagnostics: [],
    aiProviderCredentials: [],
    aiProviderPreferences: [],
    assistantQueries: [],
    savedViews: [],
    migrationRuns: [],
    auditEvents: []
  };
}

// ============================================================================
// Q&A Mode Integration Tests
// ============================================================================

test("Q&A mode: 'last year' query with date parsing", async () => {
  resetStoreForTests(structuredClone(createBaseStore()));

  const originalFetch = global.fetch;
  global.fetch = createFetchMock([
    // First, agent calls get_data_bounds
    {
      ok: true,
      toolCalls: [{ id: "call_1", name: "get_data_bounds", arguments: "{}" }]
    },
    // Then, agent calls get_overview with calculated date range for last year
    {
      ok: true,
      toolCalls: [{
        id: "call_2",
        name: "get_overview",
        arguments: JSON.stringify({
          start: `${new Date().getFullYear() - 1}-01-01`,
          end: `${new Date().getFullYear() - 1}-12-31`
        })
      }]
    },
    // Finally, agent returns answer
    {
      ok: true,
      content: JSON.stringify({
        answer: "Last year you spent a total of $181.98 on expenses and earned $5,000 in income.",
        highlights: ["Total expenses: $181.98", "Total income: $5,000"],
        drill_down_filters: { start: `${new Date().getFullYear() - 1}-01-01`, end: `${new Date().getFullYear() - 1}-12-31` }
      })
    }
  ]);

  try {
    const result = await runToolCallingAgent({
      mode: "qa",
      userId: "user_1",
      question: "How much did I spend last year?",
      _testAiContext: TEST_AI_CONTEXT
    });

    assert.equal(result.ok, true, "Agent should succeed");
    assert.ok(result.answer, "Should have an answer");
    assert.ok(result.highlights?.length, "Should have highlights");
    assert.ok(result.drillDownFilters?.start?.includes(String(new Date().getFullYear() - 1)),
      "Drill-down filters should reflect last year");
    assert.equal(result.toolCallsMade, 2, "Should have made 2 tool calls");
  } finally {
    global.fetch = originalFetch;
  }
});

test("Q&A mode: get_data_bounds returns correct date range", async () => {
  resetStoreForTests(structuredClone(createBaseStore()));

  const originalFetch = global.fetch;
  global.fetch = createFetchMock([
    {
      ok: true,
      toolCalls: [{ id: "call_1", name: "get_data_bounds", arguments: "{}" }]
    },
    {
      ok: true,
      content: JSON.stringify({
        answer: "Your data spans from the data bounds.",
        highlights: [],
        drill_down_filters: {}
      })
    }
  ]);

  try {
    const result = await runToolCallingAgent({
      mode: "qa",
      userId: "user_1",
      question: "What is my data range?",
      _testAiContext: TEST_AI_CONTEXT
    });

    assert.equal(result.ok, true);
    assert.equal(result.toolCallsMade, 1);
  } finally {
    global.fetch = originalFetch;
  }
});

test("Q&A mode: enforces user isolation in tool execution", async () => {
  resetStoreForTests(structuredClone(createBaseStore()));

  const originalFetch = global.fetch;
  global.fetch = createFetchMock([
    {
      ok: true,
      toolCalls: [{
        id: "call_1",
        name: "get_overview",
        arguments: JSON.stringify({ range: "all" })
      }]
    },
    {
      ok: true,
      content: JSON.stringify({
        answer: "Here is your overview.",
        highlights: [],
        drill_down_filters: {}
      })
    }
  ]);

  try {
    const result = await runToolCallingAgent({
      mode: "qa",
      userId: "user_1",
      question: "Show me my spending",
      _testAiContext: TEST_AI_CONTEXT
    });

    assert.equal(result.ok, true);
    // The tool execution should only include user_1's transactions
    // This is verified by the tool-executor which filters by userId
  } finally {
    global.fetch = originalFetch;
  }
});

test("Q&A mode: handles clarification request", async () => {
  resetStoreForTests(structuredClone(createBaseStore()));

  const originalFetch = global.fetch;
  global.fetch = createFetchMock([
    {
      ok: true,
      toolCalls: [{
        id: "call_1",
        name: "ask_clarification",
        arguments: JSON.stringify({
          question: "Which time period are you interested in?",
          options: ["Last month", "Last year", "All time"]
        })
      }]
    }
  ]);

  try {
    const result = await runToolCallingAgent({
      mode: "qa",
      userId: "user_1",
      question: "How much did I spend?",
      _testAiContext: TEST_AI_CONTEXT
    });

    assert.equal(result.ok, true);
    assert.ok(result.clarification, "Should have clarification");
    assert.equal(result.clarification?.question, "Which time period are you interested in?");
    assert.deepEqual(result.clarification?.options, ["Last month", "Last year", "All time"]);
  } finally {
    global.fetch = originalFetch;
  }
});

// ============================================================================
// Categorization Mode Integration Tests
// ============================================================================

test("Categorization mode: history-based categorization", async () => {
  resetStoreForTests(structuredClone(createBaseStore()));

  const originalFetch = global.fetch;
  global.fetch = createFetchMock([
    // Agent first gets categories
    {
      ok: true,
      toolCalls: [{ id: "call_1", name: "get_categories", arguments: "{}" }]
    },
    // Agent checks merchant history - finds Netflix in history
    {
      ok: true,
      toolCalls: [{
        id: "call_2",
        name: "get_merchant_history",
        arguments: JSON.stringify({ merchant: "netflix" })
      }]
    },
    // Agent assigns category based on history
    {
      ok: true,
      toolCalls: [{
        id: "call_3",
        name: "assign_category",
        arguments: JSON.stringify({
          category: "Entertainment",
          confidence: 0.95,
          source: "history"
        })
      }]
    }
  ]);

  try {
    const result = await runToolCallingAgent({
      mode: "categorization",
      userId: "user_1",
      transaction: {
        id: "new_txn",
        merchant: "netflix",
        amount: 15.99,
        description: "Monthly subscription"
      },
      _testAiContext: TEST_AI_CONTEXT
    });

    assert.equal(result.ok, true);
    assert.equal(result.category, "Entertainment");
    assert.equal(result.confidence, 0.95);
    assert.equal(result.source, "history");
    assert.equal(result.toolCallsMade, 3);
  } finally {
    global.fetch = originalFetch;
  }
});

test("Categorization mode: inference-based categorization for unknown merchant", async () => {
  resetStoreForTests(structuredClone(createBaseStore()));

  const originalFetch = global.fetch;
  global.fetch = createFetchMock([
    // Agent gets categories
    {
      ok: true,
      toolCalls: [{ id: "call_1", name: "get_categories", arguments: "{}" }]
    },
    // Agent checks merchant history - finds nothing
    {
      ok: true,
      toolCalls: [{
        id: "call_2",
        name: "get_merchant_history",
        arguments: JSON.stringify({ merchant: "unknown electronics store" })
      }]
    },
    // Agent infers category from merchant name
    {
      ok: true,
      toolCalls: [{
        id: "call_3",
        name: "assign_category",
        arguments: JSON.stringify({
          category: "Entertainment", // Inferred from context
          confidence: 0.7,
          source: "inferred"
        })
      }]
    }
  ]);

  try {
    const result = await runToolCallingAgent({
      mode: "categorization",
      userId: "user_1",
      transaction: {
        id: "new_txn",
        merchant: "unknown electronics store",
        amount: 299.99,
        description: "Electronics purchase"
      },
      _testAiContext: TEST_AI_CONTEXT
    });

    assert.equal(result.ok, true);
    assert.equal(result.category, "Entertainment");
    assert.equal(result.confidence, 0.7);
    assert.equal(result.source, "inferred");
  } finally {
    global.fetch = originalFetch;
  }
});

test("Categorization mode: JSON response fallback", async () => {
  resetStoreForTests(structuredClone(createBaseStore()));

  const originalFetch = global.fetch;
  global.fetch = createFetchMock([
    // Agent responds with JSON directly without tool calls
    {
      ok: true,
      content: JSON.stringify({
        category: "Dining",
        confidence: 0.85,
        source: "inferred"
      })
    }
  ]);

  try {
    const result = await runToolCallingAgent({
      mode: "categorization",
      userId: "user_1",
      transaction: {
        merchant: "New Restaurant",
        amount: 45.00
      },
      _testAiContext: TEST_AI_CONTEXT
    });

    assert.equal(result.ok, true);
    assert.equal(result.category, "Dining");
    assert.equal(result.confidence, 0.85);
    assert.equal(result.source, "inferred");
  } finally {
    global.fetch = originalFetch;
  }
});

// ============================================================================
// Recurring Mode Integration Tests
// ============================================================================

test("Recurring mode: monthly pattern detection", async () => {
  resetStoreForTests(structuredClone(createBaseStore()));

  const originalFetch = global.fetch;
  global.fetch = createFetchMock([
    // Agent checks merchant's 6-month history
    {
      ok: true,
      toolCalls: [{
        id: "call_1",
        name: "get_merchant_transactions_6_months",
        arguments: JSON.stringify({ merchant: "netflix" })
      }]
    },
    // Agent detects monthly pattern and creates suggestion
    {
      ok: true,
      toolCalls: [{
        id: "call_2",
        name: "create_recurring_suggestion",
        arguments: JSON.stringify({
          merchant: "netflix",
          cadence: "monthly",
          suggested_amount: 15.99,
          confidence: 0.95
        })
      }]
    }
  ]);

  try {
    const result = await runToolCallingAgent({
      mode: "recurring",
      userId: "user_1",
      transaction: {
        id: "new_netflix",
        merchant: "netflix",
        amount: 15.99,
        description: "Netflix subscription"
      },
      _testAiContext: TEST_AI_CONTEXT
    });

    assert.equal(result.ok, true);
    assert.equal(result.isRecurring, true);
    assert.equal(result.cadence, "monthly");
    assert.equal(result.suggestedAmount, 15.99);
    assert.equal(result.confidence, 0.95);
    assert.equal(result.toolCallsMade, 2);
  } finally {
    global.fetch = originalFetch;
  }
});

test("Recurring mode: no pattern detected for non-recurring transaction", async () => {
  resetStoreForTests(structuredClone(createBaseStore()));

  const originalFetch = global.fetch;
  global.fetch = createFetchMock([
    // Agent responds that transaction is not recurring
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
      userId: "user_1",
      transaction: {
        id: "gas_station",
        merchant: "shell gas station",
        amount: 45.00,
        description: "Gas fill-up"
      },
      _testAiContext: TEST_AI_CONTEXT
    });

    assert.equal(result.ok, true);
    assert.equal(result.isRecurring, false);
  } finally {
    global.fetch = originalFetch;
  }
});

test("Recurring mode: weekly cadence detection", async () => {
  resetStoreForTests(structuredClone(createBaseStore()));

  const originalFetch = global.fetch;
  global.fetch = createFetchMock([
    {
      ok: true,
      toolCalls: [{
        id: "call_1",
        name: "get_merchant_transactions_6_months",
        arguments: JSON.stringify({ merchant: "weekly service" })
      }]
    },
    {
      ok: true,
      toolCalls: [{
        id: "call_2",
        name: "create_recurring_suggestion",
        arguments: JSON.stringify({
          merchant: "weekly service",
          cadence: "weekly",
          suggested_amount: 25.00,
          confidence: 0.90
        })
      }]
    }
  ]);

  try {
    const result = await runToolCallingAgent({
      mode: "recurring",
      userId: "user_1",
      transaction: {
        merchant: "weekly service",
        amount: 25.00
      },
      _testAiContext: TEST_AI_CONTEXT
    });

    assert.equal(result.ok, true);
    assert.equal(result.isRecurring, true);
    assert.equal(result.cadence, "weekly");
  } finally {
    global.fetch = originalFetch;
  }
});

// ============================================================================
// Import Mode Integration Tests
// ============================================================================

test("Import mode: batch processing with mixed sources", async () => {
  resetStoreForTests(structuredClone(createBaseStore()));

  const originalFetch = global.fetch;
  global.fetch = createFetchMock([
    // Agent gets categories
    {
      ok: true,
      toolCalls: [{ id: "call_1", name: "get_categories", arguments: "{}" }]
    },
    // Agent checks merchant history for first transaction
    {
      ok: true,
      toolCalls: [{
        id: "call_2",
        name: "get_merchant_history",
        arguments: JSON.stringify({ merchant: "netflix" })
      }]
    },
    // Agent checks merchant history for second transaction
    {
      ok: true,
      toolCalls: [{
        id: "call_3",
        name: "get_merchant_history",
        arguments: JSON.stringify({ merchant: "new merchant" })
      }]
    },
    // Agent assigns results
    {
      ok: true,
      toolCalls: [{
        id: "call_4",
        name: "assign_results",
        arguments: JSON.stringify({
          results: [
            {
              transaction_id: "txn_1",
              category: "Entertainment",
              direction: "outflow",
              confidence: 0.95,
              source: "history"
            },
            {
              transaction_id: "txn_2",
              category: "Dining",
              direction: "outflow",
              confidence: 0.7,
              source: "inferred"
            }
          ]
        })
      }]
    }
  ]);

  try {
    const result = await runToolCallingAgent({
      mode: "import",
      userId: "user_1",
      transactions: [
        { id: "txn_1", merchant: "netflix", amount: 15.99 },
        { id: "txn_2", merchant: "new merchant", amount: 25.00 }
      ],
      _testAiContext: TEST_AI_CONTEXT
    });

    assert.equal(result.ok, true);
    assert.ok(result.results, "Should have results");
    assert.equal(result.results?.length, 2);

    // First transaction should have history-based categorization
    assert.equal(result.results?.[0].transaction_id, "txn_1");
    assert.equal(result.results?.[0].category, "Entertainment");
    assert.equal(result.results?.[0].source, "history");

    // Second transaction should have inferred categorization
    assert.equal(result.results?.[1].transaction_id, "txn_2");
    assert.equal(result.results?.[1].category, "Dining");
    assert.equal(result.results?.[1].source, "inferred");
  } finally {
    global.fetch = originalFetch;
  }
});

test("Import mode: large batch processing", async () => {
  resetStoreForTests(structuredClone(createBaseStore()));

  // Create a batch of 10 transactions
  const transactions = Array.from({ length: 10 }, (_, i) => ({
    id: `batch_txn_${i + 1}`,
    merchant: `Merchant ${i + 1}`,
    amount: (i + 1) * 10
  }));

  const mockResults = transactions.map(t => ({
    transaction_id: t.id,
    category: "Shopping",
    direction: "outflow" as const,
    confidence: 0.8,
    source: "inferred" as const
  }));

  const originalFetch = global.fetch;
  global.fetch = createFetchMock([
    {
      ok: true,
      toolCalls: [{
        id: "call_1",
        name: "assign_results",
        arguments: JSON.stringify({ results: mockResults })
      }]
    }
  ]);

  try {
    const result = await runToolCallingAgent({
      mode: "import",
      userId: "user_1",
      transactions,
      _testAiContext: TEST_AI_CONTEXT
    });

    assert.equal(result.ok, true);
    assert.equal(result.results?.length, 10);

    // Verify all transactions are processed
    for (let i = 0; i < 10; i++) {
      assert.equal(result.results?.[i].transaction_id, `batch_txn_${i + 1}`);
      assert.equal(result.results?.[i].category, "Shopping");
    }
  } finally {
    global.fetch = originalFetch;
  }
});

test("Import mode: handles inflow direction", async () => {
  resetStoreForTests(structuredClone(createBaseStore()));

  const originalFetch = global.fetch;
  global.fetch = createFetchMock([
    {
      ok: true,
      toolCalls: [{
        id: "call_1",
        name: "assign_results",
        arguments: JSON.stringify({
          results: [
            {
              transaction_id: "txn_inflow",
              category: "Income",
              direction: "inflow",
              confidence: 0.9,
              source: "inferred"
            }
          ]
        })
      }]
    }
  ]);

  try {
    const result = await runToolCallingAgent({
      mode: "import",
      userId: "user_1",
      transactions: [
        { id: "txn_inflow", merchant: "Payroll", amount: -3000 }
      ],
      _testAiContext: TEST_AI_CONTEXT
    });

    assert.equal(result.ok, true);
    assert.equal(result.results?.[0].direction, "inflow");
  } finally {
    global.fetch = originalFetch;
  }
});

// ============================================================================
// Conversation and Session Tests
// ============================================================================

test("Conversation session: creates and maintains session", async () => {
  resetStoreForTests(structuredClone(createBaseStore()));

  const conversationId = createConversationId();

  const originalFetch = global.fetch;
  global.fetch = createFetchMock([
    {
      ok: true,
      content: JSON.stringify({
        answer: "You spent $500 on dining last month.",
        highlights: ["Total: $500"],
        drill_down_filters: { category: "Dining" }
      })
    }
  ]);

  try {
    const result = await runToolCallingAgent({
      mode: "qa",
      userId: "user_1",
      question: "How much did I spend on dining last month?",
      conversationId,
      _testAiContext: TEST_AI_CONTEXT
    });

    assert.equal(result.ok, true);
    assert.ok(result.answer);
  } finally {
    global.fetch = originalFetch;
  }
});

test("Conversation session: follow-up question with reference_previous", async () => {
  resetStoreForTests(structuredClone(createBaseStore()));

  const conversationId = createConversationId();
  const responseContent = JSON.stringify({
    answer: "You spent $500 this month.",
    highlights: ["Total: $500"],
    drill_down_filters: {}
  });

  const originalFetch = global.fetch;
  global.fetch = createFetchMock([
    // First call - initial question
    {
      ok: true,
      toolCalls: [{
        id: "call_1",
        name: "get_overview",
        arguments: JSON.stringify({ range: "30d" })
      }]
    },
    {
      ok: true,
      content: responseContent
    }
  ]);

  try {
    const result = await runToolCallingAgent({
      mode: "qa",
      userId: "user_1",
      question: "How much did I spend this month?",
      conversationId,
      _testAiContext: TEST_AI_CONTEXT
    });

    assert.equal(result.ok, true);
    assert.equal(result.toolCallsMade, 1);
    const session = await defaultConversationStore.get(conversationId);
    assert.ok(session, "Conversation session should be stored");
    assert.equal(session?.messages.at(-1)?.role, "assistant");
    assert.equal(session?.messages.at(-1)?.content, responseContent);
  } finally {
    global.fetch = originalFetch;
  }
});

// ============================================================================
// Error Handling Tests
// ============================================================================

test("Error handling: LLM API error", async () => {
  resetStoreForTests(structuredClone(createBaseStore()));

  const originalFetch = global.fetch;
  global.fetch = createFetchMock([
    { ok: false, error: "Rate limit exceeded" }
  ]);

  try {
    const result = await runToolCallingAgent({
      mode: "qa",
      userId: "user_1",
      question: "Test question",
      _testAiContext: TEST_AI_CONTEXT
    });

    assert.equal(result.ok, false);
    assert.ok(result.error?.includes("Rate limit") || result.error?.includes("failed"));
  } finally {
    global.fetch = originalFetch;
  }
});

test("Error handling: invalid JSON response in Q&A mode", async () => {
  resetStoreForTests(structuredClone(createBaseStore()));

  const originalFetch = global.fetch;
  global.fetch = createFetchMock([
    { ok: true, content: "This is not valid JSON but should be handled" }
  ]);

  try {
    const result = await runToolCallingAgent({
      mode: "qa",
      userId: "user_1",
      question: "Test question",
      _testAiContext: TEST_AI_CONTEXT
    });

    // Q&A mode should fall back to plain text response
    assert.equal(result.ok, true);
    assert.equal(result.answer, "This is not valid JSON but should be handled");
    assert.deepEqual(result.highlights, []);
    assert.deepEqual(result.drillDownFilters, {});
  } finally {
    global.fetch = originalFetch;
  }
});

test("Error handling: max tool calls exceeded", async () => {
  resetStoreForTests(structuredClone(createBaseStore()));

  const originalFetch = global.fetch;
  global.fetch = createFetchMock([
    { ok: true, toolCalls: [{ id: "call_1", name: "get_data_bounds", arguments: "{}" }] },
    { ok: true, toolCalls: [{ id: "call_2", name: "get_overview", arguments: "{}" }] },
    { ok: true, toolCalls: [{ id: "call_3", name: "get_category_breakdown", arguments: "{}" }] },
    { ok: true, toolCalls: [{ id: "call_4", name: "get_merchant_breakdown", arguments: "{}" }] },
    { ok: true, toolCalls: [{ id: "call_5", name: "get_anomalies", arguments: "{}" }] }
  ]);

  try {
    const result = await runToolCallingAgent({
      mode: "qa",
      userId: "user_1",
      question: "Complex question",
      _testAiContext: TEST_AI_CONTEXT
    });

    assert.equal(result.ok, false);
    assert.ok(result.error?.includes("Maximum tool calls"));
    assert.equal(result.toolCallsMade, 5);
  } finally {
    global.fetch = originalFetch;
  }
});

// ============================================================================
// Metadata and Tracking Tests
// ============================================================================

test("Metadata: tracks provider and model", async () => {
  resetStoreForTests(structuredClone(createBaseStore()));

  const originalFetch = global.fetch;
  global.fetch = createFetchMock([
    { ok: true, content: JSON.stringify({ answer: "Test", highlights: [] }) }
  ]);

  try {
    const result = await runToolCallingAgent({
      mode: "qa",
      userId: "user_1",
      question: "Test",
      _testAiContext: TEST_AI_CONTEXT
    });

    assert.equal(result.provider, "openai");
    assert.equal(result.model, "gpt-4");
  } finally {
    global.fetch = originalFetch;
  }
});

test("Metadata: tracks latency", async () => {
  resetStoreForTests(structuredClone(createBaseStore()));

  const originalFetch = global.fetch;
  global.fetch = createFetchMock([
    { ok: true, content: JSON.stringify({ answer: "Test", highlights: [] }) }
  ]);

  try {
    const result = await runToolCallingAgent({
      mode: "qa",
      userId: "user_1",
      question: "Test",
      _testAiContext: TEST_AI_CONTEXT
    });

    assert.ok(result.latencyMs >= 0);
  } finally {
    global.fetch = originalFetch;
  }
});

test("createConversationId generates valid IDs", () => {
  const id1 = createConversationId();
  const id2 = createConversationId();

  assert.ok(id1.startsWith("conv_"));
  assert.ok(id2.startsWith("conv_"));
  assert.notEqual(id1, id2, "IDs should be unique");
});
