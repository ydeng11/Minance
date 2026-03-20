// services/api/test/llm/import-batch.test.ts

import test from "node:test";
import assert from "node:assert/strict";
import {
  processImportBatch,
  IMPORT_BATCH_SIZE,
  type ImportBatchTransaction,
  type ImportBatchResult
} from "../../src/llm/import-direction.ts";
import type { AgentResult } from "../../src/llm/agent.ts";

const TEST_AI_CONTEXT = {
  provider: "openai",
  model: "gpt-4",
  apiKey: "test-key"
};

// Helper to create a mock agent function
function createMockAgent(results: Partial<AgentResult>[]): (input: unknown) => Promise<AgentResult> {
  let callIndex = 0;
  return async () => {
    const result = results[callIndex++] || results[results.length - 1];
    return {
      ok: true,
      toolCallsMade: 1,
      provider: "openai",
      model: "gpt-4",
      latencyMs: 10,
      ...result
    } as AgentResult;
  };
}

// Helper to create test transactions
function createTransactions(count: number): ImportBatchTransaction[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `txn_${i + 1}`,
    merchant: `Merchant ${i + 1}`,
    amount: (i + 1) * 10,
    description: `Transaction ${i + 1}`
  }));
}

test("processImportBatch should return uncategorized results when AI not configured", async () => {
  const transactions = createTransactions(3);

  const result = await processImportBatch({
    userId: "user_123",
    transactions
  });

  assert.equal(result.ok, false);
  assert.ok(result.error?.includes("AI"), "Should mention AI setup");
  assert.equal(result.results.length, 3, "Should return results for all transactions");
  assert.equal(result.results[0].category, "Uncategorized");
  assert.ok(result.latencyMs >= 0);
});

test("processImportBatch should process transactions successfully", async () => {
  const transactions = createTransactions(2);
  const mockResults: ImportBatchResult[] = [
    { transaction_id: "txn_1", category: "Entertainment", direction: "outflow", confidence: 0.95, source: "history" },
    { transaction_id: "txn_2", category: "Shopping", direction: "outflow", confidence: 0.8, source: "inferred" }
  ];

  const result = await processImportBatch({
    userId: "user_123",
    transactions,
    _testAiContext: TEST_AI_CONTEXT,
    _testAgent: createMockAgent([{
      ok: true,
      results: mockResults
    }])
  });

  assert.equal(result.ok, true);
  assert.equal(result.results.length, 2);
  assert.equal(result.results[0].category, "Entertainment");
  assert.equal(result.results[0].source, "history");
  assert.equal(result.results[1].category, "Shopping");
  assert.equal(result.results[1].source, "inferred");
  assert.equal(result.provider, "openai");
  assert.equal(result.model, "gpt-4");
});

test("processImportBatch should handle empty transaction batch", async () => {
  const result = await processImportBatch({
    userId: "user_123",
    transactions: [],
    _testAiContext: TEST_AI_CONTEXT,
    _testAgent: createMockAgent([{}])
  });

  assert.equal(result.ok, true);
  assert.equal(result.results.length, 0);
});

test("processImportBatch should reject batches exceeding maximum size", async () => {
  const transactions = createTransactions(IMPORT_BATCH_SIZE + 1);

  const result = await processImportBatch({
    userId: "user_123",
    transactions,
    _testAiContext: TEST_AI_CONTEXT,
    _testAgent: createMockAgent([{}])
  });

  assert.equal(result.ok, false);
  assert.ok(result.error?.includes("Batch size exceeds maximum"));
  assert.equal(result.results.length, IMPORT_BATCH_SIZE + 1, "Should return uncategorized results for all");
  assert.equal(result.results[0].category, "Uncategorized");
});

test("processImportBatch should handle agent failure gracefully", async () => {
  const transactions = createTransactions(2);

  const result = await processImportBatch({
    userId: "user_123",
    transactions,
    _testAiContext: TEST_AI_CONTEXT,
    _testAgent: createMockAgent([{
      ok: false,
      error: "Agent failed"
    }])
  });

  assert.equal(result.ok, false);
  assert.ok(result.error?.includes("Agent failed"));
  assert.equal(result.results.length, 2, "Should return fallback results");
  assert.equal(result.results[0].category, "Uncategorized");
});

test("processImportBatch should handle missing transaction results", async () => {
  const transactions = createTransactions(3);
  // Agent only returns 2 results, missing one
  const mockResults: ImportBatchResult[] = [
    { transaction_id: "txn_1", category: "Food", direction: "outflow", confidence: 0.9, source: "history" },
    { transaction_id: "txn_3", category: "Transport", direction: "outflow", confidence: 0.85, source: "inferred" }
  ];

  const result = await processImportBatch({
    userId: "user_123",
    transactions,
    _testAiContext: TEST_AI_CONTEXT,
    _testAgent: createMockAgent([{
      ok: true,
      results: mockResults
    }])
  });

  assert.equal(result.ok, true);
  assert.equal(result.results.length, 3);
  // txn_1 should have the agent result
  assert.equal(result.results[0].transaction_id, "txn_1");
  assert.equal(result.results[0].category, "Food");
  // txn_2 should be uncategorized (missing from agent result)
  assert.equal(result.results[1].transaction_id, "txn_2");
  assert.equal(result.results[1].category, "Uncategorized");
  // txn_3 should have the agent result
  assert.equal(result.results[2].transaction_id, "txn_3");
  assert.equal(result.results[2].category, "Transport");
});

