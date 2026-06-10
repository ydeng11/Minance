import { test, expect } from "@playwright/test";
import assert from "node:assert/strict";
import {
  applyTransactionsFilters,
  createManualTransaction,
  loginWithSeedAccount,
  openTransactionsAdvancedFilters
} from "./helpers.ts";

test("@core transactions header controls route into the ledger, create from the top, and filter by amount bar", async ({
  page
}) => {
  await loginWithSeedAccount(page);

  await page.goto("/");
  await page.getByTestId("dashboard-open-transactions").click();
  await expect(page).toHaveURL(/\/transactions(\?|$)/);
  await expect(page.getByTestId("transactions-page")).toBeVisible();

  const olderMerchant = `PW Range Older ${Date.now()}`;
  await createManualTransaction(page, {
    merchant: olderMerchant,
    amount: "18.25",
    memo: "Older range row"
  });

  const newerMerchant = `PW Range Newer ${Date.now()}`;
  await createManualTransaction(page, {
    merchant: newerMerchant,
    amount: "77.25",
    memo: "Newer range row"
  });

  const firstLedgerRow = page.locator('[data-testid="txn-table"] tbody > tr').first();
  await expect(firstLedgerRow).toContainText(newerMerchant);
  await expect(firstLedgerRow).not.toContainText("💳");
  await expect(page.getByTestId("txn-ledger-shell")).toBeVisible();
  await expect(page.getByTestId("txn-table-scroll")).toBeVisible();
  await expect(page.getByTestId("txn-select-all-visible")).toBeVisible();

  await openTransactionsAdvancedFilters(page);
  await expect(page.getByTestId("transactions-amount-range-amount-range-control")).toBeVisible();
  const minAmountRange = page.getByTestId("transactions-amount-range-min-amount-range");
  const minAmountRangeBox = await minAmountRange.boundingBox();
  assert(minAmountRangeBox, "Expected the minimum amount slider to be measurable");
  const initialMinimumAmount = Number(await minAmountRange.inputValue());

  await page.mouse.move(minAmountRangeBox.x + 2, minAmountRangeBox.y + minAmountRangeBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(minAmountRangeBox.x + minAmountRangeBox.width * 0.45, minAmountRangeBox.y + minAmountRangeBox.height / 2);
  await page.mouse.up();

  await expect.poll(async () => Number(await minAmountRange.inputValue())).toBeGreaterThan(initialMinimumAmount);

  await page.getByPlaceholder(/Min \(\$/).fill("70");
  await applyTransactionsFilters(page);
  await expect(page).toHaveURL(/min_amount=70/);

  const newerRow = page.locator('[data-testid="txn-table"] tr', { hasText: newerMerchant });
  const olderRow = page.locator('[data-testid="txn-table"] tr', { hasText: olderMerchant });
  await expect(newerRow).toBeVisible();
  await expect(newerRow).toContainText("Dining");
  await expect(newerRow).toContainText("-$77.25");
  await expect(newerRow.getByRole("button", { name: "Edit" })).toBeVisible();
  await expect(newerRow.getByRole("button", { name: "Delete" })).toBeVisible();
  await newerRow.getByRole("button", { name: "Edit" }).click();
  await expect(page.locator('[data-testid^="txn-inline-form-"]')).toBeVisible();
  await page.locator('[data-testid^="txn-inline-cancel-"]').click();
  await expect(page.locator('[data-testid^="txn-inline-form-"]')).toHaveCount(0);
  await expect(olderRow).toHaveCount(0);
});

test("transactions rows show only the transaction date and hide source and review labels", async ({ page }) => {
  await loginWithSeedAccount(page);

  const merchant = `PW Minimal Row ${Date.now()}`;
  const transactionDate = "2026-02-14";
  await createManualTransaction(page, {
    merchant,
    transactionDate,
    amount: "19.75"
  });

  const row = page.locator('[data-testid="txn-table"] tr', { hasText: merchant }).first();
  const rowCells = row.locator("td");
  const dateCell = rowCells.nth(1);
  const detailsCell = rowCells.nth(2);
  const categoryCell = rowCells.nth(3);

  await expect(row).toBeVisible();
  await expect(dateCell).toHaveText(transactionDate);
  await expect(detailsCell).not.toContainText("manual");
  await expect(categoryCell).not.toContainText("Reviewed");
});
