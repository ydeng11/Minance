import { test, expect } from "@playwright/test";
import {
  gotoView,
  loginWithSeedAccount,
  uploadAndCommitFixtureCsv
} from "./helpers.ts";

test("explorer shows summary metrics, perspective tabs, and a desktop filter rail", async ({ page }) => {
  await loginWithSeedAccount(page);
  await uploadAndCommitFixtureCsv(page);
  await gotoView(page, "explorer");

  await expect(page.getByTestId("explorer-summary-band")).toBeVisible();
  await expect(page.getByTestId("explorer-perspective-tabs")).toBeVisible();
  await expect(page.getByTestId("explorer-filter-rail")).toBeVisible();
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

test("explorer drill-down opens Transactions with preserved filters", async ({ page }) => {
  await loginWithSeedAccount(page);
  await uploadAndCommitFixtureCsv(page);
  await gotoView(page, "explorer");

  await page.getByTestId("explorer-perspective-account").click();
  await page.getByTestId("explorer-account-rankings").getByRole("button").first().click();

  await expect(page).toHaveURL(/\/transactions\?/);
  await expect(page.getByTestId("transactions-page")).toBeVisible();
});
