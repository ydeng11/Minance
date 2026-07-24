// services/api/test/llm/assistant-synthesis.test.ts
// Tests for synthesizeAssistantAnswerWithLlm with injected mocks

import test from "node:test";
import assert from "node:assert/strict";

const { synthesizeAssistantAnswerWithLlm } = await import("../../src/llm/assistant.ts");

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

test("valid synthesis returns answer with highlights and filters", async () => {
  const result = await synthesizeAssistantAnswerWithLlm({
    userId: "user_1",
    question: "How much did I spend last month?",
    plan: { plan_summary: "Get overview for last month", key_points: [] },
    deterministicResult: { answer: "$500", numbers: { total: 500 }, filters: {}, details: {} },
    requireAiFeatureFn: mockProvider,
    runStructuredLlmFn: mockStructuredLlm({
      answer: "You spent $500 last month.",
      highlights: ["Total spending: $500", "Top category: Dining"],
      drill_down_filters: { start: "2026-02-01", end: "2026-02-28" }
    })
  });

  assert.equal(result.ok, true);
  assert.equal(result.answer, "You spent $500 last month.");
  assert.deepEqual(result.highlights, ["Total spending: $500", "Top category: Dining"]);
  assert.deepEqual(result.drillDownFilters, { start: "2026-02-01", end: "2026-02-28" });
  assert.equal(result.provider, "openai");
  assert.equal(result.model, "gpt-4.1-mini");
});

