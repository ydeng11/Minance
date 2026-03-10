import { test, expect } from "@playwright/test";
import {
  applyTransactionsFilters,
  createManualTransaction,
  loginWithSeedAccount
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
    memo: "Newer range row",
    counterpartyEmoji: "🤝"
  });

  const firstLedgerRow = page.locator('[data-testid="txn-table"] tbody > tr').first();
  await expect(firstLedgerRow).toContainText(newerMerchant);
  await expect(firstLedgerRow).toContainText("🤝");

  await expect(page.getByTestId("txn-amount-filter")).toBeVisible();
  await page.getByPlaceholder(/Min \(\$/).fill("70");
  await applyTransactionsFilters(page);
  await expect(page).toHaveURL(/min_amount=70/);

  const newerRow = page.locator('[data-testid="txn-table"] tr', { hasText: newerMerchant });
  const olderRow = page.locator('[data-testid="txn-table"] tr', { hasText: olderMerchant });
  await expect(newerRow).toBeVisible();
  await expect(olderRow).toHaveCount(0);
});
