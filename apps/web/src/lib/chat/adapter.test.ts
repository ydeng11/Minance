import test from "node:test";
import assert from "node:assert/strict";
import { assistantQueryToMessage, normalizeHydratedMessage } from "./adapter";
import type { AssistantQuery } from "../api/types";
import type { AssistantMessageCard } from "./adapter";

test("assistantQueryToMessage maps backend record into UI card", () => {
  const input: AssistantQuery = {
    id: "asst_1",
    userId: "user_1",
    question: "How much did I spend?",
    plan: {
      intent: "spend_total",
      filters: {
        start: "2026-01-01",
        end: "2026-01-31"
      }
    },
    result: {
      answer: "You spent $120.00.",
      highlights: ["Dining", "Transport"],
      confidence: 0.9,
      numbers: {},
      filters: {},
      details: [],
      drillDownUrl: "/transactions?start=2026-01-01&end=2026-01-31",
      provider: "openai",
      model: "gpt-4.1-mini",
      synthesisStatus: "applied"
    },
    createdAt: "2026-01-31T12:00:00.000Z"
  };

  const output = assistantQueryToMessage(input);

  assert.equal(output.id, "asst_1");
  assert.equal(output.question, "How much did I spend?");
  assert.equal(output.answer, "You spent $120.00.");
  assert.deepEqual(output.highlights, ["Dining", "Transport"]);
  assert.equal(output.provider, "openai");
  assert.equal(output.model, "gpt-4.1-mini");
  assert.equal(output.drillDownUrl, "/transactions?start=2026-01-01&end=2026-01-31");
});

test("assistantQueryToMessage maps structured assistant sections when present", () => {
  const input: AssistantQuery = {
    id: "asst_2",
    userId: "user_1",
    question: "How can I save more each month?",
    plan: {
      intent: "savings_plan",
      filters: {
        start: "2026-01-01",
        end: "2026-01-31"
      }
    },
    result: {
      answer: "Fallback plain answer.",
      summary: "You can likely save $450 per month by trimming dining and shopping.",
      keyPoints: [
        "Dining averaged $220 above your baseline.",
        "Shopping rose 18% month over month.",
        "Automating transfers would lock in the savings."
      ],
      followUp: "I can break that target down into weekly limits if you'd like.",
      highlights: ["Dining +$220", "Shopping +18%", "Savings target $450"],
      confidence: 0.9,
      numbers: {},
      filters: {},
      details: [],
      drillDownUrl: "/transactions?range=30d",
      provider: "openai",
      model: "gpt-4.1-mini",
      synthesisStatus: "applied"
    },
    createdAt: "2026-01-31T12:00:00.000Z"
  };

  const output = assistantQueryToMessage(input);

  assert.equal(output.summary, "You can likely save $450 per month by trimming dining and shopping.");
  assert.deepEqual(output.keyPoints, [
    "Dining averaged $220 above your baseline.",
    "Shopping rose 18% month over month.",
    "Automating transfers would lock in the savings."
  ]);
  assert.equal(output.followUp, "I can break that target down into weekly limits if you'd like.");
  assert.equal(output.answer, "Fallback plain answer.");
});

test("assistantQueryToMessage omits optional sections when the backend does not provide them", () => {
  const input: AssistantQuery = {
    id: "asst_3",
    userId: "user_1",
    question: "What changed?",
    plan: {
      intent: "overview",
      filters: {}
    },
    result: {
      answer: "Spending increased.",
      highlights: [],
      confidence: 0.9,
      numbers: {},
      filters: {},
      details: [],
      drillDownUrl: "/transactions?range=30d",
      provider: "openai",
      model: "gpt-4.1-mini",
      synthesisStatus: "applied"
    },
    createdAt: "2026-01-31T12:00:00.000Z"
  };

  const output = assistantQueryToMessage(input);

  assert.equal("summary" in output, false);
  assert.equal("followUp" in output, false);
});

