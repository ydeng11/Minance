import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const globalsSource = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
const layoutSource = readFileSync(join(process.cwd(), "src/app/layout.tsx"), "utf8");
const dashboardPageSource = readFileSync(join(process.cwd(), "src/app/page.tsx"), "utf8");
const importPageSource = readFileSync(join(process.cwd(), "src/app/import/page.tsx"), "utf8");
const helpPageSource = readFileSync(join(process.cwd(), "src/app/help/page.tsx"), "utf8");
const explorerCardSource = readFileSync(
  join(process.cwd(), "src/app/explorer/components/ExplorerCard.tsx"),
  "utf8"
);
const categoryWeekdayHeatmapSource = readFileSync(
  join(process.cwd(), "src/app/explorer/components/CategoryWeekdayHeatmap.tsx"),
  "utf8"
);
const explorerSummarySource = readFileSync(
  join(process.cwd(), "src/app/explorer/components/ExplorerSummaryBand.tsx"),
  "utf8"
);
const trendChartSource = readFileSync(
  join(process.cwd(), "src/app/explorer/components/TrendChart.tsx"),
  "utf8"
);
const merchantAnalysisSource = readFileSync(
  join(process.cwd(), "src/app/explorer/components/MerchantAnalysis.tsx"),
  "utf8"
);
const anomaliesSource = readFileSync(
  join(process.cwd(), "src/app/explorer/components/Anomalies.tsx"),
  "utf8"
);

function readConstAssignment(source: string, name: string) {
  const match = source.match(new RegExp(`const ${name} =\\n\\s+([^\n]+);`));
  assert.ok(match, `Expected to find ${name}`);
  return match[1];
}

test("layout wires a distinct editorial display font and body font through next/font", () => {
  assert.match(layoutSource, /next\/font\/local/);
  assert.doesNotMatch(layoutSource, /next\/font\/google/);
  assert.match(layoutSource, /localFont/);
  assert.match(layoutSource, /--font-body/);
  assert.match(layoutSource, /--font-editorial/);
  assert.match(layoutSource, /font-sans/);
  assert.match(globalsSource, /--font-sans:\s*var\(--font-body\)/);
  assert.match(globalsSource, /--font-display:\s*var\(--font-editorial\)/);
});

test("dashboard uses an editorial hero metric layout instead of the cloned KPI grid", () => {
  assert.match(dashboardPageSource, /dashboard-hero-metric/);
  assert.match(dashboardPageSource, /dashboard-support-metrics/);
  assert.match(dashboardPageSource, /dashboard-categories-section/);
  assert.match(dashboardPageSource, /dashboard-merchants-section/);
  assert.match(dashboardPageSource, /dashboard-ledger-handoff/);
  assert.doesNotMatch(dashboardPageSource, /grid grid-cols-2 gap-4 md:grid-cols-4/);
});

test("explorer uses differentiated analytics shells instead of repeated clone cards", () => {
  assert.match(explorerSummarySource, /explorer-summary-hero/);
  assert.match(explorerSummarySource, /explorer-summary-support-grid/);
  assert.match(trendChartSource, /explorer-trend-board/);
  assert.match(merchantAnalysisSource, /analytics-merchant-watchlist/);
  assert.match(anomaliesSource, /analytics-anomaly-ledger/);
});

test("visual shells use semantic tokens and avoid repeated gradient card tells", () => {
  const supportKpiButtonClass = readConstAssignment(dashboardPageSource, "SUPPORT_KPI_BUTTON_CLASS");
  const panelClass = readConstAssignment(dashboardPageSource, "PANEL_CLASS");
  const importUploadClass = readConstAssignment(importPageSource, "IMPORT_UPLOAD_SECTION_CLASS");

  assert.doesNotMatch(explorerCardSource, /ring-white/);
  assert.match(explorerCardSource, /ring-border-subtle/);
  assert.doesNotMatch(supportKpiButtonClass, /\[background-image:var\(--gradient-panel\)\]/);
  assert.doesNotMatch(panelClass, /\[background-image:var\(--gradient-panel\)\]/);
  assert.doesNotMatch(importUploadClass, /\[background-image:var\(--gradient-panel\)\]/);
  assert.doesNotMatch(helpPageSource, /\[background-image:var\(--gradient-panel\)\]/);
});

test("import compact actions preserve touch-friendly minimum targets", () => {
  const touchTargetClasses = [
    "IMPORT_SELECT_FIELD_CLASS",
    "IMPORT_SMALL_SECONDARY_ACTION_CLASS",
    "IMPORT_SMALL_PRIMARY_ACTION_CLASS",
    "IMPORT_PROCESSED_FIELD_CLASS",
    "IMPORT_RECONCILIATION_REFRESH_ACTION_CLASS",
    "IMPORT_RECENT_IMPORT_ACTION_CLASS"
  ];

  touchTargetClasses.forEach((className) => {
    assert.match(readConstAssignment(importPageSource, className), /\bmin-h-11\b/, className);
  });
});

test("weekday category heatmap adapts below desktop without a fixed mobile-hostile width", () => {
  assert.doesNotMatch(categoryWeekdayHeatmapSource, /min-w-\[860px\]/);
  assert.match(categoryWeekdayHeatmapSource, /explorer-category-weekday-heatmap-mobile/);
  assert.match(categoryWeekdayHeatmapSource, /hidden md:block/);
  assert.match(categoryWeekdayHeatmapSource, /md:hidden/);
});
