import { expect, test } from "@playwright/test";
import { loginWithSeedAccount, openNewTransactionDialog } from "./helpers.ts";

test("@core transactions remains usable on narrow screens", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loginWithSeedAccount(page);
  await page.goto("/transactions");
  await expect(page.getByTestId("transactions-page")).toBeVisible();

  await expect(page.getByTestId("txn-create-open")).toBeVisible();
  await expect(page.getByTestId("txn-command-bar")).toBeVisible();
  await expect(page.getByTestId("txn-select-all-visible")).toBeVisible();

  await expect(page.getByTestId("txn-range")).toHaveValue("90d");
  await page.getByTestId("txn-range").selectOption("custom");
  await expect(page.getByTestId("txn-range")).toHaveValue("custom");
  await page.getByTestId("txn-open-advanced-filters").click();
  await expect(page.getByTestId("txn-advanced-filters")).toBeVisible();
  await expect(page.getByTestId("txn-custom-date-row")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("txn-advanced-filters")).toHaveCount(0);
  await page.getByTestId("txn-range").selectOption("90d");
  await expect(page.getByTestId("txn-range")).toHaveValue("90d");

  const overflowsHorizontally = await page.getByTestId("txn-table-scroll").evaluate((node) => {
    return node.scrollWidth > node.clientWidth;
  });

  expect(overflowsHorizontally).toBe(false);
});

test("@core transactions advanced filters restore focus on escape", async ({ page }) => {
  await loginWithSeedAccount(page);
  await page.goto("/transactions");

  const trigger = page.getByTestId("txn-open-advanced-filters");
  await trigger.click();

  const dialog = page.getByTestId("txn-advanced-filters");
  await expect(dialog).toBeVisible();
  await expect(dialog).toBeFocused();

  await page.keyboard.press("Escape");

  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("manual transaction category and account selects keep compact desktop sizing", async ({ page }) => {
  await page.setViewportSize({ width: 1517, height: 1128 });
  await loginWithSeedAccount(page);

  await openNewTransactionDialog(page);

  await expect(page.locator("#txn-create-category")).toHaveCSS("width", "205px");
  await expect(page.locator("#txn-create-category")).toHaveCSS("height", "38px");
  await expect(page.locator("#txn-create-account")).toHaveCSS("width", "205px");
  await expect(page.locator("#txn-create-account")).toHaveCSS("height", "38px");
});
