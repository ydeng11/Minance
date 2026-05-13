import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ViewControllerProvider } from "@/components/view/ViewController";
import { ExplorerViewContent } from "./components/ExplorerViewContent";
import { createDefaultExplorerFilterState } from "./filters";

const HARD_CODED_NEUTRAL_CLASS_PATTERN =
  /(?:border|bg|text|placeholder:text|focus:border|hover:bg|hover:border)-neutral-(?:50|100|200|300|400|500|700|800|900|950)/;
const HARD_CODED_EMERALD_CLASS_PATTERN =
  /(?:border|bg|text|focus:border|hover:bg|hover:border)-emerald-(?:200|300|400|500)/;

test("explorer view layout renders shell dialog content instead of the legacy command bar", () => {
  const markup = renderToStaticMarkup(
    createElement(
      ViewControllerProvider,
      null,
      createElement(ExplorerViewContent, {
        filters: createDefaultExplorerFilterState(),
        accounts: [],
        categories: [],
        availableTags: [],
        amountBounds: { min: 0, max: 100 },
        onApply: () => undefined
      })
    )
  );

  assert.match(markup, /data-testid="explorer-view-content"/);
  assert.match(markup, />Range</);
  assert.match(markup, />Compare</);
  assert.match(markup, /data-testid="explorer-advanced-control-grid"/);
  assert.match(markup, /lg:grid-cols-2/);
  assert.doesNotMatch(markup, /explorer-command-bar/);
});

test("explorer view drawer content uses theme tokens instead of hard-coded dark palette classes", () => {
  const markup = renderToStaticMarkup(
    createElement(
      ViewControllerProvider,
      null,
      createElement(ExplorerViewContent, {
        filters: createDefaultExplorerFilterState(),
        accounts: [],
        categories: [],
        availableTags: ["monthly"],
        amountBounds: { min: 0, max: 100 },
        onApply: () => undefined
      })
    )
  );

  assert.match(markup, /bg-surface-panel/);
  assert.match(markup, /bg-surface-field/);
  assert.match(markup, /focus-visible:ring-focus-ring/);
  assert.doesNotMatch(markup, HARD_CODED_NEUTRAL_CLASS_PATTERN);
  assert.doesNotMatch(markup, HARD_CODED_EMERALD_CLASS_PATTERN);
});

test("legacy explorer command and sidebar controls are removed from the codebase", () => {
  const legacyComponentPaths = [
    "src/app/explorer/components/ExplorerCommandBar.tsx",
    "src/app/explorer/components/FilterSidebar.tsx"
  ];

  legacyComponentPaths.forEach((componentPath) => {
    assert.equal(existsSync(join(process.cwd(), componentPath)), false, componentPath);
  });
});
