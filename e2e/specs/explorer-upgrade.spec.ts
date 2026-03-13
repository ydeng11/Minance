import { test, expect } from "@playwright/test";
import {
  gotoView,
  loginWithSeedAccount,
  uploadAndCommitFixtureCsv
} from "./helpers.ts";

test("explorer uses a command bar and advanced filter popover on desktop", async ({ page }) => {
  await loginWithSeedAccount(page);
  await uploadAndCommitFixtureCsv(page);
  await gotoView(page, "explorer");

  await expect(page.getByTestId("explorer-command-bar")).toBeVisible();
  await expect(page.getByTestId("explorer-summary-band")).toBeVisible();
  await expect(page.getByTestId("explorer-perspective-tabs")).toBeVisible();
  await expect(page.getByTestId("explorer-filter-rail")).toHaveCount(0);

  await page.getByTestId("explorer-open-advanced-filters").click();
  await expect(page.getByTestId("explorer-advanced-filters")).toBeVisible();

  await page.getByTestId("explorer-advanced-filter-review").selectOption("reviewed");
  await page.getByTestId("explorer-advanced-filters-apply").click();

  await expect(page.getByTestId("explorer-active-filters")).toContainText("Reviewed");
});

test("overview perspective renders trend, comparison, categories, merchants, heatmap, and anomalies", async ({ page }) => {
  await loginWithSeedAccount(page);
  await uploadAndCommitFixtureCsv(page);
  await gotoView(page, "explorer");

  await expect(page.getByTestId("explorer-overview-trend")).toBeVisible();
  await expect(page.getByTestId("explorer-comparison-panel")).toBeVisible();
  await expect(page.getByTestId("analytics-category-bars")).toBeVisible();
  await expect(page.getByTestId("analytics-merchant-bars")).toBeVisible();
  await expect(page.getByTestId("analytics-heatmap")).toBeVisible();
  await expect(page.getByTestId("analytics-anomalies")).toBeVisible();
});

test("comparison-off hero cards show trend context instead of no-comparison copy", async ({ page }) => {
  await loginWithSeedAccount(page);
  await uploadAndCommitFixtureCsv(page);
  await page.goto("/explorer?range=365d");

  await expect(page.getByTestId("explorer-summary-band")).toBeVisible();
  await expect(page.getByTestId("explorer-summary-band")).not.toContainText("No comparison");
  await expect(page.getByTestId("explorer-comparison-panel")).not.toContainText("No delta");
  await expect(page.getByTestId("explorer-summary-sparkline-net")).toBeVisible();
});

test("merchant and anomaly cards use polished presentation", async ({ page }) => {
  await loginWithSeedAccount(page);
  await uploadAndCommitFixtureCsv(page);
  await gotoView(page, "explorer");

  const merchants = page.getByTestId("analytics-merchant-bars");
  await expect(merchants).toBeVisible();
  await expect(merchants).toContainText("Coffee Shop");
  await expect(page.getByTestId("analytics-merchant-caption").first()).toBeVisible();

  const anomalies = page.getByTestId("analytics-anomalies");
  await expect(anomalies).toBeVisible();
  await expect(anomalies).toContainText("Spending looks stable");
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
