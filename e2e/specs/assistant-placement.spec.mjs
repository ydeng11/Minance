import { test, expect } from "@playwright/test";
import { loginWithSeedAccount } from "./helpers.mjs";

test("@core assistant is available as a shell sidebar", async ({ page }) => {
  await loginWithSeedAccount(page);

  await expect(page.getByTestId("nav-chat")).toHaveCount(0);

  await page.getByTestId("assistant-toggle").click();
  const sidebar = page.getByTestId("assistant-sidebar");

  await expect(sidebar).toBeVisible();
  await expect(page.getByTestId("assistant-question")).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(sidebar).toBeHidden();

  await page.getByTestId("assistant-toggle").click();
  await expect(sidebar).toBeVisible();

  await page.getByTestId("assistant-overlay").click();
  await expect(sidebar).toBeHidden();
});
