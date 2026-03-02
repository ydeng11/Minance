import { test, expect } from "@playwright/test";
import { loginWithSeedAccount } from "./helpers.mjs";

test("@core assistant is available as a shell sidebar", async ({ page }) => {
  await loginWithSeedAccount(page);

  const toggle = page.getByTestId("assistant-toggle");
  const closeButton = page.getByTestId("assistant-close");
  const questionInput = page.getByTestId("assistant-question");
  const askButton = page.getByTestId("assistant-ask");

  await expect(page.getByTestId("nav-chat")).toHaveCount(0);

  await toggle.click();
  const sidebar = page.getByTestId("assistant-sidebar");

  await expect(sidebar).toBeVisible();
  await expect(questionInput).toBeFocused();

  await questionInput.fill("How much did I spend on groceries last month?");
  await expect(askButton).toBeEnabled();

  await page.keyboard.press("Shift+Tab");
  await expect(closeButton).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(askButton).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(closeButton).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(questionInput).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(askButton).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(sidebar).toBeHidden();
  await expect(toggle).toBeFocused();

  await toggle.click();
  await expect(sidebar).toBeVisible();

  await page.getByTestId("assistant-overlay").click();
  await expect(sidebar).toBeHidden();
  await expect(toggle).toBeFocused();
});
