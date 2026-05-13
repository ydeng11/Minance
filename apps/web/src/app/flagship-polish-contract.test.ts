import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const dashboardPageSource = readFileSync(join(process.cwd(), "src/app/page.tsx"), "utf8");
const explorerSummarySource = readFileSync(
  join(process.cwd(), "src/app/explorer/components/ExplorerSummaryBand.tsx"),
  "utf8"
);
const helpMenuSource = readFileSync(join(process.cwd(), "src/components/layout/HelpMenu.tsx"), "utf8");
const commandPaletteSource = readFileSync(
  join(process.cwd(), "src/components/command-palette/CommandPalette.tsx"),
  "utf8"
);

test("dashboard KPI buttons expose descriptive aria-labels for drill-down actions", () => {
  assert.match(dashboardPageSource, /aria-label=\{`Open transactions for net flow \$\{netFlowValue\}`\}/);
  assert.match(dashboardPageSource, /aria-label=\{`Open expense transactions totaling \$\{spendValue\}`\}/);
  assert.match(dashboardPageSource, /aria-label=\{`Open income transactions totaling \$\{incomeValue\}`\}/);
  assert.match(dashboardPageSource, /aria-label=\{`Open recurring transactions totaling \$\{recurringValue\}`\}/);
});

test("help menu uses menu semantics and shared shell tokens", () => {
  assert.match(helpMenuSource, /role="menu"/);
  assert.match(helpMenuSource, /role="menuitem"/);
  assert.match(helpMenuSource, /<CircleHelp[^>]*aria-hidden="true"/);
  assert.match(helpMenuSource, /<ChevronDown[^>]*aria-hidden="true"/);
  assert.match(helpMenuSource, /<ExternalLink[^>]*aria-hidden="true"/);
  assert.match(helpMenuSource, /<MessageCircle[^>]*aria-hidden="true"/);
  assert.match(helpMenuSource, /border-border-subtle/);
  assert.match(helpMenuSource, /bg-surface-panel\/95/);
  assert.doesNotMatch(helpMenuSource, /neutral-\d/);
  assert.doesNotMatch(helpMenuSource, /emerald-\d/);
});

test("command palette exposes an explicit accessible name on the search input", () => {
  assert.match(commandPaletteSource, /<Command\.Input[^>]*aria-label="Search command menu"/);
});

test("explorer summary context bands use semantic tokens instead of hard-coded dark palettes", () => {
  assert.match(explorerSummarySource, /CONTEXT_BAND_CLASS_NAME = "mt-auto rounded-\[22px\] border border-border-subtle bg-surface-field\/70 px-4 py-3"/);
  assert.match(explorerSummarySource, /SPARKLINE_STROKE_CLASS_NAME = "stroke-accent"/);
  assert.doesNotMatch(explorerSummarySource, /text-neutral-/);
  assert.doesNotMatch(explorerSummarySource, /border-neutral-/);
  assert.doesNotMatch(explorerSummarySource, /bg-neutral-/);
  assert.doesNotMatch(explorerSummarySource, /stone-\d/);
  assert.doesNotMatch(explorerSummarySource, /rose-\d/);
  assert.doesNotMatch(explorerSummarySource, /sky-\d/);
  assert.doesNotMatch(explorerSummarySource, /amber-\d/);
});