test("empty answer from LLM returns empty_answer error", async () => {
  const result = await synthesizeAssistantAnswerWithLlm({
    userId: "user_1",
    question: "How much?",
    plan: {},
    deterministicResult: { answer: "", numbers: {}, filters: {}, details: {} },
    requireAiFeatureFn: mockProvider,
    runStructuredLlmFn: mockStructuredLlm({
      answer: "",
      highlights: [],
      drill_down_filters: {}
    })
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, "empty_answer");
});

test("whitespace-only answer returns empty_answer error", async () => {
  const result = await synthesizeAssistantAnswerWithLlm({
    userId: "user_1",
    question: "How much?",
    plan: {},
    deterministicResult: { answer: "", numbers: {}, filters: {}, details: {} },
    requireAiFeatureFn: mockProvider,
    runStructuredLlmFn: mockStructuredLlm({
      answer: "   ",
      highlights: [],
      drill_down_filters: {}
    })
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, "empty_answer");
});

test("provider_not_supported for unsupported provider", async () => {
  const result = await synthesizeAssistantAnswerWithLlm({
    userId: "user_1",
    question: "How much?",
    plan: {},
    deterministicResult: { answer: "", numbers: {}, filters: {}, details: {} },
    requireAiFeatureFn: () => ({
      ok: true,
      provider: "unsupported-provider",
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
  const result = await synthesizeAssistantAnswerWithLlm({
    userId: "user_1",
    question: "How much?",
    plan: {},
    deterministicResult: { answer: "", numbers: {}, filters: {}, details: {} },
    requireAiFeatureFn: () => { throw new Error("AI not configured"); },
    runStructuredLlmFn: mockStructuredLlm({})
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, "no_ai_setup");
});



test("LLM failure returns llm_failed reason", async () => {
  const result = await synthesizeAssistantAnswerWithLlm({
    userId: "user_1",
    question: "How much?",
    plan: {},
    deterministicResult: { answer: "", numbers: {}, filters: {}, details: {} },
    requireAiFeatureFn: mockProvider,
    runStructuredLlmFn: async () => ({
      ok: false,
      error: "API rate limit exceeded",
      latencyMs: 100
    })
  });

  assert.equal(result.ok, false);
  assert.ok(result.reason?.includes("rate limit") || result.reason?.includes("API"));
});

test("highlights capped at 4 items", async () => {
  const result = await synthesizeAssistantAnswerWithLlm({
    userId: "user_1",
    question: "How much?",
    plan: {},
    deterministicResult: { answer: "", numbers: {}, filters: {}, details: {} },
    requireAiFeatureFn: mockProvider,
    runStructuredLlmFn: mockStructuredLlm({
      answer: "Test answer.",
      highlights: ["1", "2", "3", "4", "5", "6"],
      drill_down_filters: {}
    })
  });

  assert.equal(result.ok, true);
  assert.equal(result.highlights.length, 4);
  assert.deepEqual(result.highlights, ["1", "2", "3", "4"]);
});

test("drill_down_filters sanitized — only allowed keys", async () => {
  const result = await synthesizeAssistantAnswerWithLlm({
    userId: "user_1",
    question: "How much?",
    plan: {},
    deterministicResult: { answer: "", numbers: {}, filters: {}, details: {} },
    requireAiFeatureFn: mockProvider,
    runStructuredLlmFn: mockStructuredLlm({
      answer: "Test answer.",
      highlights: [],
      drill_down_filters: {
        start: "2026-01-01",
        end: "2026-01-31",
        category: "Dining",
        merchant: "Coffee Shop",
        malicious_key: "should be removed",
        another_bad: "also removed"
      }
    })
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.drillDownFilters, {
    start: "2026-01-01",
    end: "2026-01-31",
    category: "Dining",
    merchant: "Coffee Shop"
  });
});

test("drill_down_filters excludes null and empty values", async () => {
  const result = await synthesizeAssistantAnswerWithLlm({
    userId: "user_1",
    question: "How much?",
    plan: {},
    deterministicResult: { answer: "", numbers: {}, filters: {}, details: {} },
    requireAiFeatureFn: mockProvider,
    runStructuredLlmFn: mockStructuredLlm({
      answer: "Test answer.",
      highlights: [],
      drill_down_filters: {
        start: null,
        end: "",
        category: "Groceries",
        merchant: null
      }
    })
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.drillDownFilters, {
    category: "Groceries"
  });
});

test("highlights filters out empty strings", async () => {
  const result = await synthesizeAssistantAnswerWithLlm({
    userId: "user_1",
    question: "How much?",
    plan: {},
    deterministicResult: { answer: "", numbers: {}, filters: {}, details: {} },
    requireAiFeatureFn: mockProvider,
    runStructuredLlmFn: mockStructuredLlm({
      answer: "Test.",
      highlights: ["Valid highlight", "", "Another valid"],
      drill_down_filters: {}
    })
  });

  assert.equal(result.ok, true);
  // Empty strings are filtered out by .filter(Boolean) after String() conversion.
  assert.deepEqual(result.highlights, ["Valid highlight", "Another valid"]);
});

test("non-array highlights are ignored", async () => {
  const result = await synthesizeAssistantAnswerWithLlm({
    userId: "user_1",
    question: "How much?",
    plan: {},
    deterministicResult: { answer: "", numbers: {}, filters: {}, details: {} },
    requireAiFeatureFn: mockProvider,
    runStructuredLlmFn: mockStructuredLlm({
      answer: "Test answer.",
      highlights: "not-an-array",
      drill_down_filters: {}
    })
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.highlights, []);
});

test("returns provider and model metadata", async () => {
  const result = await synthesizeAssistantAnswerWithLlm({
    userId: "user_1",
    question: "How much?",
    plan: {},
    deterministicResult: { answer: "", numbers: {}, filters: {}, details: {} },
    requireAiFeatureFn: () => ({
      ok: true,
      provider: "openrouter",
      model: "gpt-4o",
      credentialId: "cred_test",
      apiKey: "sk-or-v1-test"
    }),
    runStructuredLlmFn: mockStructuredLlm({
      answer: "Test.",
      highlights: [],
      drill_down_filters: {}
    })
  });

  assert.equal(result.ok, true);
  assert.equal(result.provider, "openrouter");
  assert.equal(result.model, "gpt-4o");
});
