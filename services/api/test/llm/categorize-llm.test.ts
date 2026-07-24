// services/api/test/llm/categorize-llm.test.ts
// Tests for categorizeTransactionWithLlm with injected mocks

import test from "node:test";
import assert from "node:assert/strict";
import { resetStoreForTests } from "../../src/store.ts";

const { categorizeTransactionWithLlm } = await import("../../src/llm/categorize.ts");

// Mock provider that matches the allowed list
const mockProvider = () => ({
  ok: true,
  provider: "openai",
  model: "gpt-4.1-mini",
  credentialId: "cred_test",
  apiKey: "sk-test-key"
});

// Mock structured LLM that returns valid data
const mockStructuredLlm = (data: any) => async () => ({
  ok: true,
  data,
  rawText: JSON.stringify(data),
  latencyMs: 50
});

// Minimal store so loadStore doesn't fail
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

test("valid categorization returns category, confidence, signals", async () => {
  resetStoreForTests(makeEmptyStore());

  const result = await categorizeTransactionWithLlm({
    userId: "user_1",
    transaction: {
      merchant_normalized: "netflix",
      amount: -15.99,
      direction: "outflow",
      description: "Monthly subscription"
    },
    userRules: [],
    requireAiFeatureFn: mockProvider,
    runStructuredLlmFn: mockStructuredLlm({
      category: "Entertainment",
      reason_short: "Netflix is a streaming service",
      signals_used: ["merchant name", "amount pattern"],
      confidence_internal: 0.92
    })
  });

  assert.equal(result.ok, true);
  assert.equal(result.category, "Entertainment");
  assert.equal(result.confidence_internal, 0.92);
  assert.equal(result.reason_short, "Netflix is a streaming service");
  assert.deepEqual(result.signals_used, ["merchant name", "amount pattern"]);
  assert.equal(result.provider, "openai");
  assert.equal(result.model, "gpt-4.1-mini");
});

