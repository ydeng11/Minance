import { test, expect } from "@playwright/test";
import { loginWithSeedAccount } from "./helpers.mjs";

test("@core AI settings supports end-to-end credential and preference actions", async ({ page }) => {
  await loginWithSeedAccount(page);

  await page.getByTestId("nav-settings").click();
  await page.getByTestId("settings-menu-ai").click();
  await expect(page.getByTestId("ai-settings-page")).toBeVisible();

  await expect.poll(async () => await page.locator('[data-testid="ai-provider-select"] option').count()).toBeGreaterThan(0);

  await page.getByTestId("ai-provider-select").selectOption("openai");
  await page.getByTestId("ai-provider-label").fill("Playwright OpenAI key");
  await page.getByTestId("ai-provider-key").fill(`sk-playwright-${Date.now()}-abcdefghijklmnop`);
  await page.getByTestId("ai-provider-save").click();

  await expect(page.getByTestId("global-message")).toContainText("Credential saved.");
  await expect(page.getByTestId("credential-list")).toContainText("openai");

  await page.getByTestId("ai-pref-provider").selectOption("openai");
  await expect.poll(async () => await page.locator('[data-testid="ai-pref-model"] option').count()).toBeGreaterThan(0);

  await page.getByTestId("ai-save-preferences").click();
  await expect(page.getByTestId("global-message")).toContainText("Preferences saved.");
});
