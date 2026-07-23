import test from "node:test";
import assert from "node:assert/strict";

import {
  buildDriverDisplayRows,
  buildInsightHeadline,
  getSharedFlowMaximum
} from "./insightPresentation";

test("getSharedFlowMaximum keeps income and expense on one scale", () => {
  assert.equal(
    getSharedFlowMaximum([
      { income: 500, spend: 120 },
      { income: 250, spend: 900 }
    ]),
    900
  );
});

test("buildDriverDisplayRows keeps three drivers and groups the remainder", () => {
  const rows = buildDriverDisplayRows([
    { key: "Dining", label: "Dining", delta: 200 },
    { key: "Travel", label: "Travel", delta: -80 },
    { key: "Groceries", label: "Groceries", delta: 40 },
    { key: "Shopping", label: "Shopping", delta: 20 },
    { key: "Bills", label: "Bills", delta: -10 }
  ] as never);

  assert.deepEqual(rows.map((row) => [row.key, row.delta]), [
    ["Dining", 200],
    ["Travel", -80],
    ["Groceries", 40],
    ["__other__", 10]
  ]);
});

test("buildInsightHeadline describes stable periods and leading drivers", () => {
  assert.equal(buildInsightHeadline(null), "More history is needed to explain what changed.");
  assert.equal(
    buildInsightHeadline({
      meaningful: false,
      totalExpenseDelta: 15,
      dimensions: { category: [], account: [], merchant: [] },
      recurring: { recurringDelta: 0, variableDelta: 15 }
    }),
    "Tracked expenses are broadly stable for this comparison."
  );
  assert.match(
    buildInsightHeadline({
      meaningful: true,
      totalExpenseDelta: 200,
      dimensions: {
        category: [{ label: "Dining", delta: 200, contributionPercent: 100 }],
        account: [],
        merchant: []
      },
      recurring: { recurringDelta: 0, variableDelta: 200 }
    } as never),
    /Dining explains 100%/
  );
});
