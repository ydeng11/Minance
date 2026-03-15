import { test, expect } from "@playwright/test";
import {
  analyticsHeatmapCells,
  explorerWeekdaySummaryCells,
  gotoView,
  loginWithSeedAccount,
  uploadAndCommitFixtureCsv
} from "./helpers.ts";

test("explorer advanced filters omit review status controls", async ({ page }) => {
  await loginWithSeedAccount(page);
  await uploadAndCommitFixtureCsv(page);
  await gotoView(page, "explorer");

  await expect(page.getByTestId("explorer-command-bar")).toBeVisible();
  await expect(page.getByTestId("explorer-summary-band")).toBeVisible();
  await expect(page.getByTestId("explorer-perspective-tabs")).toBeVisible();
  await expect(page.getByTestId("explorer-filter-rail")).toHaveCount(0);

  await page.getByTestId("explorer-open-advanced-filters").click();
  await expect(page.getByTestId("explorer-advanced-filters")).toBeVisible();
  await expect(page.getByText("Review status")).toHaveCount(0);
  await expect(page.getByTestId("explorer-advanced-filter-review")).toHaveCount(0);
  await expect(page.getByTestId("explorer-active-filters")).not.toContainText("Reviewed");
  await expect(page.getByTestId("explorer-active-filters")).not.toContainText("Needs Review");
});

test("overview perspective uses a full-width trend chart with the active range label", async ({ page }) => {
  await loginWithSeedAccount(page);
  await uploadAndCommitFixtureCsv(page);
  await page.goto("/explorer?range=365d");

  await expect(page.getByTestId("explorer-overview-trend")).toBeVisible();
  await expect(page.getByTestId("explorer-comparison-panel")).toHaveCount(0);
  await expect(page.getByTestId("explorer-overview-trend")).toContainText("Last 12 months");
  await expect(page.getByTestId("explorer-overview-trend")).not.toContainText("Last 6 months");
  await expect(page.getByTestId("analytics-category-bars")).toBeVisible();
  await expect(page.getByTestId("analytics-merchant-bars")).toBeVisible();
  await expect(page.getByTestId("explorer-weekday-summary")).toBeVisible();
  await expect(page.getByTestId("analytics-anomalies")).toBeVisible();
});

test("spending trend inspects a month before filtering explorer", async ({ page }) => {
  await loginWithSeedAccount(page);
  await uploadAndCommitFixtureCsv(page);
  await page.goto("/explorer?range=365d");

  const trend = page.getByTestId("explorer-overview-trend");
  await expect(trend).toBeVisible();
  await expect(page.getByTestId("explorer-trend-detail")).toContainText("Spend composition");
  await expect(page.getByTestId("explorer-trend-detail")).toContainText("Income composition");

  await page.getByTestId("explorer-trend-month-2026-02").click();
  await expect(page).toHaveURL(/\/explorer\?range=365d$/);

  await page.getByTestId("explorer-trend-apply-month").click();
  await expect(page).toHaveURL(/start=2026-02-01/);
  await expect(page).toHaveURL(/end=2026-02-28/);
});

test("summary cards separate selected-range totals from recent seven-day context", async ({ page }) => {
  await loginWithSeedAccount(page);
  await uploadAndCommitFixtureCsv(page);
  await page.goto("/explorer?range=365d");

  const summary = page.getByTestId("explorer-summary-band");
  await expect(summary).toBeVisible();
  await expect(summary).toContainText("Last 7 days");
  await expect(summary).toContainText("within current filters");
  await expect(summary).not.toContainText("Recent 7-day trend");
  await expect(page.getByTestId("explorer-summary-sparkline-net")).toBeVisible();
});

test("overview uses a fixed weekday spend summary across date ranges", async ({ page }) => {
  await loginWithSeedAccount(page);
  await uploadAndCommitFixtureCsv(page);

  await page.goto("/explorer?range=365d");

  await expect(page.getByTestId("explorer-weekday-summary")).toBeVisible();
  await expect(page.getByTestId("explorer-weekday-summary")).toContainText("Sun");
  await expect(page.getByTestId("explorer-weekday-summary")).toContainText("Sat");
  await expect(explorerWeekdaySummaryCells(page)).toHaveCount(7);
  await expect(page.getByTestId("analytics-heatmap")).toHaveCount(0);
});

