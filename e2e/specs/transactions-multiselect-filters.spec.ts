import { test, expect } from "@playwright/test";
import { appApi, applyTransactionsFilters, gotoView, loginWithSeedAccount } from "./helpers.ts";

async function createCategory(page, name, type) {
  await appApi(page, "/v1/categories", {
    method: "POST",
    body: {
      name,
      emoji: "🍽️",
      type
    }
  });
}

async function createTransaction(page, {
  merchant,
  amount,
  accountName,
  category
}) {
  await appApi(page, "/v1/transactions", {
    method: "POST",
    body: {
      transaction_date: "2026-03-01",
      description: merchant,
      merchant_raw: merchant,
      amount,
      account_name: accountName,
      category_final: category
    }
  });
}

test("@core transactions multiselect filters use repeated params and AND across filter groups", async ({ page }) => {
  await loginWithSeedAccount(page);

  const suffix = Date.now();
  const diningCategory = `PW Dining ${suffix}`;
  const transferCategory = `PW Transfer ${suffix}`;
  const incomeCategory = `PW Income ${suffix}`;
  const primaryAccount = `PW Checking ${suffix}`;
  const travelAccount = `PW Travel ${suffix}`;
  const sideAccount = `PW Side ${suffix}`;
  const matchingExpenseMerchant = `PW Match Expense ${suffix}`;
  const matchingTransferMerchant = `PW Match Transfer ${suffix}`;
  const wrongAccountMerchant = `PW Wrong Account ${suffix}`;
  const wrongTypeMerchant = `PW Wrong Type ${suffix}`;

  await createCategory(page, diningCategory, "expense");
  await createCategory(page, transferCategory, "transfer");
  await createCategory(page, incomeCategory, "income");

  await createTransaction(page, {
    merchant: matchingExpenseMerchant,
    amount: -18.75,
    accountName: primaryAccount,
    category: diningCategory
  });
  await createTransaction(page, {
    merchant: matchingTransferMerchant,
    amount: -42.5,
    accountName: travelAccount,
    category: transferCategory
  });
  await createTransaction(page, {
    merchant: wrongAccountMerchant,
    amount: -13.2,
    accountName: sideAccount,
    category: diningCategory
  });
  await createTransaction(page, {
    merchant: wrongTypeMerchant,
    amount: 820,
    accountName: primaryAccount,
    category: incomeCategory
  });

  const accountsPayload = await appApi(page, "/v1/accounts");
  const accounts = Array.isArray(accountsPayload?.accounts) ? accountsPayload.accounts : [];
  const primaryAccountKey = accounts.find((entry) => entry?.displayName === primaryAccount)?.normalizedKey;
  const travelAccountKey = accounts.find((entry) => entry?.displayName === travelAccount)?.normalizedKey;
  expect(primaryAccountKey).toBeTruthy();
  expect(travelAccountKey).toBeTruthy();

  await gotoView(page, "transactions");

  await page.getByTestId("txn-category-filter-trigger").click();
  await page.getByTestId("txn-category-filter-search").fill(String(suffix));
  await page.getByRole("option", { name: diningCategory }).click();
  await page.getByRole("option", { name: transferCategory }).click();

  await page.getByTestId("txn-account-filter-trigger").click();
  await page.getByTestId("txn-account-filter-search").fill(String(suffix));
  await page.getByRole("option", { name: primaryAccount }).click();
  await page.getByRole("option", { name: travelAccount }).click();

  await page.getByTestId("txn-type-filter-trigger").click();
  await page.getByRole("option", { name: "Expense" }).click();
  await page.getByRole("option", { name: "Transfer" }).click();

  await applyTransactionsFilters(page);

  const params = new URL(page.url()).searchParams;
  expect(params.getAll("category")).toEqual([diningCategory, transferCategory]);
  expect(params.getAll("account")).toEqual([primaryAccountKey, travelAccountKey]);
  expect(params.getAll("type")).toEqual(["expense", "transfer"]);

  await expect(page.locator('[data-testid="txn-table"] tr', { hasText: matchingExpenseMerchant })).toBeVisible();
  await expect(page.locator('[data-testid="txn-table"] tr', { hasText: matchingTransferMerchant })).toBeVisible();
  await expect(page.locator('[data-testid="txn-table"] tr', { hasText: wrongAccountMerchant })).toHaveCount(0);
  await expect(page.locator('[data-testid="txn-table"] tr', { hasText: wrongTypeMerchant })).toHaveCount(0);
});
