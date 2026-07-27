import { expect, test } from "@playwright/test";
import { loginWithSeedAccount, openNewTransactionDialog, openShellView } from "./helpers.ts";

test("@core transactions remains usable on narrow screens", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loginWithSeedAccount(page);
  await page.goto("/transactions?range=all");
  await expect(page.getByTestId("transactions-page")).toBeVisible();

  await expect(page.getByTestId("txn-create-open")).toBeVisible();
  await expect(page.getByTestId("txn-select-all-visible")).toBeVisible();

  const dialog = await openShellView(page);
  await expect(dialog.getByTestId("transactions-advanced-filters")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);

  const canScrollHorizontally = await page.getByTestId("txn-table-scroll").evaluate((node) => {
    return node.scrollWidth > node.clientWidth;
  });

  await expect(page.getByTestId("txn-table-scroll")).toHaveCSS("overflow-x", "auto");
  expect(canScrollHorizontally).toBe(true);
});

test("@core transactions advanced filters restore focus on escape", async ({ page }) => {
  await loginWithSeedAccount(page);
  await page.goto("/transactions");

  const trigger = page.getByTestId("shell-view-toggle");
  await trigger.click();

  const dialog = page.getByTestId("shell-view-dialog");
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