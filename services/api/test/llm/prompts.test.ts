import test from "node:test";
import assert from "node:assert/strict";

import { buildCategorizationPrompt } from "../../src/llm/prompts.ts";

test("categorization prompt omits backup training context", () => {
  const { userPrompt } = buildCategorizationPrompt({
    transaction: {
      description: "Unknown Store",
      merchant_normalized: "unknown store",
      amount: -42,
      direction: "outflow"
    },
    userRules: [],
    exemplars: []
  });

  assert.doesNotMatch(userPrompt, /Global training/);
  assert.doesNotMatch(userPrompt, /raw_category_mappings/);
  assert.doesNotMatch(userPrompt, /merchant_exemplars/);
});

test("categorization prompt keeps user-specific guidance", () => {
  const { userPrompt } = buildCategorizationPrompt({
    transaction: {
      description: "Coffee Shop",
      merchant_normalized: "coffee shop",
      amount: -8,
      direction: "outflow"
    },
    userRules: [{ type: "contains", pattern: "coffee", category: "Dining" }],
    exemplars: [{ merchant: "coffee shop", category: "Dining" }]
  });

  assert.match(userPrompt, /User-defined category rules/);
  assert.match(userPrompt, /User historical merchant exemplars/);
  assert.match(userPrompt, /coffee/);
});
