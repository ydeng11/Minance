import test from "node:test";
import assert from "node:assert/strict";

import { buildHomeStories, describeOperatingFlow } from "./homeInsightPresentation";

test("describeOperatingFlow uses state language when net flow crosses zero", () => {
  assert.equal(describeOperatingFlow({
    current: { income: 100, expense: 125, net: -25 },
    previous: { income: 100, expense: 80, net: 20 },
    delta: { income: 0, expense: 45, net: -45 },
    transition: "surplus_to_deficit"
  }), "Spending moved this period from a surplus into a deficit.");
});

test("buildHomeStories returns one primary and at most two supporting stories", () => {
  const result = buildHomeStories({
    changeAttribution: {
      meaningful: true,
      totalExpenseDelta: 200,
      dimensions: { category: [], account: [], merchant: [] },
      recurring: { recurringDelta: 50, variableDelta: 150 }
    },
    reviewTransactions: [{ transactionId: "1" }, { transactionId: "2" }, { transactionId: "3" }],
    recurring: { priceDrift: [{ ruleId: "rule" }], possibleRecurringCount: 2 }
  } as never);

  assert.equal(result.primary.kind, "change");
  assert.deepEqual(result.supporting.map((story) => story.kind), ["review", "commitments"]);
  assert.equal(result.supporting.length, 2);
});
