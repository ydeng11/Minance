import { test, expect } from "@playwright/test";
import {
  appApi,
  gotoView,
  loginWithSeedAccount,
  openTransactionsAdvancedFilters,
  applyTransactionsFilters
} from "./helpers.ts";

test("@core shared filter sync preserves transaction types from Explorer to Transactions", async ({ page }) => {
  await loginWithSeedAccount(page);

  const suffix = Date.now();
  const expenseCategory = `Sync Expense ${suffix}`;
  const incomeCategory = `Sync Income ${suffix}`;
  const transferCategory = `Sync Transfer ${suffix}`;
  const expenseMerchant = `Sync Expense Txn ${suffix}`;
  const incomeMerchant = `Sync Income Txn ${suffix}`;
  const transferMerchant = `Sync Transfer Txn ${suffix}`;

  await appApi(page, "/v1/categories", {
    method: "POST",
    body: { name: expenseCategory, emoji: "💸", type: "expense" }
  });
  await appApi(page, "/v1/categories", {
    method: "POST",
    body: { name: incomeCategory, emoji: "💰", type: "income" }
  });
  await appApi(page, "/v1/categories", {
    method: "POST",
    body: { name: transferCategory, emoji: "↔️", type: "transfer" }
  });

  await appApi(page, "/v1/transactions", {
    method: "POST",
    body: {
      transaction_date: "2026-03-01",
      description: expenseMerchant,
      merchant_raw: expenseMerchant,
      amount: -50.00,
      account_name: "Test Account",
      category_final: expenseCategory,
      transaction_type: "expense"
    }
  });
  await appApi(page, "/v1/transactions", {
    method: "POST",
    body: {
      transaction_date: "2026-03-01",
      description: incomeMerchant,
      merchant_raw: incomeMerchant,
      amount: 5000.00,
      account_name: "Test Account",
      category_final: incomeCategory,
      transaction_type: "income"
    }
  });
  await appApi(page, "/v1/transactions", {
    method: "POST",
    body: {
      transaction_date: "2026-03-01",
      description: transferMerchant,
      merchant_raw: transferMerchant,
      amount: -1000.00,
      account_name: "Test Account",
      category_final: transferCategory,
      transaction_type: "transfer"
    }
  });

  await gotoView(page, "explorer");
  await expect(page.getByTestId("explorer-page")).toBeVisible();

  const advancedFiltersButton = page.getByRole("button", { name: /advanced|filters/i }).first();
  await advancedFiltersButton.click();

  const typeFilterTrigger = page.getByTestId("explorer-type-filter-trigger");
  if (await typeFilterTrigger.isVisible()) {
    await typeFilterTrigger.click();
  } else {
    await page.getByRole("combobox", { name: /transaction type/i }).click();
  }

  await page.getByRole("option", { name: "Expense" }).click();
  await page.getByRole("option", { name: "Income" }).click();

  await page.getByRole("button", { name: /apply/i }).click();

  await expect.poll(() => new URL(page.url()).searchParams.getAll("type")).toEqual(["expense", "income"]);

  await gotoView(page, "transactions");

  await expect(page.getByTestId("txn-active-filters")).toContainText("Types: Expense, Income");

  await expect.poll(() => new URL(page.url()).searchParams.getAll("type")).toEqual(["expense", "income"]);

  await expect(page.getByTestId("txn-table")).toBeVisible();
  await expect(page.locator('[data-testid="txn-table"]')).toContainText(expenseMerchant);
  await expect(page.locator('[data-testid="txn-table"]')).toContainText(incomeMerchant);
  await expect(page.locator('[data-testid="txn-table"] tr', { hasText: transferMerchant })).toHaveCount(0);
});

test("@core shared filter sync handles empty transaction types correctly", async ({ page }) => {
  await loginWithSeedAccount(page);

  await page.evaluate(() => {
    window.sessionStorage.removeItem("minance:shared-filters");
  });

  await gotoView(page, "explorer");
  await expect(page.getByTestId("explorer-page")).toBeVisible();

  await gotoView(page, "transactions");
  await expect(page.getByTestId("txn-active-filters")).toContainText("All transactions in view");

  await expect(page.getByTestId("txn-table")).toBeVisible();
  const urlTypes = new URL(page.url()).searchParams.getAll("type");
  expect(urlTypes).toHaveLength(0);
});

test("@core shared filter sync respects URL params over shared filters", async ({ page }) => {
  await loginWithSeedAccount(page);

  await page.evaluate(() => {
    window.sessionStorage.setItem(
      "minance:shared-filters",
      JSON.stringify({
        transactionTypes: ["expense", "income"],
        range: "90d"
      })
    );
  });

  await page.goto("/transactions?type=transfer&range=30d");

  await expect.poll(() => new URL(page.url()).searchParams.getAll("type")).toEqual(["transfer"]);
  await expect.poll(() => new URL(page.url()).searchParams.get("range")).toBe("30d");

  await expect(page.getByTestId("txn-active-filters")).toContainText("Types: Transfer");
  await expect(page.getByTestId("txn-active-filters")).not.toContainText("Expense");
});

test("@core shared filter sync updates sessionStorage when filters change in Transactions", async ({ page }) => {
  await loginWithSeedAccount(page);

  await gotoView(page, "transactions");
  await page.evaluate(() => {
    window.sessionStorage.removeItem("minance:shared-filters");
  });

  await openTransactionsAdvancedFilters(page);
  await page.getByTestId("txn-type-filter-trigger").click();
  await page.getByRole("option", { name: "Expense" }).click();
  await page.getByRole("option", { name: "Income" }).click();
  await applyTransactionsFilters(page);

  const sharedFilters = await page.evaluate(() => {
    const raw = window.sessionStorage.getItem("minance:shared-filters");
    return raw ? JSON.parse(raw) : null;
  });

  expect(sharedFilters).toBeTruthy();
  expect(sharedFilters.transactionTypes).toEqual(["expense", "income"]);

  await gotoView(page, "explorer");
  await expect.poll(() => new URL(page.url()).searchParams.getAll("type")).toEqual(["expense", "income"]);
  await expect(page.getByTestId("explorer-active-filters")).toContainText("Types: Expense, Income");
});

test("@core shared filter sync prevents duplicate API calls on mount", async ({ page }) => {
  await loginWithSeedAccount(page);

  const apiCalls: Array<{ url: string; params: URLSearchParams }> = [];
  page.on("request", (request) => {
    if (request.url().includes("/v1/transactions")) {
      const url = new URL(request.url());
      apiCalls.push({
        url: request.url(),
        params: url.searchParams
      });
    }
  });

  await page.evaluate(() => {
    window.sessionStorage.setItem(
      "minance:shared-filters",
      JSON.stringify({
        transactionTypes: ["expense"],
        range: "90d"
      })
    );
  });

  await page.goto("/transactions");
  await expect(page.getByTestId("txn-table")).toBeVisible();

  await page.waitForTimeout(500);

  const transactionsCalls = apiCalls.filter(
    call => call.url.includes("/v1/transactions") && !call.url.includes("/overview")
  );
  expect(transactionsCalls.length).toBe(1);

  expect(transactionsCalls[0].params.getAll("type")).toEqual(["expense"]);
});