test("assistantQueryToMessage strips trailing JSON from answer", () => {
  const input: AssistantQuery = {
    id: "asst_4",
    userId: "user_1",
    question: "Show recurring expenses",
    plan: {
      intent: "recurring",
      filters: {}
    },
    result: {
      answer: [
        "Here's a breakdown of your recurring expenses:",
        "",
        "**Active recurring rules:**",
        "",
        "| Expense | Amount |",
        "|--------|--------|",
        "| Rent | $1,850 |",
        "",
        '{ "answer": "Parsed answer", "summary": "Recurring expenses of $...", "key_points": ["Rent: $1,850"], "highlights": ["70% recurring"] }'
      ].join("\n"),
      highlights: [],
      confidence: 0.9,
      numbers: {},
      filters: {},
      details: [],
      drillDownUrl: "/transactions?range=30d",
      provider: "openai",
      model: "gpt-4.1-mini",
      synthesisStatus: "applied"
    },
    createdAt: "2026-01-31T12:00:00.000Z"
  };

  const output = assistantQueryToMessage(input);

  // Answer is the cleaned text (before JSON), NOT the JSON's answer field
  assert.equal(output.answer, [
    "Here's a breakdown of your recurring expenses:",
    "",
    "**Active recurring rules:**",
    "",
    "| Expense | Amount |",
    "|--------|--------|",
    "| Rent | $1,850 |"
  ].join("\n"), "answer should be text before trailing JSON");

  // Summary extracted from trailing JSON
  assert.equal(output.summary, "Recurring expenses of $...");

  // key_points extracted from trailing JSON
  assert.deepEqual(output.keyPoints, ["Rent: $1,850"]);

  // highlights extracted from trailing JSON
  assert.deepEqual(output.highlights, ["70% recurring"]);
});

test("assistantQueryToMessage does NOT expose raw trailing JSON fields as text", () => {
  // Same fixture — the trailing JSON should be stripped, not blended into the answer
  const input: AssistantQuery = {
    id: "asst_5",
    userId: "user_1",
    question: "Show recurring expenses",
    plan: {
      intent: "recurring",
      filters: {}
    },
    result: {
      answer: "Some text\n{ \"answer\": \"hidden\", \"summary\": \"s\", \"key_points\": [], \"highlights\": [] }",
      highlights: [],
      confidence: 0.9,
      numbers: {},
      filters: {},
      details: [],
      drillDownUrl: "/transactions?range=30d",
      provider: "openai",
      model: "gpt-4.1-mini",
      synthesisStatus: "applied"
    },
    createdAt: "2026-01-31T12:00:00.000Z"
  };

  const output = assistantQueryToMessage(input);

  assert.equal(output.answer, "Some text", "trailing JSON should be stripped from answer");
  assert.equal(output.summary, "s", "summary should come from trailing JSON");
  assert.ok(!output.answer.includes('"answer"'), "raw JSON field names should not appear in answer");
});

test("assistantQueryToMessage handles malformed trailing JSON gracefully", () => {
  // No trailing JSON at all
  const input: AssistantQuery = {
    id: "asst_6",
    userId: "user_1",
    question: "Plain",
    plan: {
      intent: "plain",
      filters: {}
    },
    result: {
      answer: "Plain answer without JSON.",
      highlights: [],
      confidence: 0.9,
      numbers: {},
      filters: {},
      details: [],
      drillDownUrl: "/transactions",
      provider: "openai",
      model: "gpt-4.1-mini",
      synthesisStatus: "applied"
    },
    createdAt: "2026-01-31T12:00:00.000Z"
  };

  const output = assistantQueryToMessage(input);
  assert.equal(output.answer, "Plain answer without JSON.");
  assert.equal("summary" in output, false);
});

