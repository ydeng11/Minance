import { test, expect } from "@playwright/test";
import { gotoView, loginWithSeedAccount, uploadAndCommitFixtureCsv } from "./helpers.ts";

test("shell view button appears on supported routes and opens the shell dialog", async ({ page }) => {
  await loginWithSeedAccount(page);
  await uploadAndCommitFixtureCsv(page);

  await gotoView(page, "explorer");
  await expect(page.getByTestId("shell-view-toggle")).toBeVisible();

  const headerButtonTestIds = await page.locator("header button").evaluateAll((buttons) =>
    buttons
      .map((button) => button.getAttribute("data-testid"))
      .filter((value): value is string => Boolean(value))
  );
  expect(headerButtonTestIds.indexOf("shell-view-toggle")).toBeLessThan(headerButtonTestIds.indexOf("assistant-toggle"));

  await page.getByTestId("shell-view-toggle").click();
  const dialog = page.getByTestId("shell-view-dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toBeFocused();
  await expect(dialog).toContainText("Reset");
  await expect(dialog).toContainText("Apply");

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page.getByTestId("shell-view-toggle")).toBeFocused();

  await gotoView(page, "transactions");
  await expect(page.getByTestId("shell-view-toggle")).toHaveCount(0);

  await page.goto("/accounts");
  await expect(page.getByTestId("shell-view-toggle")).toHaveCount(0);

  await page.goto("/categories");
  await expect(page.getByTestId("shell-view-toggle")).toHaveCount(0);
});