test("processImportBatch should infer direction from amount sign", async () => {
  const transactions: ImportBatchTransaction[] = [
    { id: "txn_1", merchant: "Refund Store", amount: -50 }, // negative = inflow
    { id: "txn_2", merchant: "Regular Store", amount: 50 }, // positive = outflow
    { id: "txn_3", merchant: "Zero Store", amount: 0 } // zero = outflow (default)
  ];

  const result = await processImportBatch({
    userId: "user_123",
    transactions,
    _testAiContext: TEST_AI_CONTEXT,
    _testAgent: createMockAgent([{
      ok: false,
      error: "Force fallback"
    }])
  });

  assert.equal(result.ok, false);
  assert.equal(result.results[0].direction, "inflow", "Negative amount should be inflow");
  assert.equal(result.results[1].direction, "outflow", "Positive amount should be outflow");
  assert.equal(result.results[2].direction, "outflow", "Zero amount should be outflow");
});

test("processImportBatch should handle agent exceptions", async () => {
  const transactions = createTransactions(2);

  const result = await processImportBatch({
    userId: "user_123",
    transactions,
    _testAiContext: TEST_AI_CONTEXT,
    _testAgent: async () => {
      throw new Error("Network error");
    }
  });

  assert.equal(result.ok, false);
  assert.ok(result.error?.includes("Network error"));
  assert.equal(result.results.length, 2, "Should return fallback results");
  assert.equal(result.results[0].category, "Uncategorized");
});

test("processImportBatch should track latency", async () => {
  const transactions = createTransactions(1);

  const result = await processImportBatch({
    userId: "user_123",
    transactions,
    _testAiContext: TEST_AI_CONTEXT,
    _testAgent: createMockAgent([{
      ok: true,
      results: [{ transaction_id: "txn_1", category: "Test", direction: "outflow", confidence: 0.9, source: "inferred" }]
    }])
  });

  assert.ok(result.latencyMs >= 0);
});

test("processImportBatch should accept maximum batch size", async () => {
  const transactions = createTransactions(IMPORT_BATCH_SIZE);
  const mockResults: ImportBatchResult[] = transactions.map(t => ({
    transaction_id: t.id,
    category: "Test",
    direction: "outflow" as const,
    confidence: 0.9,
    source: "inferred" as const
  }));

  const result = await processImportBatch({
    userId: "user_123",
    transactions,
    _testAiContext: TEST_AI_CONTEXT,
    _testAgent: createMockAgent([{
      ok: true,
      results: mockResults
    }])
  });

  assert.equal(result.ok, true);
  assert.equal(result.results.length, IMPORT_BATCH_SIZE);
});

test("processImportBatch should preserve all transaction fields", async () => {
  const transactions: ImportBatchTransaction[] = [
    { id: "txn_1", merchant: "Netflix", amount: 15.99, description: "Monthly subscription" },
    { id: "txn_2", merchant: "Amazon", amount: 45.00 }
  ];

  const mockResults: ImportBatchResult[] = [
    { transaction_id: "txn_1", category: "Entertainment", direction: "outflow", confidence: 0.95, source: "history" },
    { transaction_id: "txn_2", category: "Shopping", direction: "outflow", confidence: 0.8, source: "inferred" }
  ];

  // Verify the agent receives the correct transaction data
  let receivedTransactions: unknown;
  const result = await processImportBatch({
    userId: "user_123",
    transactions,
    _testAiContext: TEST_AI_CONTEXT,
    _testAgent: async (input: unknown) => {
      receivedTransactions = (input as { transactions?: unknown }).transactions;
      return {
        ok: true,
        results: mockResults,
        toolCallsMade: 1,
        provider: "openai",
        model: "gpt-4",
        latencyMs: 10
      };
    }
  });

  assert.equal(result.ok, true);
  assert.ok(Array.isArray(receivedTransactions));
  assert.equal((receivedTransactions as Array<{ id: string }>).length, 2);
  assert.equal((receivedTransactions as Array<{ id: string }>)[0].id, "txn_1");
});

test("processImportBatch should handle mixed history and inferred sources", async () => {
  const transactions = createTransactions(3);
  const mockResults: ImportBatchResult[] = [
    { transaction_id: "txn_1", category: "Entertainment", direction: "outflow", confidence: 0.95, source: "history" },
    { transaction_id: "txn_2", category: "Shopping", direction: "outflow", confidence: 0.7, source: "inferred" },
    { transaction_id: "txn_3", category: "Food", direction: "outflow", confidence: 0.85, source: "history" }
  ];

  const result = await processImportBatch({
    userId: "user_123",
    transactions,
    _testAiContext: TEST_AI_CONTEXT,
    _testAgent: createMockAgent([{
      ok: true,
      results: mockResults
    }])
  });

  assert.equal(result.ok, true);
  assert.equal(result.results[0].source, "history");
  assert.equal(result.results[1].source, "inferred");
  assert.equal(result.results[2].source, "history");
});