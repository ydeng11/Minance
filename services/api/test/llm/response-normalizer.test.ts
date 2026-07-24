// services/api/test/llm/response-normalizer.test.ts
// Tests for the string-aware balanced-brace response normalizer

import test from "node:test";
import assert from "node:assert/strict";

const { normalizeResponse, normalizeAnswer } = await import("../../src/llm/response-normalizer.ts");

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function assertClean(output: { cleaned: string }, expectedSubstring: string, label: string) {
  assert.ok(
    output.cleaned.includes(expectedSubstring),
    `${label}: expected cleaned to include "${expectedSubstring}", got "${output.cleaned.slice(0, 200)}"`
  );
}

function assertNoJsonBraces(output: { cleaned: string }, label: string) {
  const cleaned = output.cleaned;
  // Allow `{` or `}` only inside markdown table pipes or code fences, not as JSON keys
  const jsonPattern = /["']answer["']\s*:|["']summary["']\s*:/;
  assert.ok(
    !jsonPattern.test(cleaned),
    `${label}: cleaned text should not contain JSON keys, got "${cleaned.slice(0, 300)}"`
  );
}

function assertFields(
  output: { fields: Record<string, unknown> },
  field: string,
  expected: unknown,
  label: string
) {
  assert.equal(output.fields[field], expected, `${label}: expected ${field}=${expected}`);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test("normalizeResponse: plain prose passes through unchanged", () => {
  const result = normalizeResponse("Here's your spending overview for the month.");
  assertClean(result, "Here's your spending overview", "plain prose");
  assert.equal(result.structured, null);
});

test("normalizeResponse: JSON-only response extracts answer field", () => {
  const input = JSON.stringify({
    answer: "You spent $3,450 last month.",
    summary: "Monthly spending summary",
    key_points: ["Groceries: $850", "Rent: $1,850"]
  });

  const result = normalizeResponse(input);
  assertClean(result, "You spent $3,450 last month.", "json-only answer");
  // No JSON keys in cleaned
  assertNoJsonBraces(result, "json-only");
  // Structured fields extracted
  assert.equal(result.structured?.summary, "Monthly spending summary");
  assert.deepEqual(result.structured?.key_points, ["Groceries: $850", "Rent: $1,850"]);
});

test("normalizeResponse: prose followed by trailing JSON", () => {
  const prose = "Here's your recurring expenses picture.\n\n**Rent** — $1,850/month\n**Groceries** — $135/week";
  const json = JSON.stringify({
    answer: "Short answer",
    summary: "You have 5 recurring expenses."
  });
  const input = prose + "\n\n" + json;

  const result = normalizeResponse(input);
  assertClean(result, "Here's your recurring expenses picture.", "prose+json body");
  assertClean(result, "Rent", "prose preserved");
  assertClean(result, "Groceries", "prose preserved");
  assertNoJsonBraces(result, "prose+json");
  assert.equal(result.structured?.summary, "You have 5 recurring expenses.");
});

test("normalizeResponse: nested drill_down_filters is not mistaken for structured data", () => {
  const prose = "Here's your spending for January.";
  const json = JSON.stringify({
    answer: "You spent $1,200 on dining in January.",
    summary: "January dining",
    drill_down_filters: { start: "2026-01-01", end: "2026-01-31", category: "Dining" }
  });
  const input = prose + "\n\n" + json;

  const result = normalizeResponse(input);
  assertClean(result, "Here's your spending for January.", "nested drill_down");
  // JSON's answer field is NOT in cleaned when prose precedes JSON (prose is the body)
  assert.ok(!result.cleaned.includes("dining"), "answer from JSON not promoted into prose body");
  assertNoJsonBraces(result, "nested drill_down");
  // drill_down_filters should be stripped (it's inside the extracted JSON)
  assert.equal(result.structured?.summary, "January dining");
});

test("normalizeResponse: braces inside quoted answer text are not treated as JSON", () => {
  const input = "The format is {category: amount} like {Dining: $450}. No JSON here.";

  const result = normalizeResponse(input);
  assertClean(result, "The format is {category:", "braces-in-answer");
  assertClean(result, "No JSON here", "braces-in-answer");
  assert.equal(result.structured, null);
});

test("normalizeResponse: braces inside quoted answer with answer/summary keys rendered as text", () => {
  // This simulates markdown that happens to contain "answer" and "summary" as text, not JSON
  const input = [
    "The answer to your question is straightforward.",
    "",
    "Your summary shows the following categories:",
    "- Groceries: $850",
    "- Dining: $450"
  ].join("\n");

  const result = normalizeResponse(input);
  assertClean(result, "The answer to your question", "answer-as-text");
  assertClean(result, "Your summary shows", "summary-as-text");
  assert.equal(result.structured, null, "should not be treated as JSON");
});

test("normalizeResponse: fenced ```json block", () => {
  const input = [
    "```json",
    "{",
    '  "answer": "Your spending: $3,450 total.",',
    '  "summary": "Monthly breakdown"',
    "}",
    "```"
  ].join("\n");

  const result = normalizeResponse(input);
  assertClean(result, "Your spending: $3,450 total.", "fenced json");
  assertNoJsonBraces(result, "fenced json");
  assert.equal(result.structured?.summary, "Monthly breakdown");
});

test("normalizeResponse: fenced json with prose before it", () => {
  const input = [
    "Here's your spending breakdown:",
    "",
    "```json",
    "{",
    '  "answer": "Total: $3,450",',
    '  "summary": "Monthly spending"',
    "}",
    "```"
  ].join("\n");

  const result = normalizeResponse(input);
  assertClean(result, "Here's your spending breakdown:", "fenced+prose");
  assertNoJsonBraces(result, "fenced+prose");
  assert.equal(result.structured?.summary, "Monthly spending");
});

test("normalizeResponse: malformed JSON with unescaped newlines in strings", () => {
  const input = [
    "Your spending this month:",
    "{",
    '  "answer": "You spent $3,450',
    '  across 47 transactions.',    // Literal newline inside string value
    '  Top categories: Groceries $850, Dining $450",',
    '  "summary": "Monthly breakdown"',
    "}"
  ].join("\n");

  const result = normalizeResponse(input);
  assertClean(result, "Your spending this month:", "malformed json");
  assertNoJsonBraces(result, "malformed json");
  assert.equal(result.structured?.summary, "Monthly breakdown");
});

test("normalizeResponse: truncated JSON gracefully degrades", () => {
  // JSON that ends abruptly (simulates token truncation)
  const input = '{"answer": "Your spending overview", "summary": "Truncated';

  const result = normalizeResponse(input);
  assertClean(result, "Your spending overview", "truncated json");
  // The result should still be usable — the partial JSON is not valid
  // so it falls through to treating the content as plain text
});

test("normalizeResponse: only partial JSON (finish_reason=length)", () => {
  // This simulates the exact failure: answer field has markdown + truncated JSON
  const input = [
    "Here's your recurring expenses picture.",
    "Active rules: Rent $1,850/mo, Groceries $135/week.",
    '{',
    '  "answer": "Short version",',
    '  "summary": "You have 5"',  // Truncated — no closing brace
    '}'
  ].join("\n");

  const result = normalizeResponse(input);
  // The truncated JSON (without proper close) should not cause issues
  // and the prose before it should be preserved
  assertClean(result, "Here's your recurring expenses picture.", "truncated summary");
  assertClean(result, "Rent", "truncated summary");
  // The JSON may or may not be parseable — but the prose survives either way
});

test("normalizeResponse: recursively embedded JSON in answer field", () => {
  // The LLM puts a JSON block inside the answer string
  // (nested JSON: outer JSON has answer field that itself contains JSON)
  const outer = {
    answer: [
      "Here's your picture.",
      "",
      JSON.stringify({
        answer: "Nested short answer",
        summary: "Nested summary"
      })
    ].join("\n"),
    summary: "Outer summary",
    key_points: ["Outer point 1", "Outer point 2"]
  };
  const input = JSON.stringify(outer);

  const result = normalizeResponse(input);
  // Should promote the outer answer (prose before the embedded JSON)
  assertClean(result, "Here's your picture.", "recursive embedded json");
  assertNoJsonBraces(result, "recursive embedded json");
  // Outer summary should be preserved
  assert.equal(result.structured?.summary, "Outer summary");
});

test("normalizeResponse: JSON-only answer that IS the full response", () => {
  const input = '{"answer": "Your monthly recurring spend is $2,625.", "summary": "Monthly recurring", "key_points": ["Rent: $1,850/mo", "Groceries: $540/mo"]}';

  const result = normalizeResponse(input);
  assertClean(result, "Your monthly recurring spend is $2,625.", "json-only full");
  assertNoJsonBraces(result, "json-only full");
  assert.equal(result.structured?.summary, "Monthly recurring");
  assert.deepEqual(result.structured?.key_points, ["Rent: $1,850/mo", "Groceries: $540/mo"]);
});

test("normalizeAnswer convenience wrapper", () => {
  const input = [
    "Your spending this month:",
    JSON.stringify({
      answer: "Total: $3,450",
      summary: "Monthly breakdown"
    })
  ].join("\n\n");

  const result = normalizeAnswer(input);
  assertClean(result, "Your spending this month:", "convenience wrapper");
  assertNoJsonBraces(result, "convenience wrapper");
  assert.equal(result.fields.summary, "Monthly breakdown");
});

test("normalizeAnswer: empty input", () => {
  const result = normalizeAnswer("");
  assert.equal(result.cleaned, "", "empty input");
  assert.deepEqual(result.fields, {}, "empty fields");
});

test("normalizeAnswer: whitespace-only input", () => {
  const result = normalizeAnswer("   \n\n  ");
  assert.equal(result.cleaned, "", "whitespace input");
  assert.deepEqual(result.fields, {}, "whitespace fields");
});

// ---------------------------------------------------------------------------
// Exact regression test for the reported issue
// ---------------------------------------------------------------------------

test("normalizeAnswer: regression — reported payload with answer+summary in JSON", () => {
  // The exact pattern the user reported: JSON keys visible in the rendered answer
  const input = [
    "Here's your recurring expenses picture. Active rules: Rent $1,850/mo, Weekly Groceries $135/week, Electric Bill $100/mo, Annual Insurance $720/yr.",
    "",
    JSON.stringify({
      answer: "Here's your recurring expenses picture. Active rules: Monthly Rent $1,850/mo, Weekly Groceries $135/week ($540/mo), Electric Bill $100/mo, Annual Insurance $720/yr. Streaming ($15.99/mo) is paused. Pattern detections also show Green Market (~$153/mo), Neighborhood Foods (~$172/mo), Cafe Brisk (~$60/mo), Savings Transfer ($400 biweekly), and Broker Transfer (~$750/mo) as possible recurring charges to review.",
      summary: "You have 5 recurring expenses and 5 pattern detections to review."
    })
  ].join("\n\n");

  const result = normalizeAnswer(input);
  // Prose preserved
  assertClean(result, "Here's your recurring expenses picture", "regression prose");
  assertClean(result, "Rent $1,850/mo", "regression content");
  assertClean(result, "Electric Bill", "regression content");
  // No JSON keys or braces in cleaned output
  assertNoJsonBraces(result, "regression");
  // No JSON braces in cleaned
  assert.ok(!result.cleaned.includes('"summary"'), "regression: no summary key in answer");
  assert.ok(!result.cleaned.includes('"answer"'), "regression: no answer key in answer");
  // Structured fields extracted correctly
  assert.equal(result.fields.summary, "You have 5 recurring expenses and 5 pattern detections to review.");
});

test("normalizeAnswer: regression — pure JSON with no prose prefix", () => {
  const input = JSON.stringify({
    answer: "Here's your recurring expenses picture. Active rules: Rent $1,850/mo, Groceries $135/week.",
    summary: "You have 5 recurring expenses.",
    key_points: ["Rent: $1,850/mo", "Groceries: $540/mo"]
  });

  const result = normalizeAnswer(input);
  assertClean(result, "Here's your recurring expenses picture", "pure json regression");
  assertClean(result, "Rent $1,850/mo", "pure json content");
  assertNoJsonBraces(result, "pure json regression");
  assert.equal(result.fields.summary, "You have 5 recurring expenses.");
});
