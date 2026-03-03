import { test, expect } from "@playwright/test";
import { getLocalDateYmd, gotoView, loginWithSeedAccount } from "./helpers.mjs";

test("@core transactions clears stale category filter when switching category view", async ({ page }) => {
  await loginWithSeedAccount(page);
  await gotoView(page, "transactions");

  const merchant = `PW View Switch ${Date.now()}`;
  const form = page.getByTestId("txn-form");

  await form.locator('input[name="transaction_date"]').fill(getLocalDateYmd());
  await form.locator('input[name="description"]').fill(`${merchant} description`);
  await form.locator('input[name="merchant_raw"]').fill(merchant);
  await form.locator('input[name="amount"]').fill("19.25");
  await form.locator('select[name="direction"]').selectOption("debit");
  await form.locator('select[name="category_final"]').selectOption("Dining");
  await form.locator('input[name="account_name"]').fill("Playwright Account");
  await form.locator('button[type="submit"]').click();

  const createdRow = page.locator('[data-testid="txn-table"] tr', { hasText: merchant });
  await expect.poll(async () => await createdRow.count()).toBe(1);

  await page.getByTestId("txn-category-filter").selectOption("Dining");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(createdRow).toBeVisible();

  await page.getByTestId("txn-category-view").selectOption("coarse");
  await expect(page.getByTestId("txn-category-view")).toHaveValue("coarse");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/category_view=coarse/);
  expect(page.url()).not.toContain("category=Dining");
  await expect(page.getByTestId("txn-category-filter")).toHaveValue("");
  await expect(createdRow).toBeVisible();
});
