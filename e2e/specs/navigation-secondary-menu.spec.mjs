import { test, expect } from "@playwright/test";
import { loginWithSeedAccount } from "./helpers.mjs";

test("@core AI settings and migration are available in the settings menu", async ({ page }) => {
  await loginWithSeedAccount(page);

  const primaryNav = page.getByTestId("primary-nav");
  await expect(primaryNav).toBeVisible();
  await expect(page.getByTestId("secondary-nav")).toHaveCount(0);

  await page.getByTestId("nav-settings").click();
  await expect(page.getByTestId("settings-page")).toBeVisible();

  const settingsMenu = page.getByTestId("settings-menu");
  await expect(settingsMenu).toBeVisible();

  await settingsMenu.getByTestId("settings-menu-ai").click();
  await expect(page.getByTestId("ai-settings-page")).toBeVisible();

  await page.getByTestId("settings-menu-migration").click();
  await expect(page.getByTestId("migration-settings-page")).toBeVisible();
});
