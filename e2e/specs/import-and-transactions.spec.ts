import { test, expect } from "@playwright/test";
import {
  createManualTransaction,
  loginWithSeedAccount,
  searchTransactions,
  uploadAndCommitFixtureCsv
} from "./helpers.ts";

test("@core upload CSV then create/edit/delete a manual transaction", async ({ page }) => {
  await loginWithSeedAccount(page);
  await uploadAndCommitFixtureCsv(page);

  await searchTransactions(page, "Coffee Shop");
  await expect(page.locator('[data-testid="txn-table"] tr', { hasText: "Coffee Shop" }).first()).toBeVisible();

  const manualMerchant = `PW Manual ${Date.now()}`;
  await createManualTransaction(page, {
    merchant: manualMerchant,
    memo: "Created by E2E",
    tags: "coffee, monthly, coffee"
  });

  const firstLedgerRow = page.locator('[data-testid="txn-table"] tbody > tr').first();
  await expect(firstLedgerRow).toContainText(manualMerchant);
  await expect(firstLedgerRow).not.toContainText("💳");

  await searchTransactions(page, manualMerchant);
  const manualRow = page.locator('[data-testid="txn-table"] tr', { hasText: manualMerchant });
  await expect.poll(async () => await manualRow.count()).toBe(1);

  const editButton = manualRow.locator('button', { hasText: 'Edit' }).first();
  await editButton.click();
  const inlineForm = page.getByTestId(/txn-inline-form-/);
  await expect(inlineForm.getByTestId(/txn-inline-.*-tags/)).toHaveValue("coffee, monthly");
  await inlineForm.locator('input[name="amount"]').fill("55.75");
  await inlineForm.locator('input[name="description"]').fill(`${manualMerchant} updated`);
  await inlineForm.getByTestId(/txn-inline-.*-tags/).fill("coffee, updated");
  await inlineForm.locator('button[type="submit"]').click();
  await searchTransactions(page, manualMerchant);
  const updatedRow = page.locator('[data-testid="txn-table"] tr', { hasText: manualMerchant });
  await expect.poll(async () => await updatedRow.count()).toBe(1);
  await expect(updatedRow).toContainText("$55.75");

  await updatedRow.locator('button', { hasText: 'Edit' }).first().click();
  const reopenedInlineForm = page.getByTestId(/txn-inline-form-/);
  await expect(reopenedInlineForm.getByTestId(/txn-inline-.*-tags/)).toHaveValue("coffee, updated");
  await page.getByTestId(/txn-inline-cancel-/).click();

  await updatedRow.locator('button', { hasText: 'Delete' }).click();
  await searchTransactions(page, manualMerchant);
  await expect.poll(async () => await page.locator('[data-testid="txn-table"] tr', { hasText: manualMerchant }).count()).toBe(0);
});
