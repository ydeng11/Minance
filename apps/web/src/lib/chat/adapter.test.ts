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
