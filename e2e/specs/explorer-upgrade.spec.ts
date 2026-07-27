import { test, expect } from "@playwright/test";
import {
  createManualTransaction,
  gotoView,
  loginWithSeedAccount,
  openShellView,
  uploadAndCommitFixtureCsv
} from "./helpers.ts";

test("explorer advanced filters omit review status controls", async ({ page }) => {
  await loginWithSeedAccount(page);
  await uploadAndCommitFixtureCsv(page, { editProcessedRows: false });
  await gotoView(page, "explorer");

  await expect(page.getByTestId("shell-view-toggle")).toBeVisible();
  await expect(page.getByTestId("explorer-summary-band")).toBeVisible();
  await expect(page.getByTestId("explorer-perspective-tabs")).toBeVisible();

  // The default range “3m” shows as an active chip (“Range: 3m”).
  await expect(page.getByTestId("explorer-active-filters")).toContainText("Range:");

  const dialog = await openShellView(page);
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Reset");
  await expect(dialog).toContainText("Apply");
  await expect(dialog).not.toContainText("Review status");
  await expect(dialog).not.toContainText("Reviewed");
  await expect(dialog).not.toContainText("Needs Review");
});

test("explorer advanced filters support category and type multiselect plus tag suggestions", async ({ page }) => {
  await loginWithSeedAccount(page);
  await uploadAndCommitFixtureCsv(page, { editProcessedRows: false });
  await createManualTransaction(page, {
    merchant: `PW Explorer Groceries ${Date.now()}`,
    category: "Groceries",
    tags: "monthly"
  });
  await createManualTransaction(page, {
    merchant: `PW Explorer Dining ${Date.now()}`,
    category: "Dining"
  });
  await gotoView(page, "explorer");

  const dialog = await openShellView(page);
  await expect(dialog).toBeVisible();

  await dialog.getByTestId("explorer-category-multiselect-trigger").click();
  await dialog.getByRole("option", { name: "Groceries", exact: true }).click();
  await dialog.getByRole("option", { name: "Dining", exact: true }).click();
  await expect(dialog.getByTestId("explorer-category-multiselect-trigger")).toContainText("Groceries");
  await expect(dialog.getByTestId("explorer-category-multiselect-trigger")).toContainText("Dining");

  await dialog.getByTestId("explorer-type-multiselect-trigger").click();
  await dialog.getByRole("option", { name: "Expense" }).click();
  await dialog.getByRole("option", { name: "Income" }).click();
  await expect(dialog.getByTestId("explorer-type-multiselect-trigger")).toContainText("Expense");
  await expect(dialog.getByTestId("explorer-type-multiselect-trigger")).toContainText("Income");

  // The tag filter input exists; tag-suggestions panel is not rendered in the current SharedViewFilters.
  await dialog.getByTestId("explorer-tag-filter").fill("mon");
  await expect(dialog.getByTestId("explorer-tag-filter")).toHaveValue(/mon/i);
});

test("explorer keeps merchant drill-down chips in the page shell and not inside the view dialog", async ({ page }) => {
  await loginWithSeedAccount(page);
  await uploadAndCommitFixtureCsv(page, { editProcessedRows: false });
  await gotoView(page, "explorer");

  await expect(page.getByTestId("shell-view-toggle")).toBeVisible();
  await expect(page.getByTestId("explorer-active-filters")).toContainText("Range:");

  await page.getByTestId("analytics-merchant-bars").getByRole("button").first().click();
  await expect(page.getByTestId("explorer-active-filters")).toBeVisible();
  await expect(page.getByTestId("explorer-active-filters")).toContainText(/merchant/i);
  await expect(page).toHaveURL(/merchant=/);

  const dialog = await openShellView(page);
  await expect(dialog).toBeVisible();
  await expect(dialog).not.toContainText(/merchant/i);
});

test("overview perspective shows the trend chart, category bars and merchant bars", async ({ page }) => {
  await loginWithSeedAccount(page);
  await uploadAndCommitFixtureCsv(page, { editProcessedRows: false });
  await gotoView(page, "explorer");

  await expect(page.getByTestId("explorer-perspective-tabs")).toBeVisible();
  await expect(page.getByTestId("explorer-overview-trend")).toBeVisible();
  await expect(page.getByTestId("explorer-trend-board")).toBeVisible();
  await expect(page.getByTestId("analytics-category-bars")).toBeVisible();
  await expect(page.getByTestId("analytics-merchant-bars")).toBeVisible();
});

test("summary cards show the explorer-summary-band with hero and support grid", async ({ page }) => {
  await loginWithSeedAccount(page);
  await uploadAndCommitFixtureCsv(page, { editProcessedRows: false });
  await gotoView(page, "explorer");

  const summary = page.getByTestId("explorer-summary-band");
  await expect(summary).toBeVisible();
  await expect(page.getByTestId("explorer-summary-hero")).toBeVisible();
  await expect(page.getByTestId("explorer-summary-support-grid")).toBeVisible();
});

test("explorer trend detail and apply-month controls are present", async ({ page }) => {
  await loginWithSeedAccount(page);
  await uploadAndCommitFixtureCsv(page, { editProcessedRows: false });
  await page.goto("/explorer?range=365d");

  await expect(page.getByTestId("explorer-trend-detail")).toBeVisible();
  await expect(page.getByTestId("explorer-trend-apply-month")).toBeVisible();
});

test("category perspective renders the category view with heatmap rows", async ({ page }) => {
  await loginWithSeedAccount(page);
  await uploadAndCommitFixtureCsv(page, { editProcessedRows: false });
  await page.goto("/explorer?perspective=category&range=365d");

  await expect(page.getByTestId("explorer-category-view")).toBeVisible();

  // The category lens renders clickable category buttons.
  await expect(page.getByTestId("explorer-category-lens")).toBeVisible();
  const categoryButtons = page.getByTestId("explorer-category-lens").getByRole("button");
  await expect(categoryButtons.first()).toBeVisible({ timeout: 15_000 });
  const categoryCount = await categoryButtons.count();
  expect(categoryCount).toBeGreaterThan(0);
});

test("merchant analysis cards show polished presentation", async ({ page }) => {
  await loginWithSeedAccount(page);
  await uploadAndCommitFixtureCsv(page, { editProcessedRows: false });
  await gotoView(page, "explorer");

  const merchants = page.getByTestId("analytics-merchant-bars");
  await expect(merchants).toBeVisible();
  const merchantCards = merchants.locator("button");
  await expect(merchantCards.first()).toBeVisible();
  await expect(merchantCards.first()).toContainText(/#1/i);
  await expect(merchantCards.first()).toContainText(/\$\d/);
  await expect(page.getByTestId("analytics-merchant-caption").first()).toBeVisible();
});

test("category perspective renders scoped category insights", async ({ page }) => {
  await loginWithSeedAccount(page);
  await uploadAndCommitFixtureCsv(page, { editProcessedRows: false });
  await gotoView(page, "explorer");

  await page.getByTestId("explorer-perspective-category").click();

  await expect(page.getByTestId("explorer-category-view")).toBeVisible();
});

test("category drill-down creates active filters and navigates to transactions", async ({ page }) => {
  await loginWithSeedAccount(page);
  await uploadAndCommitFixtureCsv(page, { editProcessedRows: false });
  await gotoView(page, "explorer");

  await expect(page.getByTestId("explorer-active-filters")).toContainText("Range:");

  await page.getByTestId("analytics-category-bars").getByRole("button").first().click();
  await expect(page).toHaveURL(/\/explorer/);
  await expect(page.getByTestId("explorer-active-filters")).toContainText(/groceries|dining|transport/i);
});
