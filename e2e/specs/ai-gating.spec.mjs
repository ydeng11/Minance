import { test, expect } from "@playwright/test";
import { clearAllCredentials, gotoView, loginWithSeedAccount } from "./helpers.mjs";

test("@core assistant is gated when no AI credential is configured", async ({ page }) => {
  await loginWithSeedAccount(page);
  await clearAllCredentials(page);

  await gotoView(page, "assistant");
  await page.getByTestId("assistant-question").fill("How much did I spend last month?");
  await page.getByTestId("assistant-ask").click();

  await expect(page.getByTestId("global-message")).toContainText("AI setup required");
  await expect(page.getByTestId("global-message")).toContainText("Configure a provider key");
});
