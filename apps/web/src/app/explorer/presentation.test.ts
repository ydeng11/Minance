import test from "node:test";
import assert from "node:assert/strict";

import {
  buildMerchantPresentation,
  buildSummarySecondaryState,
  getSummaryValueClassName
} from "./presentation";

test("buildMerchantPresentation promotes recognizable merchant names", () => {
  const presentation = buildMerchantPresentation("fid bkg svc llc des moneyline");

  assert.equal(presentation.displayName, "Fidelity");
  assert.equal(presentation.caption, "fid bkg svc llc des moneyline");
  assert.equal(presentation.monogram, "FI");
});

test("buildSummarySecondaryState returns explicit last-7-days copy for sparkline mode", () => {
  const state = buildSummarySecondaryState({
    comparisonEnabled: false,
    deltaLabel: "Ignored when sparkline is shown",
    sparkline: [12, 18, 10, 14, 16, 11, 15]
  });

  assert.equal(state.mode, "sparkline");
  assert.equal(state.label, "Last 7 days");
});

test("buildSummarySecondaryState returns comparison copy when comparison is enabled", () => {
  const state = buildSummarySecondaryState({
    comparisonEnabled: true,
    deltaLabel: "Compared with previous period",
    sparkline: [12, 18, 10, 14, 16, 11, 15]
  });

  assert.equal(state.mode, "delta");
  assert.equal(state.label, "Compared with previous period");
});

test("summary value sizing steps down for long currency values", () => {
  assert.equal(getSummaryValueClassName("$123.45"), "text-4xl");
  assert.equal(getSummaryValueClassName("$123,456.78"), "text-3xl");
  assert.equal(getSummaryValueClassName("$12,345,678.90"), "text-2xl");
});
