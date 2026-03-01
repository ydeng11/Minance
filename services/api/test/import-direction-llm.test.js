import test from "node:test";
import assert from "node:assert/strict";

import { inferImportDirectionWithLlm } from "../src/llm/import-direction.js";

const BASE_INPUT = {
  userId: "user_1",
  sample: {
    row_count: 4,
    headers: ["date", "description", "amount"],
    mapping: { date: "date", merchant: "description", amount: "amount" },
    auxiliary_columns: null,
    amount_signs_in_sample: { positive: 2, negative: 2, zero: 0, null: 0 },
    deterministic_score: null,
    sample_rows: []
  },
  deterministicInference: {
    amountMode: "single_amount",
    signConvention: "negative_is_debit",
    confidence: 0.42,
    strategy: "deterministic",
    warnings: []
  }
};

test("LLM direction inference returns validated payload", async () => {
  const result = await inferImportDirectionWithLlm({
    ...BASE_INPUT,
    requireAiFeatureFn: () => ({ provider: "openai", apiKey: "sk-test", model: "gpt-4.1-mini" }),
    runStructuredLlmFn: async () => ({
      ok: true,
      data: {
        amount_mode: "single_amount",
        sign_convention: "positive_is_debit",
        confidence_internal: 0.81,
        reason_short: "Purchases are mostly positive",
        warnings: ["Some rows are mixed"]
      }
    })
  });

  assert.equal(result.ok, true);
  assert.equal(result.signConvention, "positive_is_debit");
  assert.equal(result.amountMode, "single_amount");
  assert.equal(result.confidence_internal, 0.81);
  assert.deepEqual(result.warnings, ["Some rows are mixed"]);
});

test("LLM direction inference rejects invalid convention payload", async () => {
  const result = await inferImportDirectionWithLlm({
    ...BASE_INPUT,
    requireAiFeatureFn: () => ({ provider: "openai", apiKey: "sk-test", model: "gpt-4.1-mini" }),
    runStructuredLlmFn: async () => ({
      ok: true,
      data: {
        amount_mode: "single_amount",
        sign_convention: "invalid_value",
        confidence_internal: 0.5
      }
    })
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, "invalid_sign_convention");
});

test("LLM direction inference surfaces timeout/failure reason", async () => {
  const result = await inferImportDirectionWithLlm({
    ...BASE_INPUT,
    requireAiFeatureFn: () => ({ provider: "openai", apiKey: "sk-test", model: "gpt-4.1-mini" }),
    runStructuredLlmFn: async () => ({
      ok: false,
      error: "LLM request timed out"
    })
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, "LLM request timed out");
});