test("invalid category returns invalid_category error", async () => {
  resetStoreForTests(makeEmptyStore());

  const result = await categorizeTransactionWithLlm({
    userId: "user_1",
    transaction: {
      merchant_normalized: "unknown",
      amount: -50,
      direction: "outflow"
    },
    userRules: [],
    requireAiFeatureFn: mockProvider,
    runStructuredLlmFn: mockStructuredLlm({
      category: "NonExistentCategory",
      reason_short: "Test",
      signals_used: [],
      confidence_internal: 0.5
    })
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, "invalid_category");
});

test("confidence clamped to [0, 1]", async () => {
  resetStoreForTests(makeEmptyStore());

  const resultHigh = await categorizeTransactionWithLlm({
    userId: "user_1",
    transaction: { merchant_normalized: "test", amount: -10, direction: "outflow" },
    userRules: [],
    requireAiFeatureFn: mockProvider,
    runStructuredLlmFn: mockStructuredLlm({
      category: "Shopping",
      reason_short: "Test",
      signals_used: [],
      confidence_internal: 5.0
    })
  });

  assert.equal(resultHigh.ok, true);
  assert.equal(resultHigh.confidence_internal, 1.0, "Confidence should be capped at 1.0");

  const resultLow = await categorizeTransactionWithLlm({
    userId: "user_1",
    transaction: { merchant_normalized: "test", amount: -10, direction: "outflow" },
    userRules: [],
    requireAiFeatureFn: mockProvider,
    runStructuredLlmFn: mockStructuredLlm({
      category: "Shopping",
      reason_short: "Test",
      signals_used: [],
      confidence_internal: -5.0
    })
  });

  assert.equal(resultLow.ok, true);
  assert.equal(resultLow.confidence_internal, 0.0, "Confidence should be floored at 0.0");
});

test("NaN confidence falls back to 0.7", async () => {
  resetStoreForTests(makeEmptyStore());

  const result = await categorizeTransactionWithLlm({
    userId: "user_1",
    transaction: { merchant_normalized: "test", amount: -10, direction: "outflow" },
    userRules: [],
    requireAiFeatureFn: mockProvider,
    runStructuredLlmFn: mockStructuredLlm({
      category: "Dining",
      reason_short: "Test",
      signals_used: [],
      confidence_internal: "not-a-number"
    })
  });

  assert.equal(result.ok, true);
  assert.equal(result.confidence_internal, 0.7, "NaN confidence should fall back to 0.7");
});

test("signals_used capped at 6 items", async () => {
  resetStoreForTests(makeEmptyStore());

  const manySignals = Array.from({ length: 10 }, (_, i) => `signal_${i + 1}`);

  const result = await categorizeTransactionWithLlm({
    userId: "user_1",
    transaction: { merchant_normalized: "test", amount: -10, direction: "outflow" },
    userRules: [],
    requireAiFeatureFn: mockProvider,
    runStructuredLlmFn: mockStructuredLlm({
      category: "Groceries",
      reason_short: "Test",
      signals_used: manySignals,
      confidence_internal: 0.8
    })
  });

  assert.equal(result.ok, true);
  assert.equal(result.signals_used.length, 6);
  assert.deepEqual(result.signals_used, manySignals.slice(0, 6));
});

test("non-array signals_used returns empty array", async () => {
  resetStoreForTests(makeEmptyStore());

  const result = await categorizeTransactionWithLlm({
    userId: "user_1",
    transaction: { merchant_normalized: "test", amount: -10, direction: "outflow" },
    userRules: [],
    requireAiFeatureFn: mockProvider,
    runStructuredLlmFn: mockStructuredLlm({
      category: "Dining",
      reason_short: "Test",
      signals_used: "not-an-array",
      confidence_internal: 0.7
    })
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.signals_used, []);
});

test("provider_not_supported for unsupported provider", async () => {
  resetStoreForTests(makeEmptyStore());

  const result = await categorizeTransactionWithLlm({
    userId: "user_1",
    transaction: { merchant_normalized: "test", amount: -10, direction: "outflow" },
    userRules: [],
    requireAiFeatureFn: () => ({
      ok: true,
      provider: "unsupported",
      model: "test",
      credentialId: "cred_test",
      apiKey: "sk-test"
    }),
    runStructuredLlmFn: mockStructuredLlm({})
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, "provider_not_supported");
});

test("no AI setup returns no_ai_setup error", async () => {
  resetStoreForTests(makeEmptyStore());

  const result = await categorizeTransactionWithLlm({
    userId: "user_1",
    transaction: { merchant_normalized: "test", amount: -10, direction: "outflow" },
    userRules: [],
    requireAiFeatureFn: () => { throw new Error("AI not configured"); },
    runStructuredLlmFn: mockStructuredLlm({})
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, "no_ai_setup");
});

test("LLM failure returns llm_failed reason", async () => {
  resetStoreForTests(makeEmptyStore());

  const result = await categorizeTransactionWithLlm({
    userId: "user_1",
    transaction: { merchant_normalized: "test", amount: -10, direction: "outflow" },
    userRules: [],
    requireAiFeatureFn: mockProvider,
    runStructuredLlmFn: async () => ({
      ok: false,
      error: "API error",
      latencyMs: 50
    })
  });

  assert.equal(result.ok, false);
  assert.ok(result.reason, "Should have an error reason");
});

test("empty reason_short gets default value", async () => {
  resetStoreForTests(makeEmptyStore());

  const result = await categorizeTransactionWithLlm({
    userId: "user_1",
    transaction: { merchant_normalized: "test", amount: -10, direction: "outflow" },
    userRules: [],
    requireAiFeatureFn: mockProvider,
    runStructuredLlmFn: mockStructuredLlm({
      category: "Transport",
      reason_short: "",
      signals_used: [],
      confidence_internal: 0.8
    })
  });

  assert.equal(result.ok, true);
  assert.equal(result.reason_short, "LLM categorization");
});

test("returns provider and model metadata", async () => {
  resetStoreForTests(makeEmptyStore());

  const result = await categorizeTransactionWithLlm({
    userId: "user_1",
    transaction: { merchant_normalized: "test", amount: -10, direction: "outflow" },
    userRules: [],
    requireAiFeatureFn: () => ({
      ok: true,
      provider: "openrouter",
      model: "gpt-4o",
      credentialId: "cred_test",
      apiKey: "sk-or-v1-test"
    }),
    runStructuredLlmFn: mockStructuredLlm({
      category: "Income",
      reason_short: "Test",
      signals_used: [],
      confidence_internal: 0.9
    })
  });

  assert.equal(result.ok, true);
  assert.equal(result.provider, "openrouter");
  assert.equal(result.model, "gpt-4o");
});
