import test from "node:test";
import assert from "node:assert/strict";

import { normalizeMerchant, categorizeTransaction, buildMerchantMemory } from "../src/categorization.js";

test("normalizeMerchant removes noisy payment tokens", () => {
  assert.equal(normalizeMerchant("SQ *COFFEE123 PURCHASE"), "coffee123");
});

test("categorizeTransaction prioritizes rule over other strategies", () => {
  const transaction = {
    merchant_normalized: "coffee123",
    description: "Coffee House",
    memo: "",
    direction: "debit"
  };

  const result = categorizeTransaction({
    transaction,
    userRules: [{ type: "contains", pattern: "coffee", category: "Dining", priority: 90 }],
    merchantMemory: { coffee123: "Groceries" }
  });

  assert.equal(result.category, "Dining");
  assert.equal(result.strategy, "rule_contains");
});

test("merchant memory is used when rules do not match", () => {
  const transaction = {
    merchant_normalized: "safe_market",
    description: "safe market",
    memo: "",
    direction: "debit"
  };

  const result = categorizeTransaction({
    transaction,
    userRules: [],
    merchantMemory: { safe_market: "Groceries" }
  });

  assert.equal(result.category, "Groceries");
  assert.equal(result.strategy, "merchant_memory");
});

test("buildMerchantMemory picks most frequent category for merchant", () => {
  const memory = buildMerchantMemory([
    { merchant_normalized: "coffee123", category_final: "Dining" },
    { merchant_normalized: "coffee123", category_final: "Dining" },
    { merchant_normalized: "coffee123", category_final: "Shopping" }
  ]);

  assert.equal(memory.coffee123, "Dining");
});
