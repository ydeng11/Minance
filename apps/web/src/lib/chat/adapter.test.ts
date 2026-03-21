import test from "node:test";
import assert from "node:assert/strict";
import { assistantQueryToMessage } from "./adapter";
import type { AssistantQuery } from "../api/types";

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