test("assistantQueryToMessage trailing JSON with key_points and highlights overrides API fields", () => {
  const input: AssistantQuery = {
    id: "asst_7",
    userId: "user_1",
    question: "Test overrides",
    plan: {
      intent: "test",
      filters: {}
    },
    result: {
      answer: "Body text\n{ \"summary\": \"JSON summary\", \"key_points\": [\"JSON point\"], \"highlights\": [\"JSON highlight\"] }",
      highlights: ["API highlight"],
      keyPoints: ["API point"],
      summary: "API summary",
      confidence: 0.9,
      numbers: {},
      filters: {},
      details: [],
      drillDownUrl: "/transactions",
      provider: "openai",
      model: "gpt-4.1-mini",
      synthesisStatus: "applied"
    },
    createdAt: "2026-01-31T12:00:00.000Z"
  };

  const output = assistantQueryToMessage(input);

  // Trailing JSON wins for structured fields
  assert.equal(output.summary, "JSON summary");
  assert.deepEqual(output.keyPoints, ["JSON point"]);
  assert.deepEqual(output.highlights, ["JSON highlight"]);
  // Answer body is preserved (pre-JSON text), NOT replaced by JSON answer
  assert.equal(output.answer, "Body text");
});

test("assistantQueryToMessage trailing JSON answer field does NOT replace answer body when answer key is absent", () => {
  // If trailing JSON has no 'answer' key, the cleaned body text is kept as-is
  const input: AssistantQuery = {
    id: "asst_8",
    userId: "user_1",
    question: "Test",
    plan: {
      intent: "test",
      filters: {}
    },
    result: {
      answer: "Keep this text\n{ \"summary\": \"from JSON\" }",
      highlights: [],
      confidence: 0.9,
      numbers: {},
      filters: {},
      details: [],
      drillDownUrl: "/transactions",
      provider: "openai",
      model: "gpt-4.1-mini",
      synthesisStatus: "applied"
    },
    createdAt: "2026-01-31T12:00:00.000Z"
  };

  const output = assistantQueryToMessage(input);
  assert.equal(output.answer, "Keep this text");
  assert.equal(output.summary, "from JSON");
});

test("assistantQueryToMessage strips trailing JSON with unescaped newlines in string values", () => {
  // Simulates the exact bug: LLM embeds a JSON block with literal newlines
  // inside string values (invalid JSON that strict parse can't handle)
  const markdownBody = [
    "Here's your full recurring expenses picture:",
    "",
    "**Rent** — $1,850/month",
    "**Groceries** — ~$135/week"
  ].join("\n");

  const jsonBlock = `{
  "answer": "Here's your full recurring expenses picture:
Active recurring outflows you have rules for:
- Rent — $1,850/month
- Groceries — ~$135/week",
  "summary": "Recurring expenses of $2,625/month",
  "key_points": [
    "Rent: $1,850/month",
    "Groceries: ~$135/week"
  ],
  "highlights": [
    "70% of spending is recurring"
  ]
}`;

  const rawAnswer = markdownBody + "\n\n" + jsonBlock;

  const input: AssistantQuery = {
    id: "asst_9",
    userId: "user_1",
    question: "Show recurring expenses",
    plan: {
      intent: "recurring",
      filters: {}
    },
    result: {
      answer: rawAnswer,
      highlights: [],
      confidence: 0.9,
      numbers: {},
      filters: {},
      details: [],
      drillDownUrl: "/transactions",
      provider: "openai",
      model: "gpt-4.1-mini",
      synthesisStatus: "applied"
    },
    createdAt: "2026-01-31T12:00:00.000Z"
  };

  const output = assistantQueryToMessage(input);

  // Answer should be clean markdown without JSON
  assert.ok(output.answer.includes("Here's your full recurring expenses picture"), "markdown body present");
  assert.ok(output.answer.includes("$1,850/month"), "content from markdown");
  assert.ok(output.answer.includes("$135/week"), "content from markdown");

  // No raw JSON visible in answer
  assert.ok(!output.answer.includes('"answer"'), "no raw JSON answer field");
  assert.ok(!output.answer.includes('"summary"'), "no raw JSON summary field");
  assert.ok(!output.answer.includes('"key_points"'), "no raw JSON key_points field");
  assert.ok(!output.answer.includes('"$1,850/month"'), "no JSON string values in answer");

  // Structured fields extracted from trailing JSON
  assert.equal(output.summary, "Recurring expenses of $2,625/month");
  assert.deepEqual(output.keyPoints, ["Rent: $1,850/month", "Groceries: ~$135/week"]);
  assert.deepEqual(output.highlights, ["70% of spending is recurring"]);
});

