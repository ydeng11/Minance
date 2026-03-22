import { test, expect } from "@playwright/test";
import {
  applyTransactionsFilters,
  createManualTransaction,
  gotoView,
  loginWithSeedAccount,
  openTransactionsAdvancedFilters
} from "./helpers.ts";

test("@core transactions clears stale category filter when switching category view", async ({ page }) => {
  await loginWithSeedAccount(page);
  await gotoView(page, "transactions");

  const merchant = `PW View Switch ${Date.now()}`;
  await createManualTransaction(page, {
    merchant,
    amount: "19.25"
  });

  const createdRow = page.locator('[data-testid="txn-table"] tr', { hasText: merchant });
  await expect.poll(async () => await createdRow.count()).toBe(1);

  await openTransactionsAdvancedFilters(page);
  await page.getByTestId("txn-category-filter-trigger").click();
  await page.getByRole("option", { name: "Dining", exact: true }).click();
  await applyTransactionsFilters(page);
  await expect(createdRow).toBeVisible();

  await openTransactionsAdvancedFilters(page);
  await page.getByTestId("txn-category-view").selectOption("coarse");
  await expect(page.getByTestId("txn-category-view")).toHaveValue("coarse");
  await expect(page.getByTestId("txn-category-filter-trigger")).toContainText("All categories");
  await applyTransactionsFilters(page);
  await expect(page).toHaveURL(/category_view=coarse/);
  expect(page.url()).not.toContain("category=Dining");
  await expect(page.getByTestId("txn-active-filters")).not.toContainText("Categories:");
  await expect(page.getByTestId("txn-active-filters")).toContainText("View: Coarse");
  await expect(createdRow).toBeVisible();
});
