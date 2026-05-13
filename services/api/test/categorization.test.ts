import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeMerchant,
  categorizeTransaction,
  buildMerchantMemory,
  categorizeTransactionWithAgent
} from "../src/categorization.ts";

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

test("categorizeTransaction maps Jeep/Honda merchants to Auto", () => {
  const transaction = {
    merchant_normalized: "american honda finance",
    description: "Honda Financial Services",
    memo: "",
    direction: "debit",
    category_raw: "Automotive"
  };

  const result = categorizeTransaction({
    transaction,
    userRules: [],
    merchantMemory: {}
  });

  assert.equal(result.category, "Auto");
});

// Tests for categorizeTransactionWithAgent
test("categorizeTransactionWithAgent prioritizes rules over agent", async () => {
  const transaction = {
    merchant_normalized: "coffee123",
    description: "Coffee House",
    memo: "",
    direction: "debit"
  };

  const result = await categorizeTransactionWithAgent({
    transaction,
    userRules: [{ type: "contains", pattern: "coffee", category: "Dining", priority: 90 }],
    merchantMemory: {},
    userId: "user-1"
  });

  assert.equal(result.category, "Dining");
  assert.equal(result.strategy, "rule_contains");
});

test("categorizeTransactionWithAgent prioritizes merchant memory over agent", async () => {
  const transaction = {
    merchant_normalized: "safe_market",
    description: "safe market",
    memo: "",
    direction: "debit"
  };

  const result = await categorizeTransactionWithAgent({
    transaction,
    userRules: [],
    merchantMemory: { safe_market: "Groceries" },
    userId: "user-1"
  });

  assert.equal(result.category, "Groceries");
  assert.equal(result.strategy, "merchant_memory");
});

test("categorizeTransactionWithAgent calls agent when rules and memory do not match", async () => {
  let agentCalled = false;
  const transaction = {
    merchant_normalized: "unknown_merchant",
    description: "Unknown Store",
    memo: "",
    direction: "debit",
    category_raw: "Food & Drink",
    amount: 50
  };

  const result = await categorizeTransactionWithAgent({
    transaction,
    userRules: [],
    merchantMemory: {},
    userId: "user-1",
    _testAgentEnabled: true,
    _testAgentFn: async () => {
      agentCalled = true;
      return {
        ok: true,
        category: "Shopping",
        confidence: 0.85,
        source: "inferred"
      };
    }
  });

  assert.equal(agentCalled, true);
  assert.equal(result.category, "Shopping");
  assert.equal(result.strategy, "agent_inferred");
});

test("categorizeTransactionWithAgent uses agent_history strategy when source is history", async () => {
  const transaction = {
    merchant_normalized: "starbucks",
    description: "Starbucks Coffee",
    memo: "",
    direction: "debit",
    amount: 15
  };

  const result = await categorizeTransactionWithAgent({
    transaction,
    userRules: [],
    merchantMemory: {},
    userId: "user-1",
    _testAgentEnabled: true,
    _testAgentFn: async () => ({
      ok: true,
      category: "Dining",
      confidence: 0.92,
      source: "history"
    })
  });

  assert.equal(result.category, "Dining");
  assert.equal(result.strategy, "agent_history");
});

test("categorizeTransactionWithAgent falls back to keyword model when agent fails", async () => {
  const transaction = {
    merchant_normalized: "xyzzy_plugh",
    description: "Xyzzy Plugh",
    memo: "",
    direction: "debit",
    amount: 45
  };

  const result = await categorizeTransactionWithAgent({
    transaction,
    userRules: [],
    merchantMemory: {},
    userId: "user-1",
    _testAgentEnabled: true,
    _testAgentFn: async () => ({
      ok: false
    })
  });

  // Falls back to keyword model or heuristic (no agent strategy)
  assert.ok(!result.strategy.startsWith("agent_"), `Expected non-agent strategy, got ${result.strategy}`);
});

test("categorizeTransactionWithAgent falls back to keyword model when agent returns no category", async () => {
  const transaction = {
    merchant_normalized: "xyzzy_plugh",
    description: "Xyzzy Plugh",
    memo: "",
    direction: "debit",
    amount: 45
  };

  const result = await categorizeTransactionWithAgent({
    transaction,
    userRules: [],
    merchantMemory: {},
    userId: "user-1",
    _testAgentEnabled: true,
    _testAgentFn: async () => ({
      ok: true
      // No category returned
    })
  });

  // Falls back to keyword model or heuristic (no agent strategy)
  assert.ok(!result.strategy.startsWith("agent_"), `Expected non-agent strategy, got ${result.strategy}`);
});

test("categorizeTransactionWithAgent skips agent when flag is disabled", async () => {
  const transaction = {
    merchant_normalized: "xyzzy_plugh",
    description: "Xyzzy Plugh",
    memo: "",
    direction: "debit",
    amount: 50
  };

  const result = await categorizeTransactionWithAgent({
    transaction,
    userRules: [],
    merchantMemory: {},
    userId: "user-1",
    _testAgentEnabled: false, // Agent disabled
    _testAgentFn: async () => ({
      ok: true,
      category: "ShouldNotSee",
      confidence: 0.9,
      source: "inferred"
    })
  });

  // Should fall back to keyword model or heuristic since agent is disabled
  assert.ok(!result.strategy.startsWith("agent_"), `Expected non-agent strategy, got ${result.strategy}`);
});

test("categorizeTransactionWithAgent handles agent exceptions gracefully", async () => {
  const transaction = {
    merchant_normalized: "xyzzy_plugh",
    description: "Xyzzy Plugh",
    memo: "",
    direction: "debit",
    amount: 50
  };

  const result = await categorizeTransactionWithAgent({
    transaction,
    userRules: [],
    merchantMemory: {},
    userId: "user-1",
    _testAgentEnabled: true,
    _testAgentFn: async () => {
      throw new Error("Agent crashed");
    }
  });

  // Should fall back to keyword model or heuristic (no agent strategy)
  assert.ok(!result.strategy.startsWith("agent_"), `Expected non-agent strategy, got ${result.strategy}`);
});