test("normalizeHydratedMessage strips trailing JSON from stored messages", () => {
  const msg: AssistantMessageCard = {
    id: "asst_stored",
    question: "Show recurring",
    answer: `Here's your recurring expenses picture.

Active rules: Rent $1,850/mo.

{"answer":"Stored answer","summary":"Stored summary","key_points":["K1"]}`,
    keyPoints: [],
    highlights: [],
    provider: "openai",
    model: "gpt-4.1-mini",
    drillDownUrl: "",
    createdAt: "2026-01-31T12:00:00.000Z",
    state: "complete"
  };

  const result = normalizeHydratedMessage(msg);
  assert.ok(result.answer.includes("Here's your recurring expenses picture"), "stored prose preserved");
  assert.ok(result.answer.includes("Rent $1,850/mo"), "stored content preserved");
  assert.ok(!result.answer.includes('"answer"'), "no raw JSON answer key");
  assert.ok(!result.answer.includes('"summary"'), "no raw JSON summary key");
  assert.equal(result.summary, "Stored summary", "summary restored from JSON");
  assert.deepEqual(result.keyPoints, ["K1"], "key_points restored from JSON");
});

test("normalizeHydratedMessage: pure JSON stored message is normalized", () => {
  const msg: AssistantMessageCard = {
    id: "asst_pure",
    question: "Show spending",
    answer: '{"answer":"You spent $3,450 last month.","summary":"Monthly breakdown"}',
    keyPoints: [],
    highlights: [],
    provider: "openai",
    model: "gpt-4.1-mini",
    drillDownUrl: "",
    createdAt: "2026-01-31T12:00:00.000Z",
    state: "complete"
  };

  const result = normalizeHydratedMessage(msg);
  assert.ok(result.answer.includes("You spent $3,450 last month"), "pure json answer promoted");
  assert.ok(!result.answer.startsWith("{"), "no leading brace");
  assert.equal(result.summary, "Monthly breakdown", "summary extracted");
});

test("normalizeHydratedMessage: pending/error messages pass through unchanged", () => {
  const pending: AssistantMessageCard = {
    id: "pending_1",
    question: "Test",
    answer: "",
    keyPoints: [],
    highlights: [],
    provider: "",
    model: "",
    drillDownUrl: "",
    createdAt: "2026-01-31T12:00:00.000Z",
    state: "pending"
  };

  assert.equal(normalizeHydratedMessage(pending), pending, "pending unchanged");

  const error: AssistantMessageCard = {
    id: "error_1",
    question: "Test",
    answer: "Something went wrong",
    keyPoints: [],
    highlights: [],
    provider: "",
    model: "",
    drillDownUrl: "",
    createdAt: "2026-01-31T12:00:00.000Z",
    state: "error"
  };

  assert.equal(normalizeHydratedMessage(error), error, "error unchanged");
});

test("normalizeHydratedMessage: message without JSON keys passes through", () => {
  const msg: AssistantMessageCard = {
    id: "asst_clean",
    question: "Test",
    answer: "Your total spending is $3,450. No JSON here.",
    keyPoints: [],
    highlights: [],
    provider: "openai",
    model: "gpt-4.1-mini",
    drillDownUrl: "",
    createdAt: "2026-01-31T12:00:00.000Z",
    state: "complete"
  };

  const result = normalizeHydratedMessage(msg);
  assert.equal(result, msg, "clean message unchanged by identity");
});
