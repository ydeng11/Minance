import { test, expect } from "@playwright/test";
import { loginWithSeedAccount } from "./helpers.ts";

test("@core AI settings are available in the settings menu", async ({ page }) => {
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

  await expect(page.getByTestId("settings-menu-migration")).toHaveCount(0);

  const helpMenuToggle = page.getByTestId("help-menu-toggle");
  await expect(helpMenuToggle).toBeVisible();
  await helpMenuToggle.click();
  await expect(page.getByTestId("help-menu-panel")).toBeVisible();
  await page.getByTestId("help-menu-link-operator-guide").click();
  await expect(page.getByTestId("help-page")).toBeVisible();
});

test("@core mobile more navigation exposes secondary routes", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loginWithSeedAccount(page);
  await page.goto("/transactions");

  await expect(page.getByTestId("mobile-nav")).toBeVisible();
  await expect(page.getByTestId("mnav-explorer")).toBeVisible();

  await page.getByTestId("mnav-more").click();
  await expect(page.getByTestId("mobile-more-nav")).toBeVisible();

  await expect(page.getByTestId("mnav-more-accounts")).toBeVisible();
  await expect(page.getByTestId("mnav-more-categories")).toBeVisible();
  await expect(page.getByTestId("mnav-more-recurrings")).toBeVisible();
  await expect(page.getByTestId("mnav-more-settings")).toBeVisible();
});
