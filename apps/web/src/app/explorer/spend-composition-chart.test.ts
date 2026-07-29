import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SpendCompositionChart, resolveTooltipSide, filterSegments, OTHER_SPEND_CATEGORY } from "./components/SpendCompositionChart";

const trend = [
  {
    month: "2026-02",
    spend: 2894.13,
    income: 0,
    net: -2894.13,
    transactionCount: 12,
    spendComposition: [
      { category: "Mortgage & Loan", amount: 1800, share: 62.2 },
      { category: "Travel", amount: 1094.13, share: 37.8 }
    ],
    incomeComposition: []
  },
  {
    month: "2026-03",
    spend: 7812.68,
    income: 0,
    net: -7812.68,
    transactionCount: 18,
    spendComposition: [
      { category: "Mortgage & Loan", amount: 3200, share: 41 },
      { category: "Travel", amount: 2600, share: 33.3 }
    ],
    incomeComposition: []
  }
];

test("spend composition chart keeps totals close to bars and fills missing composition", () => {
  const markup = renderToStaticMarkup(createElement(SpendCompositionChart, { trend }));

  assert.match(markup, /data-testid="spend-composition-plot"/);
  assert.match(markup, /data-testid="spend-composition-total-label"/);
  assert.match(markup, /data-testid="spend-composition-bar"/);
  assert.match(markup, /data-testid="spend-composition-zero-line"[^>]*bottom:0/);
  assert.match(markup, /data-testid="spend-composition-y-axis"[^>]*height:360/);
  assert.match(markup, /data-testid="spend-composition-tooltip-layer"[^>]*style="[^"]*height:320px/);
  assert.match(markup, /data-testid="spend-composition-total-label"[^>]*style="[^"]*bottom:/);
  assert.match(markup, /Other spend: \$2,012\.68/);
});

test("spend composition chart gives visible categories distinct colors before reusing the palette", () => {
  const categoryRichTrend = [
    {
      month: "2026-04",
      spend: 600,
      income: 0,
      net: -600,
      transactionCount: 6,
      spendComposition: [
        { category: "Mortgage & Loan", amount: 100, share: 16.7 },
        { category: "Groceries", amount: 100, share: 16.7 },
        { category: "Merchandise", amount: 100, share: 16.7 },
        { category: "Pets", amount: 100, share: 16.7 },
        { category: "Bills & Utilities", amount: 100, share: 16.7 },
        { category: "Fashion", amount: 100, share: 16.7 }
      ],
      incomeComposition: []
    }
  ];

  const markup = renderToStaticMarkup(createElement(SpendCompositionChart, { trend: categoryRichTrend }));
  const swatchColors = Array.from(markup.matchAll(/data-testid="spend-composition-legend-swatch"[^>]*background-color:([^;"]+)/g))
    .map((match) => match[1]);

  assert.equal(swatchColors.length, 6);
  assert.equal(new Set(swatchColors).size, swatchColors.length);
});

test("spend composition tooltip opens beside the selected stack away from chart edges", () => {
  assert.equal(resolveTooltipSide(0, 3), "right");
  assert.equal(resolveTooltipSide(1, 3), "left");
  assert.equal(resolveTooltipSide(2, 3), "left");
  assert.equal(resolveTooltipSide(0, 1), "right");
});

test("filterSegments rolls excluded categories into a single Other spend", () => {
  const segments = [
    { category: "Groceries", amount: 300, share: 0 },
    { category: "Dining", amount: 200, share: 0 },
    { category: "Transport", amount: 150, share: 0 },
    { category: "Shopping", amount: 100, share: 0 },
    { category: "Pets", amount: 80, share: 0 },
    { category: "Utilities", amount: 70, share: 0 }
  ];

  const top5 = new Set(["Groceries", "Dining", "Transport", "Shopping", "Pets"]);
  const result = filterSegments(segments, top5);

  assert.equal(result.length, 6);
  const other = result.find((s) => s.category === OTHER_SPEND_CATEGORY);
  assert.ok(other);
  assert.equal(other.amount, 70);
  assert.equal(result.filter((s) => s.category === OTHER_SPEND_CATEGORY).length, 1);

  const categories = result.map((s) => s.category);
  assert.ok(categories.includes("Groceries"));
  assert.ok(categories.includes("Dining"));
  assert.ok(categories.includes("Transport"));
  assert.ok(categories.includes("Shopping"));
  assert.ok(categories.includes("Pets"));
  assert.ok(categories.includes(OTHER_SPEND_CATEGORY));
});

test("filterSegments with single category keeps only that category plus Other", () => {
  const segments = [
    { category: "Mortgage & Loan", amount: 3200, share: 0 },
    { category: "Travel", amount: 2600, share: 0 },
    { category: "Dining", amount: 800, share: 0 }
  ];

  const result = filterSegments(segments, new Set(["Mortgage & Loan"]));
  const other = result.find((s) => s.category === OTHER_SPEND_CATEGORY);
  assert.ok(other);
  assert.equal(other.amount, 3400);
  assert.equal(result.length, 2);
});

test("filterSegments merges pre-existing Other with rolled amounts into one segment", () => {
  const segments = [
    { category: "Groceries", amount: 300, share: 0 },
    { category: "Dining", amount: 200, share: 0 },
    { category: OTHER_SPEND_CATEGORY, amount: 50, share: 0 }
  ];

  const result = filterSegments(segments, new Set(["Groceries"]));
  assert.equal(result.length, 2);
  const other = result.find((s) => s.category === OTHER_SPEND_CATEGORY);
  assert.ok(other);
  assert.equal(other.amount, 250);
  assert.equal(result.filter((s) => s.category === OTHER_SPEND_CATEGORY).length, 1);
});

test("spend-chart-mode-top5 button appears in the toggle area", () => {
  const markup = renderToStaticMarkup(createElement(SpendCompositionChart, { trend }));
  assert.match(markup, /data-testid="spend-chart-mode-top5"/);
});

test("legend renders category buttons and a non-clickable Other spend", () => {
  const markup = renderToStaticMarkup(createElement(SpendCompositionChart, { trend }));
  const matches = Array.from(markup.matchAll(/data-testid="spend-composition-legend-swatch"/g));
  // "Mortgage & Loan" and "Travel" categories, plus "Other spend" from the gap
  assert.ok(matches.length >= 2);
});
