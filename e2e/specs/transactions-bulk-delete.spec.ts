import { expect, test } from "@playwright/test";
import {
  appApi,
  createManualTransaction,
  gotoView,
  loginWithSeedAccount,
  searchTransactions
} from "./helpers.ts";

async function findTransactionIdByMerchant(page, merchant) {
  const response = await appApi(page, `/v1/transactions?range=all&query=${encodeURIComponent(merchant)}`);
  const match = response?.items?.find((entry) => entry.merchant_raw === merchant);
  if (!match?.id) {
    throw new Error(`Could not find transaction for merchant: ${merchant}`);
  }
  return match.id;
}

async function selectTransactions(page, transactionIds) {
  for (const transactionId of transactionIds) {
    await page.getByTestId(`txn-select-row-${transactionId}`).check();
  }
}

test("@core transactions bulk delete removes selected visible rows", async ({ page }) => {
  await loginWithSeedAccount(page);
  await gotoView(page, "transactions");

  const first = await createManualTransaction(page, {
    merchant: `PW Bulk One ${Date.now()}`,
    amount: "11.25"
  });
  const second = await createManualTransaction(page, {
    merchant: `PW Bulk Two ${Date.now()}`,
    amount: "12.25"
  });

  const firstId = await findTransactionIdByMerchant(page, first.merchant);
  const secondId = await findTransactionIdByMerchant(page, second.merchant);
  const selectedIds = [firstId, secondId];

  await selectTransactions(page, selectedIds);
  await expect(page.getByTestId("txn-bulk-bar")).toContainText("2 selected");

  await page.getByTestId("txn-bulk-clear").click();
  await expect(page.getByTestId("txn-bulk-bar")).toHaveCount(0);

  await page.getByTestId("txn-select-all-visible").check();
  await expect(page.getByTestId("txn-bulk-bar")).toBeVisible();

  await searchTransactions(page, first.merchant);
  await expect(page.getByTestId("txn-bulk-bar")).toHaveCount(0);

  await page.getByTestId(`txn-select-row-${firstId}`).check();
  await gotoView(page, "transactions");
  await selectTransactions(page, selectedIds);
  await expect(page.getByTestId("txn-bulk-bar")).toContainText("2 selected");

  await page.getByTestId("txn-bulk-delete-open").click();
  await expect(page.getByTestId("txn-bulk-delete-dialog")).toContainText("Delete 2 transactions");
  await Promise.all([
    page.waitForResponse((response) => response.url().includes("/v1/transactions/bulk") && response.request().method() === "POST"),
    page.getByTestId("txn-bulk-delete-confirm").click()
  ]);

  await expect(page.getByText("2 transactions deleted.")).toBeVisible();
  await expect(page.locator('[data-testid="txn-table"] tr', { hasText: first.merchant })).toHaveCount(0);
  await expect(page.locator('[data-testid="txn-table"] tr', { hasText: second.merchant })).toHaveCount(0);
  await expect(page.getByTestId("txn-bulk-bar")).toHaveCount(0);
});
