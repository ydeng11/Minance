import { expect, test } from "@playwright/test";
import { loginWithSeedAccount } from "./helpers.ts";

test("@core transactions remains usable on narrow screens", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loginWithSeedAccount(page);
  await page.goto("/transactions");
  await expect(page.getByTestId("transactions-page")).toBeVisible();

  await expect(page.getByTestId("txn-create-open")).toBeVisible();
  await expect(page.getByTestId("txn-filter-primary-row")).toBeVisible();
  await expect(page.getByTestId("txn-filter-secondary-row")).toBeVisible();
  await expect(page.getByTestId("txn-select-all-visible")).toBeVisible();

  await page.getByTestId("txn-range").selectOption("custom");
  await expect(page.getByTestId("txn-custom-date-row")).toBeVisible();

  const overflowsHorizontally = await page.getByTestId("txn-table-scroll").evaluate((node) => {
    return node.scrollWidth > node.clientWidth;
  });

  expect(overflowsHorizontally).toBe(true);
});
