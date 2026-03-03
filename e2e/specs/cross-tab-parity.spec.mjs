import { test, expect } from "@playwright/test";
import { gotoView, loginWithSeedAccount, logout } from "./helpers.mjs";

test("@core cross-tab parity covers dashboard, transactions, accounts, categories, recurrings, and investments", async ({
  page
}) => {
  const suffix = Date.now();
  const accountName = `Parity Account ${suffix}`;
  const categoryName = `Parity Category ${suffix}`;
  const recurringName = `Parity Recurring ${suffix}`;

  await loginWithSeedAccount(page);

  await gotoView(page, "dashboard");
  await expect(page.getByTestId("dashboard-page")).toBeVisible();
  await expect(page.getByTestId("dashboard-kpis")).toBeVisible();

  await page.getByTestId("dashboard-range").selectOption("30d");
  await page.getByTestId("dashboard-kpi-spent").click();

  await expect(page.getByTestId("transactions-page")).toBeVisible();
  await expect(page).toHaveURL(/\/transactions\?/);
  await expect(page.getByTestId("txn-type-filter")).toHaveValue("expense");
  await expect(page.getByTestId("txn-table")).toBeVisible();

  await gotoView(page, "accounts");
  await page.getByTestId("accounts-add").click();
  await expect(page.getByTestId("accounts-wizard")).toBeVisible();
  await page.getByTestId("accounts-wizard-path-manual").click();
  await page.getByTestId("accounts-wizard-path-continue").click();
  await expect(page.getByTestId("accounts-wizard-manual-form")).toBeVisible();

  await page.getByTestId("accounts-wizard-manual-institution").fill("Parity Bank");
  await page.getByTestId("accounts-wizard-manual-name").fill(accountName);
  await page.getByTestId("accounts-wizard-manual-type").selectOption("checking");
  await page.getByTestId("accounts-wizard-manual-currency").fill("USD");
  await page.getByTestId("accounts-wizard-manual-balance").fill("123.45");
  await page.getByTestId("accounts-wizard-manual-save").click();

  await expect(page.getByTestId("global-message")).toContainText(`Account "${accountName}" added.`);
  await expect(page.locator('[data-testid^="account-row-"]', { hasText: accountName })).toHaveCount(1);

  await gotoView(page, "categories");
  await page.getByTestId("categories-add").click();
  await expect(page.getByTestId("category-modal")).toBeVisible();

  await page.getByTestId("category-form-name").fill(categoryName);
  await page.getByTestId("category-form-type").selectOption("expense");
  await page.getByTestId("category-form-save").click();

  await expect(page.getByTestId("global-message")).toContainText("Category created.");
  await expect(page.locator('[data-testid^="category-row-"]', { hasText: categoryName })).toHaveCount(1);

  await gotoView(page, "recurrings");
  await page.getByTestId("recurrings-create-name").fill(recurringName);
  await page.getByTestId("recurrings-create-cadence").selectOption("monthly");
  await page.getByTestId("recurrings-create-amount").fill("45.00");
  await page.getByTestId("recurrings-create-submit").click();

  await expect(page.getByTestId("global-message")).toContainText("Recurring rule created.");
  await expect(page.getByText(recurringName)).toBeVisible();
  await expect(page.getByTestId("recurrings-detail-panel")).toBeVisible();
  await page.getByTestId("recurrings-evaluate").click();
  await expect(page.getByTestId("global-message")).toContainText("Evaluation complete:");

  await gotoView(page, "investments");
  await expect(page.getByTestId("investments-page")).toBeVisible();
  await expect(page.getByTestId("investments-main-grid")).toBeVisible();
  await page.getByTestId("investments-positions-sort").selectOption("symbol_asc");
  await page.getByTestId("investments-sidebar-search").fill("VOO");
  await expect(page.getByTestId("investments-positions-panel")).toBeVisible();

  await logout(page);
});
