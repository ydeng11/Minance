import test from "node:test";
import assert from "node:assert/strict";

import {
  buildMerchantPresentation,
  buildSummarySecondaryState
} from "./presentation";

test("buildMerchantPresentation promotes recognizable merchant names", () => {
  const presentation = buildMerchantPresentation("fid bkg svc llc des moneyline");

  assert.equal(presentation.displayName, "Fidelity");
  assert.equal(presentation.caption, "fid bkg svc llc des moneyline");
  assert.equal(presentation.monogram, "FI");
});

test("buildSummarySecondaryState prefers sparkline content when comparison is off", () => {
  const state = buildSummarySecondaryState({
    comparisonEnabled: false,
    deltaLabel: "No comparison",
    sparkline: [12, 18, 10, 14, 16, 11, 15]
  });

  assert.equal(state.mode, "sparkline");
  assert.equal(state.label, "Recent 7-day trend");
});
