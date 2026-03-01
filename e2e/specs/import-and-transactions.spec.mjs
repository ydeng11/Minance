import { test, expect } from "@playwright/test";
import {
  getLocalDateYmd,
  loginWithSeedAccount,
  searchTransactions,
  uploadAndCommitFixtureCsv
} from "./helpers.mjs";

test("@core upload CSV then create/edit/delete a manual transaction", async ({ page }) => {
  await loginWithSeedAccount(page);
  await uploadAndCommitFixtureCsv(page);

  await searchTransactions(page, "Coffee Shop");
  await expect(page.locator('[data-testid="txn-table"] tr', { hasText: "Coffee Shop" }).first()).toBeVisible();

  const manualMerchant = `PW Manual ${Date.now()}`;
  const form = page.getByTestId("txn-form");
  const today = getLocalDateYmd();

  await form.locator('input[name="transaction_date"]').fill(today);
  await form.locator('input[name="description"]').fill(`${manualMerchant} description`);
  await form.locator('input[name="merchant_raw"]').fill(manualMerchant);
  await form.locator('input[name="amount"]').fill("42.50");
  await form.locator('select[name="direction"]').selectOption("debit");
  await form.locator('select[name="category_final"]').selectOption("Dining");
  await form.locator('input[name="account_name"]').fill("Playwright Account");
  await form.locator('input[name="memo"]').fill("Created by E2E");
  await form.locator('button[type="submit"]').click();
  await searchTransactions(page, manualMerchant);
  const manualRow = page.locator('[data-testid="txn-table"] tr', { hasText: manualMerchant });
  await expect.poll(async () => await manualRow.count()).toBe(1);

  const editButton = manualRow.locator('button', { hasText: 'Edit' }).first();
  await editButton.click();
  await form.locator('input[name="amount"]').fill("55.75");
  await form.locator('input[name="description"]').fill(`${manualMerchant} updated`);
  await form.locator('button[type="submit"]').click();
  await searchTransactions(page, manualMerchant);
  const updatedRow = page.locator('[data-testid="txn-table"] tr', { hasText: manualMerchant });
  await expect.poll(async () => await updatedRow.count()).toBe(1);
  await expect(updatedRow).toContainText("$55.75");

  await updatedRow.locator('button', { hasText: 'Delete' }).click();
  await searchTransactions(page, manualMerchant);
  await expect.poll(async () => await page.locator('[data-testid="txn-table"] tr', { hasText: manualMerchant }).count()).toBe(0);
});
