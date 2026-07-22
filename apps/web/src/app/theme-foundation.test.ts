import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const globalsSource = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
const layoutSource = readFileSync(join(process.cwd(), "src/app/layout.tsx"), "utf8");
const providersSource = readFileSync(join(process.cwd(), "src/components/providers/AppProviders.tsx"), "utf8");
const settingsPageSource = readFileSync(join(process.cwd(), "src/app/settings/page.tsx"), "utf8");
const aiSettingsPageSource = readFileSync(join(process.cwd(), "src/app/settings/ai/page.tsx"), "utf8");
const authPanelSource = readFileSync(join(process.cwd(), "src/components/auth/AuthPanel.tsx"), "utf8");
const appGateSource = readFileSync(join(process.cwd(), "src/components/auth/AppGate.tsx"), "utf8");
const helpPageSource = readFileSync(join(process.cwd(), "src/app/help/page.tsx"), "utf8");
const accountsPageSource = readFileSync(join(process.cwd(), "src/app/accounts/page.tsx"), "utf8");
const accountsCardDetailsSource = readFileSync(join(process.cwd(), "src/app/accounts/CardDetailsSection.tsx"), "utf8");
const accountsRouteSource = `${accountsPageSource}\n${accountsCardDetailsSource}`;
const recurringsPageSource = readFileSync(join(process.cwd(), "src/app/recurrings/page.tsx"), "utf8");
const categoriesPageSource = readFileSync(join(process.cwd(), "src/app/categories/page.tsx"), "utf8");
const taxonomyManagementStart = categoriesPageSource.lastIndexOf(
  "<section",
  categoriesPageSource.indexOf('data-testid="taxonomy-management"')
);
const taxonomyManagementSource = categoriesPageSource.slice(
  taxonomyManagementStart,
  categoriesPageSource.indexOf("{modalOpen ? (")
);
const commandPaletteSource = readFileSync(join(process.cwd(), "src/components/command-palette/CommandPalette.tsx"), "utf8");
const multiSelectFieldSource = readFileSync(join(process.cwd(), "src/components/filters/MultiSelectField.tsx"), "utf8");
const activeFilterBadgesSource = readFileSync(join(process.cwd(), "src/components/filters/ActiveFilterBadges.tsx"), "utf8");
const amountRangeControlSource = readFileSync(join(process.cwd(), "src/components/filters/AmountRangeControl.tsx"), "utf8");
const statusMessageSource = readFileSync(join(process.cwd(), "src/components/feedback/StatusMessage.tsx"), "utf8");
const recurringTotalsBandSource = readFileSync(join(process.cwd(), "src/components/recurrings/RecurringTotalsBand.tsx"), "utf8");
const recurringSuggestionsSource = readFileSync(join(process.cwd(), "src/components/recurrings/SuggestionsSection.tsx"), "utf8");
const suggestionsCalloutSource = readFileSync(join(process.cwd(), "src/components/recurrings/SuggestionsCallout.tsx"), "utf8");
const emojiPickerSource = readFileSync(join(process.cwd(), "src/components/EmojiPicker.tsx"), "utf8");
const transactionEditorFieldsSource = readFileSync(join(process.cwd(), "src/app/transactions/TransactionEditorFields.tsx"), "utf8");
const importPageSource = readFileSync(join(process.cwd(), "src/app/import/page.tsx"), "utf8");
const importMappingPanelStart = importPageSource.lastIndexOf(
  "<section",
  importPageSource.indexOf('data-testid="mapping-panel"')
);
const importProcessedPanelStart = importPageSource.lastIndexOf(
  "<section",
  importPageSource.indexOf('data-testid="processed-panel"')
);
const importReconciliationPanelStart = importPageSource.lastIndexOf(
  "<section",
  importPageSource.indexOf('data-testid="reconciliation-panel"')
);
const importRecentImportsStart = importPageSource.lastIndexOf(
  "<details",
  importPageSource.indexOf("Recent Imports")
);
const importMappingPanelSource = importPageSource.slice(
  importMappingPanelStart,
  importProcessedPanelStart
);
const importProcessedPanelSource = importPageSource.slice(
  importProcessedPanelStart,
  importReconciliationPanelStart
);
const importReconciliationPanelSource = importPageSource.slice(
  importReconciliationPanelStart,
  importRecentImportsStart
);
const importRecentImportsSource = importPageSource.slice(
  importRecentImportsStart,
  importPageSource.indexOf("</details>", importRecentImportsStart)
);
const importProcessedRowsSource = importPageSource.slice(
  importPageSource.indexOf("function renderProcessedRowsTable"),
  importPageSource.indexOf("function renderReconciliationMobileCards")
);
const importReconciliationCardsSource = importPageSource.slice(
  importPageSource.indexOf("function renderReconciliationMobileCards"),
  importPageSource.indexOf("function getReconciliationRecommendationText")
);
const importPageComponentsSource = readFileSync(join(process.cwd(), "src/app/import/pageComponents.tsx"), "utf8");
const processedRecordsToolbarSource = readFileSync(join(process.cwd(), "src/app/import/ProcessedRecordsToolbar.tsx"), "utf8");
const assistantConversationSource = readFileSync(join(process.cwd(), "src/components/assistant/AssistantConversation.tsx"), "utf8");
const shellSource = readFileSync(join(process.cwd(), "src/components/layout/Shell.tsx"), "utf8");
const sidebarSource = readFileSync(join(process.cwd(), "src/components/layout/Sidebar.tsx"), "utf8");
const bottomNavSource = readFileSync(join(process.cwd(), "src/components/layout/BottomNav.tsx"), "utf8");
const viewDialogSource = readFileSync(join(process.cwd(), "src/components/view/ViewDialog.tsx"), "utf8");
const dashboardPageSource = readFileSync(join(process.cwd(), "src/app/page.tsx"), "utf8");
const explorerPageSource = readFileSync(join(process.cwd(), "src/app/explorer/page.tsx"), "utf8");
const explorerCardSource = readFileSync(join(process.cwd(), "src/app/explorer/components/ExplorerCard.tsx"), "utf8");
const explorerSummaryBandSource = readFileSync(
  join(process.cwd(), "src/app/explorer/components/ExplorerSummaryBand.tsx"),
  "utf8"
);
const accountBreakdownSource = readFileSync(join(process.cwd(), "src/app/explorer/components/AccountBreakdown.tsx"), "utf8");
const categoryBreakdownSource = readFileSync(join(process.cwd(), "src/app/explorer/components/CategoryBreakdown.tsx"), "utf8");
const savedViewsSource = readFileSync(join(process.cwd(), "src/app/explorer/components/SavedViews.tsx"), "utf8");
const explorerPerspectiveTabsSource = readFileSync(
  join(process.cwd(), "src/app/explorer/components/ExplorerPerspectiveTabs.tsx"),
  "utf8"
);
const explorerMiniSparklineSource = readFileSync(
  join(process.cwd(), "src/app/explorer/components/ExplorerMiniSparkline.tsx"),
  "utf8"
);
const spendingHeatmapSource = readFileSync(join(process.cwd(), "src/app/explorer/components/SpendingHeatmap.tsx"), "utf8");
const weekdaySpendSummarySource = readFileSync(join(process.cwd(), "src/app/explorer/components/WeekdaySpendSummary.tsx"), "utf8");
const categoryWeekdayHeatmapSource = readFileSync(
  join(process.cwd(), "src/app/explorer/components/CategoryWeekdayHeatmap.tsx"),
  "utf8"
);
const weekdayHeatmapPresentationSource = readFileSync(
  join(process.cwd(), "src/app/explorer/components/weekdayHeatmapPresentation.ts"),
  "utf8"
);
const categoryPerspectiveSource = readFileSync(
  join(process.cwd(), "src/app/explorer/components/CategoryPerspective.tsx"),
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
const trendChartSource = readFileSync(
  join(process.cwd(), "src/app/explorer/components/TrendChart.tsx"),
  "utf8"
);
const transactionsPageSource = readFileSync(join(process.cwd(), "src/app/transactions/page.tsx"), "utf8");
const sharedViewFiltersSource = readFileSync(
  join(process.cwd(), "src/components/filters/SharedViewFilters.tsx"),
  "utf8"
);

test("globals css defines semantic theme tokens for surfaces, text, borders, accents, and gradients", () => {
  assert.match(globalsSource, /--app-bg:/);
  assert.match(globalsSource, /--surface-panel:/);
  assert.match(globalsSource, /--text-primary:/);
  assert.match(globalsSource, /--border-subtle:/);
  assert.match(globalsSource, /--accent-soft:/);
  assert.match(globalsSource, /--danger-soft:/);
  assert.match(globalsSource, /--warning-soft:/);
  assert.doesNotMatch(globalsSource, /--gradient-panel:/);
});

test("layout uses a hydration-safe data-theme contract instead of forcing a dark class directly", () => {
  assert.match(layoutSource, /data-theme=/);
  assert.match(layoutSource, /suppressHydrationWarning/);
  assert.match(layoutSource, /buildThemeInitScript/);
  assert.doesNotMatch(layoutSource, /className="dark"/);
});

test("app providers use shared theme state for overlays", () => {
  assert.match(providersSource, /ThemeProvider/);
  assert.match(providersSource, /useAppTheme/);
  assert.match(providersSource, /theme=\{theme\}/);
  assert.doesNotMatch(providersSource, /theme=\{APP_THEME\}/);
});

test("shared shell surfaces use semantic token-backed backgrounds and borders", () => {
  assert.match(shellSource, /bg-app-bg/);
  assert.match(shellSource, /bg-surface-panel/);
  assert.match(sidebarSource, /border-border-subtle/);
  assert.match(sidebarSource, /bg-surface-panel/);
  assert.match(bottomNavSource, /bg-surface-panel/);
  assert.match(bottomNavSource, /bg-app-bg\/65/);
  assert.doesNotMatch(shellSource, /bg-black/);
  assert.doesNotMatch(bottomNavSource, /bg-black/);
});

test("view dialog chrome uses shared semantic surface and shadow recipes", () => {
  assert.match(viewDialogSource, /bg-surface-panel/);
  assert.match(viewDialogSource, /shadow-dialog/);
  assert.match(viewDialogSource, /bg-app-bg\/70/);
  assert.doesNotMatch(viewDialogSource, /\[background-image:var\(--gradient-panel\)\]/);
  assert.doesNotMatch(viewDialogSource, /bg-black/);
});

test("audited explorer and transactions shells use semantic surfaces instead of hard-coded gradients", () => {
  assert.match(explorerPageSource, /bg-surface-panel/);
  assert.match(explorerPageSource, /bg-accent-soft/);
  assert.match(explorerPageSource, /focus-visible:ring-focus-ring/);
  assert.match(explorerCardSource, /border-border-subtle/);
  assert.match(sharedViewFiltersSource, /bg-surface-panel/);
  assert.match(sharedViewFiltersSource, /border-border-subtle/);
  assert.doesNotMatch(explorerCardSource, /\[background-image:var\(--gradient-panel\)\]/);
  assert.doesNotMatch(sharedViewFiltersSource, /\[background-image:var\(--gradient-panel\)\]/);
  assert.doesNotMatch(explorerPageSource, /neutral-\d/);
  assert.doesNotMatch(explorerPageSource, /emerald-\d/);
  assert.doesNotMatch(sharedViewFiltersSource, /bg-black/);
});

test("dashboard route uses semantic tokens instead of hard-coded dark palettes", () => {
  assert.match(dashboardPageSource, /bg-surface-panel/);
  assert.match(dashboardPageSource, /bg-surface-field/);
  assert.match(dashboardPageSource, /text-text-primary/);
  assert.match(dashboardPageSource, /focus-visible:ring-focus-ring/);
  assert.match(dashboardPageSource, /text-warning/);
  assert.match(dashboardPageSource, /text-danger/);

  assert.doesNotMatch(dashboardPageSource, /stone-\d/);
  assert.doesNotMatch(dashboardPageSource, /rose-\d/);
  assert.doesNotMatch(dashboardPageSource, /sky-\d/);
  assert.doesNotMatch(dashboardPageSource, /amber-\d/);
  assert.doesNotMatch(dashboardPageSource, /rgba\(/);
});

test("legacy explorer widgets use semantic tokens instead of hard-coded dark palettes", () => {
  const explorerWidgetSources = [
    accountBreakdownSource,
    categoryBreakdownSource,
    savedViewsSource
  ];

  assert.match(accountBreakdownSource, /bg-surface-panel/);
  assert.match(categoryBreakdownSource, /bg-surface-panel/);
  assert.match(savedViewsSource, /bg-surface-field/);

  explorerWidgetSources.forEach((source) => {
    assert.doesNotMatch(source, /neutral-\d/);
    assert.doesNotMatch(source, /emerald-\d/);
  });
});

test("saved views use compact shell controls instead of a page section", () => {
  assert.match(savedViewsSource, /Save the View/);
  assert.match(savedViewsSource, /saved-view-menu/);
  assert.match(savedViewsSource, /saved-view-delete-/);
  assert.doesNotMatch(savedViewsSource, /saved-views-section/);
  assert.doesNotMatch(explorerPageSource, /<SavedViews\s/);
  assert.match(shellSource, /view\?\.toolbar/);
});

test("explorer perspective controls use semantic tokens instead of hard-coded dark palettes", () => {
  const perspectiveControlSources = [
    explorerPerspectiveTabsSource,
    explorerMiniSparklineSource
  ];

  assert.match(explorerPerspectiveTabsSource, /bg-surface-panel/);
  assert.match(explorerPerspectiveTabsSource, /bg-accent-soft/);
  assert.match(explorerMiniSparklineSource, /stroke-accent/);

  perspectiveControlSources.forEach((source) => {
    assert.doesNotMatch(source, /neutral-\d/);
    assert.doesNotMatch(source, /emerald-\d/);
  });
});

test("explorer heatmap widgets use semantic tokens instead of hard-coded dark palettes", () => {
  const heatmapSources = [
    spendingHeatmapSource,
    weekdaySpendSummarySource,
    categoryWeekdayHeatmapSource,
    weekdayHeatmapPresentationSource
  ];

  assert.match(spendingHeatmapSource, /bg-surface-panel/);
  assert.match(spendingHeatmapSource, /role="img"/);
  assert.match(spendingHeatmapSource, /aria-label=\{`\$\{WEEKDAY_LABELS\[entry\.weekday\]\}/);
  assert.match(weekdaySpendSummarySource, /bg-surface-panel/);
  assert.match(weekdaySpendSummarySource, /group-focus-visible:block/);
  assert.match(weekdaySpendSummarySource, /role="img"/);
  assert.match(weekdaySpendSummarySource, /tabIndex=\{0\}/);
  assert.match(categoryWeekdayHeatmapSource, /bg-surface-field/);
  assert.match(weekdayHeatmapPresentationSource, /ring-accent/);

  heatmapSources.forEach((source) => {
    assert.doesNotMatch(source, /neutral-\d/);
    assert.doesNotMatch(source, /emerald-\d/);
  });
});

test("explorer category perspective uses semantic tokens instead of hard-coded dark palettes", () => {
  assert.match(categoryPerspectiveSource, /bg-surface-field/);
  assert.match(categoryPerspectiveSource, /bg-accent-soft/);

  assert.doesNotMatch(categoryPerspectiveSource, /neutral-\d/);
  assert.doesNotMatch(categoryPerspectiveSource, /emerald-\d/);
  assert.doesNotMatch(categoryPerspectiveSource, /(?:border|bg|text)-(?:white|black)/);
});

test("explorer merchant and anomaly insight widgets use semantic tokens instead of hard-coded stone palettes", () => {
  const insightWidgetSources = [
    merchantAnalysisSource,
    anomaliesSource
  ];

  assert.match(merchantAnalysisSource, /bg-surface-panel/);
  assert.match(merchantAnalysisSource, /focus-visible:ring-focus-ring/);
  assert.match(anomaliesSource, /bg-surface-panel/);
  assert.match(anomaliesSource, /bg-surface-field/);

  insightWidgetSources.forEach((source) => {
    assert.doesNotMatch(source, /stone-\d/);
  });
});

test("explorer trend board uses semantic tokens instead of hard-coded dark chart palettes", () => {
  assert.match(trendChartSource, /bg-surface-panel/);
  assert.match(trendChartSource, /bg-surface-field/);
  assert.match(trendChartSource, /focus-visible:ring-focus-ring/);
  assert.match(trendChartSource, /bg-accent/);
  assert.match(trendChartSource, /ariaLabel: `\$\{formatMonthDetailLabel\(entry\.month\)\} trend summary: spend/);
  assert.match(trendChartSource, /aria-label=\{item\.ariaLabel\}/);

  assert.doesNotMatch(trendChartSource, /stone-\d/);
  assert.doesNotMatch(trendChartSource, /rose-\d/);
  assert.doesNotMatch(trendChartSource, /sky-\d/);
  assert.doesNotMatch(trendChartSource, /amber-\d/);
  assert.doesNotMatch(trendChartSource, /rgba\(/);
});

test("explorer summary band uses semantic tokens instead of hard-coded dark chart palettes", () => {
  assert.match(explorerSummaryBandSource, /bg-surface-panel/);
  assert.match(explorerSummaryBandSource, /bg-surface-field/);
  assert.match(explorerSummaryBandSource, /border-border-subtle/);
  assert.match(explorerSummaryBandSource, /stroke-accent/);

  assert.doesNotMatch(explorerSummaryBandSource, /stone-\d/);
  assert.doesNotMatch(explorerSummaryBandSource, /rose-\d/);
  assert.doesNotMatch(explorerSummaryBandSource, /sky-\d/);
  assert.doesNotMatch(explorerSummaryBandSource, /amber-\d/);
  assert.doesNotMatch(explorerSummaryBandSource, /bg-black/);
  assert.doesNotMatch(explorerSummaryBandSource, /rgba\(/);
});

test("shell exposes the persistent light and dark mode switch", () => {
  assert.match(shellSource, /useAppTheme/);
  assert.match(shellSource, /data-testid="theme-toggle"/);
  assert.match(shellSource, /role="switch"/);
  assert.match(shellSource, /aria-checked=\{theme === "light"\}/);
  assert.match(shellSource, /setTheme\(theme === "dark" \? "light" : "dark"\)/);
});

test("settings keeps database recovery focused by omitting unrelated data controls", () => {
  assert.doesNotMatch(settingsPageSource, /settings-section-map/);
  assert.doesNotMatch(settingsPageSource, /Section Map/);
  assert.doesNotMatch(settingsPageSource, /settings-appearance/);
  assert.doesNotMatch(settingsPageSource, /settings-help-link/);
  assert.doesNotMatch(settingsPageSource, /Help &amp; support links/);
  assert.doesNotMatch(settingsPageSource, /settings-integrations/);
  assert.doesNotMatch(settingsPageSource, /settings-ai-settings-link/);
  assert.doesNotMatch(settingsPageSource, /settings-import-open/);
  assert.doesNotMatch(settingsPageSource, /settings-export-snapshot/);
  assert.doesNotMatch(settingsPageSource, /Default ingestion is CSV\/manual import/);
  assert.doesNotMatch(settingsPageSource, /Hosted bank connectors are intentionally optional/);
  assert.match(settingsPageSource, /settings-backup-create/);
  assert.match(settingsPageSource, /settings-backup-upload/);
});

test("settings routes use semantic token-backed surfaces so both themes stay legible", () => {
  assert.match(settingsPageSource, /bg-surface-panel\/85/);
  assert.match(aiSettingsPageSource, /bg-surface-panel\/85/);
  assert.match(aiSettingsPageSource, /border-border-subtle/);
  assert.match(aiSettingsPageSource, /text-text-secondary/);
  assert.doesNotMatch(aiSettingsPageSource, /bg-neutral-950\/70/);
  assert.doesNotMatch(aiSettingsPageSource, /amber-\d/);
});

test("auth and help entry surfaces use semantic tokens instead of hard-coded dark palettes", () => {
  assert.match(authPanelSource, /bg-app-bg/);
  assert.match(authPanelSource, /bg-surface-panel/);
  assert.match(appGateSource, /bg-app-bg/);
  assert.match(helpPageSource, /bg-surface-panel/);
  assert.match(helpPageSource, /border-border-subtle/);

  [authPanelSource, appGateSource, helpPageSource].forEach((source) => {
    assert.doesNotMatch(source, /neutral-\d/);
    assert.doesNotMatch(source, /emerald-\d/);
    assert.doesNotMatch(source, /amber-\d/);
  });
});

test("accounts route uses semantic tokens instead of hard-coded dark palettes", () => {
  assert.match(accountsRouteSource, /bg-surface-panel/);
  assert.match(accountsRouteSource, /bg-surface-field/);
  assert.match(accountsRouteSource, /border-border-subtle/);
  assert.match(accountsRouteSource, /text-text-secondary/);
  assert.match(accountsRouteSource, /bg-app-bg\/80/);
  assert.match(accountsRouteSource, /text-danger/);
  assert.match(accountsRouteSource, /text-warning/);

  assert.doesNotMatch(accountsRouteSource, /neutral-\d/);
  assert.doesNotMatch(accountsRouteSource, /emerald-\d/);
  assert.doesNotMatch(accountsRouteSource, /rose-\d/);
  assert.doesNotMatch(accountsRouteSource, /amber-\d/);
  assert.doesNotMatch(accountsRouteSource, /bg-black/);
});

test("recurrings route uses semantic tokens instead of hard-coded dark palettes", () => {
  assert.match(recurringsPageSource, /bg-surface-panel/);
  assert.match(recurringsPageSource, /bg-surface-field/);
  assert.match(recurringsPageSource, /border-border-subtle/);
  assert.match(recurringsPageSource, /text-text-secondary/);
  assert.match(recurringsPageSource, /aria-label="Recurring rule name"/);
  assert.match(recurringsPageSource, /aria-label="Recurring rule cadence"/);
  assert.match(recurringsPageSource, /aria-label="Recurring rule amount"/);
  assert.match(recurringsPageSource, /aria-label="Recurring rule direction"/);

  assert.doesNotMatch(recurringsPageSource, /neutral-\d/);
  assert.doesNotMatch(recurringsPageSource, /emerald-\d/);
  assert.doesNotMatch(recurringsPageSource, /rose-\d/);
  assert.doesNotMatch(recurringsPageSource, /amber-\d/);
  assert.doesNotMatch(recurringsPageSource, /slate-\d/);
});

test("categories destructive dialogs use semantic danger and backdrop tokens", () => {
  assert.match(categoriesPageSource, /bg-app-bg\/80/);
  assert.match(categoriesPageSource, /text-danger/);
  assert.match(categoriesPageSource, /bg-danger-soft/);

  assert.doesNotMatch(categoriesPageSource, /rose-\d/);
  assert.doesNotMatch(categoriesPageSource, /bg-black/);
});

test("categories catalog uses semantic surfaces, fields, table chrome, and row actions", () => {
  assert.match(categoriesPageSource, /CATEGORY_SECTION_CLASS/);
  assert.match(categoriesPageSource, /CATEGORY_TEXT_FIELD_CLASS/);
  assert.match(categoriesPageSource, /CATEGORY_TABLE_BODY_CLASS/);
  assert.match(categoriesPageSource, /CATEGORY_ROW_ACTION_BUTTON_CLASS/);

  assert.doesNotMatch(categoriesPageSource, /className="text-neutral-400">Manage category names/);
  assert.doesNotMatch(categoriesPageSource, /inline-flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm font-medium text-neutral-200/);
  assert.doesNotMatch(categoriesPageSource, /<section className="rounded-2xl border border-neutral-900 bg-neutral-950\/70 p-4">\s*<div className="flex flex-wrap items-center justify-between gap-3">/);
  assert.doesNotMatch(categoriesPageSource, /w-full rounded-lg border border-neutral-700 bg-neutral-900 py-2 pl-9 pr-3 text-sm text-neutral-100/);
  assert.doesNotMatch(categoriesPageSource, /data-testid="categories-table"[\s\S]{0,600}divide-y divide-neutral-800 bg-neutral-950\/20 text-neutral-200/);
  assert.doesNotMatch(categoriesPageSource, /inline-flex items-center gap-1 rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-neutral-200 transition hover:border-emerald-500\/40 hover:text-emerald-300/);
});

test("categories taxonomy management uses semantic surfaces, controls, and accent actions", () => {
  assert.match(taxonomyManagementSource, /CATEGORY_SECTION_CLASS/);
  assert.match(taxonomyManagementSource, /CATEGORY_TAXONOMY_CARD_CLASS/);
  assert.match(taxonomyManagementSource, /CATEGORY_COMPACT_TEXT_FIELD_CLASS/);
  assert.match(taxonomyManagementSource, /CATEGORY_COMPACT_SELECT_FIELD_CLASS/);
  assert.match(taxonomyManagementSource, /CATEGORY_ACCENT_ACTION_CLASS/);

  assert.doesNotMatch(taxonomyManagementSource, /neutral-\d/);
  assert.doesNotMatch(taxonomyManagementSource, /emerald-\d/);
});

test("categories modals use semantic panels, fields, copy, and actions", () => {
  assert.match(categoriesPageSource, /CATEGORY_MODAL_PANEL_CLASS/);
  assert.match(categoriesPageSource, /CATEGORY_MODAL_FIELD_CLASS/);
  assert.match(categoriesPageSource, /CATEGORY_MODAL_COPY_CLASS/);
  assert.match(categoriesPageSource, /CATEGORY_SECONDARY_ACTION_CLASS/);
  assert.match(categoriesPageSource, /CATEGORY_ACCENT_ACTION_CLASS/);

  assert.doesNotMatch(categoriesPageSource, /neutral-\d/);
  assert.doesNotMatch(categoriesPageSource, /emerald-\d/);
});

test("shared navigation, filter, feedback, and recurring controls use semantic tokens", () => {
  const sharedControlSources = [
    commandPaletteSource,
    multiSelectFieldSource,
    activeFilterBadgesSource,
    amountRangeControlSource,
    statusMessageSource,
    recurringTotalsBandSource,
    recurringSuggestionsSource,
    suggestionsCalloutSource
  ];

  assert.match(commandPaletteSource, /bg-surface-panel/);
  assert.match(multiSelectFieldSource, /bg-surface-field/);
  assert.match(activeFilterBadgesSource, /bg-accent-soft/);
  assert.match(statusMessageSource, /border-border-subtle/);
  assert.match(statusMessageSource, /border-danger/);
  assert.match(recurringSuggestionsSource, /bg-surface-panel/);
  assert.match(suggestionsCalloutSource, /text-warning/);
  assert.match(suggestionsCalloutSource, /focus-visible:ring-focus-ring/);
  assert.match(suggestionsCalloutSource, /aria-label=\{actionLabel\}/);
  assert.match(suggestionsCalloutSource, /Review \$\{count\} potential recurring/);

  sharedControlSources.forEach((source) => {
    assert.doesNotMatch(source, /neutral-\d/);
    assert.doesNotMatch(source, /emerald-\d/);
    assert.doesNotMatch(source, /rose-\d/);
    assert.doesNotMatch(source, /amber-\d/);
  });
});

test("import and transaction form helpers use semantic tokens", () => {
  const helperSources = [
    transactionEditorFieldsSource,
    importPageComponentsSource,
    processedRecordsToolbarSource
  ];

  assert.match(transactionEditorFieldsSource, /bg-surface-field/);
  assert.match(transactionEditorFieldsSource, /text-danger/);
  assert.match(importPageComponentsSource, /border-border-subtle/);
  assert.match(processedRecordsToolbarSource, /text-text-primary/);
  assert.match(importPageComponentsSource, /text-warning/);

  helperSources.forEach((source) => {
    assert.doesNotMatch(source, /neutral-\d/);
    assert.doesNotMatch(source, /emerald-\d/);
    assert.doesNotMatch(source, /rose-\d/);
    assert.doesNotMatch(source, /amber-\d/);
  });
});

test("import reconciliation warning actions use semantic warning tokens", () => {
  assert.match(importPageSource, /reconciliationWarningActionClass/);
  assert.match(importPageSource, /text-warning/);
  assert.match(importPageSource, /bg-warning-soft/);

  assert.doesNotMatch(importPageSource, /amber-\d/);
});

test("import upload entry and analyzed preview use semantic surface and action tokens", () => {
  assert.match(importPageSource, /IMPORT_UPLOAD_SECTION_CLASS/);
  assert.match(importPageSource, /IMPORT_UPLOAD_STATE_PANEL_CLASS/);
  assert.match(importPageSource, /IMPORT_PRIMARY_ACTION_CLASS/);
  assert.match(importPageSource, /IMPORT_SECTION_PANEL_CLASS/);
  assert.match(importPageSource, /IMPORT_PREVIEW_TABLE_HEAD_CLASS/);

  assert.doesNotMatch(importPageSource, /rounded-2xl border border-dashed border-neutral-700 bg-neutral-950\/70 p-10 text-center/);
  assert.doesNotMatch(importPageSource, /rounded-xl border border-neutral-900 bg-neutral-950 p-10/);
  assert.doesNotMatch(importPageSource, /rounded-full bg-emerald-500\/10 p-4/);
  assert.doesNotMatch(importPageSource, /mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3/);
  assert.doesNotMatch(importPageSource, /rounded-xl border border-neutral-900 bg-neutral-950\/70 p-4/);
  assert.doesNotMatch(importPageSource, /bg-neutral-900\/60 text-neutral-300/);
});

test("import mapping panel uses semantic shell, fields, and commit actions", () => {
  assert.match(importPageSource, /IMPORT_ADVANCED_DETAILS_CLASS/);
  assert.match(importMappingPanelSource, /IMPORT_SECTION_PANEL_CLASS/);
  assert.match(importMappingPanelSource, /IMPORT_MAPPING_TEMPLATE_CARD_CLASS/);
  assert.match(importMappingPanelSource, /IMPORT_SELECT_FIELD_CLASS/);
  assert.match(importMappingPanelSource, /IMPORT_SMALL_PRIMARY_ACTION_CLASS/);
  assert.match(importMappingPanelSource, /IMPORT_COMMIT_JSON_CLASS/);

  assert.doesNotMatch(importMappingPanelSource, /neutral-\d/);
  assert.doesNotMatch(importMappingPanelSource, /emerald-\d/);
});

test("import processed records editor uses semantic row, field, and panel tokens", () => {
  assert.match(importPageSource, /IMPORT_PROCESSED_FIELD_CLASS/);
  assert.match(importPageSource, /IMPORT_PROCESSED_CARD_CLASS/);
  assert.match(importPageSource, /IMPORT_PROCESSED_STATUS_CLASS/);
  assert.match(importProcessedPanelSource, /IMPORT_SECTION_PANEL_CLASS/);
  assert.match(importProcessedPanelSource, /IMPORT_SELECT_FIELD_CLASS/);
  assert.match(importProcessedPanelSource, /IMPORT_TABLE_HEAD_ROW_CLASS/);
  assert.match(importProcessedRowsSource, /IMPORT_TABLE_ROW_CLASS/);
  assert.match(importProcessedRowsSource, /IMPORT_TABLE_EMPTY_CLASS/);
  assert.match(importProcessedRowsSource, /IMPORT_TABLE_MUTED_CELL_CLASS/);

  assert.doesNotMatch(importProcessedPanelSource, /neutral-\d/);
  assert.doesNotMatch(importProcessedPanelSource, /emerald-\d/);
  assert.doesNotMatch(importProcessedRowsSource, /neutral-\d/);
  assert.doesNotMatch(importProcessedRowsSource, /emerald-\d/);
});

test("import reconciliation panel uses semantic row, card, table, and action tokens", () => {
  assert.match(importPageSource, /IMPORT_RECONCILIATION_CARD_CLASS/);
  assert.match(importPageSource, /IMPORT_RECONCILIATION_REFRESH_ACTION_CLASS/);
  assert.match(importReconciliationPanelSource, /IMPORT_SECTION_PANEL_CLASS/);
  assert.match(importReconciliationPanelSource, /IMPORT_TABLE_HEAD_ROW_CLASS/);
  assert.match(importReconciliationPanelSource, /IMPORT_TABLE_ROW_CLASS/);
  assert.match(importReconciliationPanelSource, /IMPORT_SELECT_FIELD_CLASS/);
  assert.match(importReconciliationCardsSource, /IMPORT_RECONCILIATION_EMPTY_CLASS/);
  assert.match(importReconciliationCardsSource, /IMPORT_RECONCILIATION_BADGE_CLASS/);
  assert.match(importReconciliationCardsSource, /IMPORT_RECONCILIATION_VALUE_CLASS/);

  assert.doesNotMatch(importReconciliationPanelSource, /neutral-\d/);
  assert.doesNotMatch(importReconciliationPanelSource, /emerald-\d/);
  assert.doesNotMatch(importReconciliationCardsSource, /neutral-\d/);
  assert.doesNotMatch(importReconciliationCardsSource, /emerald-\d/);
});

test("import recent imports list uses semantic panel, row, and action tokens", () => {
  assert.match(importRecentImportsSource, /IMPORT_COLLAPSIBLE_SECTION_CLASS/);
  assert.match(importRecentImportsSource, /IMPORT_COLLAPSIBLE_SUMMARY_CLASS/);
  assert.match(importRecentImportsSource, /IMPORT_RECENT_IMPORT_ROW_CLASS/);
  assert.match(importRecentImportsSource, /IMPORT_RECENT_IMPORT_ACTION_CLASS/);
  assert.match(importRecentImportsSource, /text-text-primary/);
  assert.match(importRecentImportsSource, /text-text-secondary/);

  assert.doesNotMatch(importRecentImportsSource, /neutral-\d/);
  assert.doesNotMatch(importRecentImportsSource, /emerald-\d/);
});

test("import route avoids hard-coded neutral and emerald palette utilities", () => {
  assert.doesNotMatch(importPageSource, /neutral-\d/);
  assert.doesNotMatch(importPageSource, /emerald-\d/);
});

test("transactions danger actions use semantic danger tokens", () => {
  assert.match(transactionsPageSource, /BULK_DANGER_BUTTON_CLASS/);
  assert.match(transactionsPageSource, /text-danger/);
  assert.match(transactionsPageSource, /bg-danger-soft/);

  assert.doesNotMatch(transactionsPageSource, /rose-\d/);
  assert.doesNotMatch(transactionsPageSource, /text-white/);
});

test("transaction hero shell uses semantic surface and action tokens", () => {
  assert.match(transactionsPageSource, /TRANSACTION_HERO_SECTION_CLASS/);
  assert.match(transactionsPageSource, /TRANSACTION_HERO_EYEBROW_CLASS/);
  assert.match(transactionsPageSource, /TRANSACTION_HERO_PRIMARY_BUTTON_CLASS/);
  assert.match(transactionsPageSource, /shadow-panel/);

  assert.doesNotMatch(transactionsPageSource, /bg-\[linear-gradient\(135deg,rgba/);
  assert.doesNotMatch(transactionsPageSource, /rounded-2xl bg-emerald-400 px-4 py-3/);
});

test("transaction active filter chips use semantic surface tokens", () => {
  assert.match(transactionsPageSource, /TRANSACTION_ACTIVE_FILTER_CHIP_CLASS/);
  assert.match(transactionsPageSource, /TRANSACTION_ACTIVE_FILTER_EMPTY_CLASS/);
  assert.match(transactionsPageSource, /text-text-muted/);

  assert.doesNotMatch(transactionsPageSource, /rounded-full border border-neutral-800 bg-neutral-950 px-3 py-1\.5/);
  assert.doesNotMatch(transactionsPageSource, /rounded-full border border-neutral-900 bg-neutral-950\/80 px-3 py-1\.5/);
});

test("transaction ledger shell uses semantic panel and selection tokens", () => {
  assert.match(transactionsPageSource, /TRANSACTION_LEDGER_SHELL_CLASS/);
  assert.match(transactionsPageSource, /TRANSACTION_BULK_BAR_CLASS/);
  assert.match(transactionsPageSource, /TRANSACTION_BULK_BAR_COUNT_CLASS/);

  assert.doesNotMatch(transactionsPageSource, /overflow-hidden rounded-\[30px\] border border-neutral-900 bg-neutral-950\/80/);
  assert.doesNotMatch(transactionsPageSource, /relative flex flex-wrap items-center justify-between gap-3 border-b border-neutral-900 bg-neutral-900\/60/);
});

test("transaction table chrome uses semantic focus and selection tokens", () => {
  assert.match(transactionsPageSource, /TRANSACTION_TABLE_SCROLL_CLASS/);
  assert.match(transactionsPageSource, /TRANSACTION_TABLE_HEAD_CLASS/);
  assert.match(transactionsPageSource, /TRANSACTION_TABLE_BODY_CLASS/);
  assert.match(transactionsPageSource, /TRANSACTION_SELECTION_CHECKBOX_CLASS/);

  assert.doesNotMatch(transactionsPageSource, /focus:ring-emerald-400\/70 focus:ring-offset-2 focus:ring-offset-neutral-950/);
  assert.doesNotMatch(transactionsPageSource, /sticky top-0 z-10 bg-neutral-900\/80 text-neutral-300/);
  assert.doesNotMatch(transactionsPageSource, /divide-y divide-neutral-900\/80/);
  assert.doesNotMatch(transactionsPageSource, /border-neutral-700 bg-neutral-900 text-emerald-400 focus:ring-emerald-400/);
});

test("transaction table skeletons use semantic surface tokens", () => {
  assert.match(transactionsPageSource, /TRANSACTION_TABLE_SKELETON_ROW_CLASS/);
  assert.match(transactionsPageSource, /TRANSACTION_TABLE_SKELETON_LINE_CLASS/);
  assert.match(transactionsPageSource, /TRANSACTION_TABLE_SKELETON_PILL_CLASS/);
  assert.match(transactionsPageSource, /bg-surface-field/);

  assert.doesNotMatch(transactionsPageSource, /rounded(?:-xl)? bg-neutral-800/);
});

test("transaction row and pagination actions use semantic button tokens", () => {
  assert.match(transactionsPageSource, /TRANSACTION_ROW_ACTION_BUTTON_CLASS/);
  assert.match(transactionsPageSource, /TRANSACTION_ROW_CANCEL_BUTTON_CLASS/);
  assert.match(transactionsPageSource, /TRANSACTION_PAGINATION_BAR_CLASS/);
  assert.match(transactionsPageSource, /TRANSACTION_PAGINATION_BUTTON_CLASS/);

  assert.doesNotMatch(transactionsPageSource, /rounded-xl border border-neutral-700 bg-neutral-900 px-2\.5 py-1\.5/);
  assert.doesNotMatch(transactionsPageSource, /rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-1/);
  assert.doesNotMatch(transactionsPageSource, /border-t border-neutral-900 bg-neutral-900\/40/);
  assert.doesNotMatch(transactionsPageSource, /rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1/);
});

test("transaction row content uses semantic text and badge tokens", () => {
  assert.match(transactionsPageSource, /TRANSACTION_ROW_CLASS/);
  assert.match(transactionsPageSource, /TRANSACTION_ROW_PRIMARY_TEXT_CLASS/);
  assert.match(transactionsPageSource, /TRANSACTION_ROW_METADATA_CHIP_CLASS/);
  assert.match(transactionsPageSource, /TRANSACTION_ROW_CATEGORY_BADGE_CLASS/);
  assert.match(transactionsPageSource, /TRANSACTION_RECURRING_BADGE_CLASS/);

  assert.doesNotMatch(transactionsPageSource, /align-top transition hover:bg-neutral-900\/30/);
  assert.doesNotMatch(transactionsPageSource, /hidden px-5 py-5 text-neutral-300 lg:table-cell/);
  assert.doesNotMatch(transactionsPageSource, /rounded-full border border-neutral-800 px-2 py-1/);
  assert.doesNotMatch(transactionsPageSource, /border border-neutral-800 bg-neutral-900\/90 px-3 py-2/);
  assert.doesNotMatch(transactionsPageSource, /txn\.direction === "inflow" \? "text-emerald-400"/);
  assert.doesNotMatch(transactionsPageSource, /bg-emerald-500\/10 px-2 py-0\.5 text-xs text-emerald-300/);
});

test("transaction empty state uses semantic copy and action tokens", () => {
  assert.match(transactionsPageSource, /TRANSACTION_EMPTY_TITLE_CLASS/);
  assert.match(transactionsPageSource, /TRANSACTION_EMPTY_COPY_CLASS/);
  assert.match(transactionsPageSource, /TRANSACTION_EMPTY_ACTION_CLASS/);
  assert.match(transactionsPageSource, /focus-visible:ring-focus-ring/);

  assert.doesNotMatch(transactionsPageSource, /text-neutral-300 font-medium/);
  assert.doesNotMatch(transactionsPageSource, /mt-2 text-sm text-neutral-500/);
  assert.doesNotMatch(transactionsPageSource, /mt-3 text-sm text-emerald-400 transition hover:text-emerald-300/);
});

test("transaction bulk actions use semantic dropdown and action tokens", () => {
  assert.match(transactionsPageSource, /TRANSACTION_BULK_ACTION_BUTTON_CLASS/);
  assert.match(transactionsPageSource, /TRANSACTION_BULK_DROPDOWN_PANEL_CLASS/);
  assert.match(transactionsPageSource, /TRANSACTION_BULK_APPLY_BUTTON_CLASS/);
  assert.match(transactionsPageSource, /TRANSACTION_BULK_REVIEW_OPTION_CLASS/);

  assert.doesNotMatch(transactionsPageSource, /rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2/);
  assert.doesNotMatch(transactionsPageSource, /border border-emerald-600\/40 bg-emerald-500\/10/);
  assert.doesNotMatch(transactionsPageSource, /block w-full rounded-md px-3 py-2 text-left text-sm text-neutral-200 hover:bg-neutral-800/);
});

test("transaction dialogs use semantic overlay and panel tokens", () => {
  assert.match(transactionsPageSource, /TRANSACTION_DIALOG_BACKDROP_CLASS/);
  assert.match(transactionsPageSource, /TRANSACTION_DIALOG_PANEL_CLASS/);
  assert.match(transactionsPageSource, /TRANSACTION_PRIMARY_ACTION_BUTTON_CLASS/);
  assert.match(transactionsPageSource, /shadow-dialog/);
  assert.match(transactionsPageSource, /text-text-primary/);

  assert.doesNotMatch(transactionsPageSource, /fixed inset-0 z-50 flex items-start justify-center bg-neutral-950\/80/);
  assert.doesNotMatch(transactionsPageSource, /shadow-\[0_30px_120px_rgba/);
});

test("transaction inline editor uses semantic surface and action tokens", () => {
  assert.match(transactionsPageSource, /TRANSACTION_INLINE_EDITOR_CELL_CLASS/);
  assert.match(transactionsPageSource, /TRANSACTION_SECONDARY_ACTION_BUTTON_CLASS/);
  assert.match(transactionsPageSource, /bg-surface-panel\/70/);

  assert.doesNotMatch(transactionsPageSource, /bg-neutral-950\/70 px-5 py-5/);
  assert.doesNotMatch(transactionsPageSource, /rounded-xl bg-emerald-500 px-4 py-2/);
});

test("emoji picker uses semantic tokens instead of hard-coded dark palettes", () => {
  assert.match(emojiPickerSource, /bg-surface-panel/);
  assert.match(emojiPickerSource, /bg-surface-field/);
  assert.match(emojiPickerSource, /border-border-subtle/);
  assert.match(emojiPickerSource, /text-text-secondary/);

  assert.doesNotMatch(emojiPickerSource, /neutral-\d/);
  assert.doesNotMatch(emojiPickerSource, /emerald-\d/);
});

test("assistant conversation uses semantic tokens instead of hard-coded dark palettes", () => {
  assert.match(assistantConversationSource, /bg-surface-panel/);
  assert.match(assistantConversationSource, /bg-surface-field/);
  assert.match(assistantConversationSource, /border-border-subtle/);
  assert.match(assistantConversationSource, /text-text-secondary/);
  assert.match(assistantConversationSource, /border-danger/);

  assert.doesNotMatch(assistantConversationSource, /neutral-\d/);
  assert.doesNotMatch(assistantConversationSource, /emerald-\d/);
  assert.doesNotMatch(assistantConversationSource, /rose-\d/);
});