test("spending heatmap uses weekday headers and a legend instead of weekday indexes", async ({ page }) => {
  await loginWithSeedAccount(page);
  await uploadAndCommitFixtureCsv(page);
  await gotoView(page, "explorer");

  await expect(page.getByTestId("analytics-heatmap-weekdays")).toContainText("Sun");
  await expect(page.getByTestId("analytics-heatmap-weekdays")).toContainText("Sat");
  await expect(page.getByTestId("analytics-heatmap-legend")).toContainText("Low");
  await expect(page.getByTestId("analytics-heatmap-legend")).toContainText("High");
  await expect(analyticsHeatmapCells(page).first()).toHaveText("");
});

test("merchant and anomaly cards use polished presentation", async ({ page }) => {
  await loginWithSeedAccount(page);
  await uploadAndCommitFixtureCsv(page);
  await gotoView(page, "explorer");

  const merchants = page.getByTestId("analytics-merchant-bars");
  await expect(merchants).toBeVisible();
  const merchantCards = merchants.locator("button");
  await expect(merchantCards.first()).toBeVisible();
  await expect(merchantCards.first()).toContainText(/#1/i);
  await expect(merchantCards.first()).toContainText(/\$\d/);
  await expect(page.getByTestId("analytics-merchant-caption").first()).toBeVisible();

  const anomalies = page.getByTestId("analytics-anomalies");
  await expect(anomalies).toBeVisible();
  const anomalyCards = page.getByTestId("analytics-anomaly-card");
  if ((await anomalyCards.count()) > 0) {
    await expect(anomalyCards.first()).toBeVisible();
    await expect(anomalyCards.first()).toContainText(/Amount outlier|New merchant spike/);
  } else {
    await expect(anomalies).toContainText("Spending looks stable");
  }
});

test("category perspective keeps filters and renders scoped category insights", async ({ page }) => {
  await loginWithSeedAccount(page);
  await uploadAndCommitFixtureCsv(page);
  await gotoView(page, "explorer");

  await page.getByTestId("explorer-perspective-category").click();

  await expect(page.getByTestId("explorer-category-view")).toBeVisible();
  await expect(page.getByTestId("explorer-category-trend")).toBeVisible();
  await expect(page.getByTestId("explorer-category-merchants")).toBeVisible();
});

test("category lens shows richer inspection details", async ({ page }) => {
  await loginWithSeedAccount(page);
  await uploadAndCommitFixtureCsv(page);
  await gotoView(page, "explorer");

  await page.getByTestId("explorer-perspective-category").click();

  const lens = page.getByTestId("explorer-category-lens");
  await expect(lens).toBeVisible();
  await expect(lens).toContainText("Spend");
  await expect(lens).toContainText("Income");

  await lens.getByRole("button").first().click();

  await expect(page.getByTestId("explorer-category-lens-detail")).toContainText("Net");
  await expect(page.getByTestId("explorer-category-lens-detail")).toContainText("Transactions");
  await expect(page.getByTestId("analytics-category-bars")).toBeVisible();
});

test("account perspective renders account analytics and saved views restore it", async ({ page }) => {
  await loginWithSeedAccount(page);
  await uploadAndCommitFixtureCsv(page);
  await gotoView(page, "explorer");

  await page.getByTestId("explorer-perspective-account").click();
  await expect(page.getByTestId("explorer-account-view")).toBeVisible();
  await expect(page.getByTestId("explorer-account-rankings")).toBeVisible();

  await page.getByTestId("saved-view-name").fill("Credit card lens");
  await page.getByTestId("save-view-button").click();
  await page.getByRole("button", { name: "Apply" }).first().click();

  await expect(page.getByTestId("explorer-account-view")).toBeVisible();
});

test("category and account drill-down expand the explorer workspace in place", async ({ page }) => {
  await loginWithSeedAccount(page);
  await uploadAndCommitFixtureCsv(page);
  await gotoView(page, "explorer");

  await page.getByTestId("analytics-category-bars").getByRole("button").first().click();
  await expect(page).toHaveURL(/\/explorer/);
  await expect(page.getByTestId("explorer-active-filters")).toContainText(/groceries|dining|transport/i);

  await page.getByTestId("explorer-perspective-account").click();
  await page.getByTestId("explorer-account-rankings").getByRole("button").first().click();
  await expect(page).toHaveURL(/\/explorer/);
  await expect(page.getByTestId("explorer-account-view")).toContainText(/focused on/i);

  await page.getByTestId("explorer-open-transactions").click();
  await expect(page).toHaveURL(/\/transactions\?/);
  await expect(page.getByTestId("transactions-page")).toBeVisible();
});
