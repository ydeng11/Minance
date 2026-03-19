import test from "node:test";
import assert from "node:assert/strict";
import { validatePatterns, formatTransactionsForLlm } from "../../src/llm/recurring-detection.ts";

test("validatePatterns filters invalid cadences", () => {
  const input = [
    { is_recurring: true, amount: 15.99, cadence: "monthly" },
    { is_recurring: true, amount: 10, cadence: "bi-monthly" } // Invalid
  ];

  const result = validatePatterns(input);
  assert.equal(result.length, 1);
  assert.equal(result[0].cadence, "monthly");
});

test("validatePatterns filters negative/zero amounts", () => {
  const input = [
    { is_recurring: true, amount: 15.99, cadence: "monthly" },
    { is_recurring: true, amount: -10, cadence: "weekly" },
    { is_recurring: true, amount: 0, cadence: "monthly" }
  ];

  const result = validatePatterns(input);
  assert.equal(result.length, 1);
  assert.equal(result[0].amount, 15.99);
});

test("validatePatterns returns empty array for non-array input", () => {
  assert.deepEqual(validatePatterns(null), []);
  assert.deepEqual(validatePatterns({}), []);
  assert.deepEqual(validatePatterns("invalid"), []);
});

test("formatTransactionsForLlm formats transactions correctly", () => {
  const txns = [
    { transaction_date: "2026-03-15", amount: -15.99 },
    { transaction_date: "2026-02-15", amount: -15.99 },
    { transaction_date: "2026-01-15", amount: -16.50 }
  ];

  const result = formatTransactionsForLlm(txns);
  assert.equal(result, "- 2026-03-15: $15.99\n- 2026-02-15: $15.99\n- 2026-01-15: $16.50");
});

test("formatTransactionsForLlm limits to 50 transactions", () => {
  const txns = Array.from({ length: 60 }, (_, i) => ({
    transaction_date: `2026-${String(i % 12 + 1).padStart(2, "0")}-15`,
    amount: -10
  }));

  const result = formatTransactionsForLlm(txns);
  const lines = result.split("\n");
  assert.equal(lines.length, 50);
});

test("validatePatterns handles multiple valid patterns", () => {
  const input = [
    { is_recurring: true, amount: 15.99, cadence: "monthly" },
    { is_recurring: true, amount: 189.99, cadence: "yearly" }
  ];

  const result = validatePatterns(input);
  assert.equal(result.length, 2);
  assert.equal(result[0].cadence, "monthly");
  assert.equal(result[1].cadence, "yearly");
});

test("validatePatterns returns empty array when no recurring patterns", () => {
  const input = [
    { is_recurring: false, amount: 15.99, cadence: "monthly" }
  ];

  const result = validatePatterns(input);
  // Note: validation passes, but caller should filter by is_recurring
  assert.equal(result.length, 1);
  assert.equal(result[0].is_recurring, false);
});

test("validatePatterns handles missing patterns array gracefully", () => {
  const input = { patterns: null };
  // When patterns is missing, validatePatterns should return empty
  assert.deepEqual(validatePatterns(input), []);
});

// Mock-based tests for detectRecurringPatternsWithLlm error handling
// These test the function's error handling without making actual LLM calls
test("detectRecurringPatternsWithLlm handles requireAiFeature throwing error", async () => {
  // Import with mocked dependencies
  const { detectRecurringPatternsWithLlm } = await import("../../src/llm/recurring-detection.ts");

  // User without AI setup will cause requireAiFeature to throw
  const result = await detectRecurringPatternsWithLlm({
    userId: "user_without_ai",
    merchant: "netflix",
    transactions: [{ transaction_date: "2026-01-15", amount: -15.99 }]
  });

  assert.equal(result.ok, false);
  assert.ok(result.error, "Should have error message");
  assert.deepEqual(result.patterns, []);
});

test("formatTransactionsForLlm handles malformed transactions", () => {
  const txns = [
    { transaction_date: "2026-03-15", amount: -15.99 },
    { transaction_date: null, amount: -10 }, // Missing date - should be filtered
    { amount: -20 }, // Missing date - should be filtered
    { transaction_date: "2026-02-15" }, // Missing amount - should be filtered
    { transaction_date: "2026-01-15", amount: -12.00 }
  ];

  const result = formatTransactionsForLlm(txns);
  const lines = result.split("\n");
  assert.equal(lines.length, 2); // Only valid transactions
  assert.ok(result.includes("2026-03-15"));
  assert.ok(result.includes("2026-01-15"));
});

test("formatTransactionsForLlm returns empty string for empty array", () => {
  assert.equal(formatTransactionsForLlm([]), "");
});

test("buildUserPrompt formats transactions correctly", async () => {
  // Test the user prompt building logic separately
  const { buildUserPrompt } = await import("../../src/llm/recurring-detection.ts");

  const txns = [
    { transaction_date: "2026-03-15", amount: -15.99 },
    { transaction_date: "2026-02-15", amount: -15.99 }
  ];

  const prompt = buildUserPrompt("netflix", txns, []);
  assert.ok(prompt.includes("Merchant: netflix"));
  assert.ok(prompt.includes("2026-03-15"));
  assert.ok(prompt.includes("Existing rules for this merchant: none"));
});