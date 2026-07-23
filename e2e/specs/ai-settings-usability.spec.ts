import { test, expect } from "@playwright/test";
import { loginWithSeedAccount } from "./helpers.ts";

test("@core AI settings supports end-to-end profile creation, activation, and editing", async ({ page }) => {
  await loginWithSeedAccount(page);

  await page.getByTestId("nav-settings").click();
  await page.getByTestId("settings-menu-ai").click();
  await expect(page.getByTestId("ai-settings-page")).toBeVisible();

  await expect.poll(async () => await page.locator('[data-testid="profile-provider-select"] option').count()).toBeGreaterThan(0);

  // Create a new profile
  await page.getByTestId("profile-name-input").fill("E2E OpenAI profile");
  await page.getByTestId("profile-provider-select").selectOption("openai");
  await page.getByTestId("profile-key-input").fill(`sk-playwright-${Date.now()}-abcdefghijklmnop`);
  await page.getByTestId("profile-save-btn").click();

  await expect(page.getByTestId("global-message")).toContainText("Profile created.");

  // Wait for profile to appear and check it's shown
  await expect(page.getByTestId("profile-list")).toContainText("E2E OpenAI profile");

  // Activate the profile
  const profileId = await page.getByTestId(/^profile-/).first().getAttribute("data-testid");
  const id = profileId?.replace("profile-", "") ?? "";

  if (id) {
    await page.getByTestId(`activate-profile-${id}`).click();
    await expect(page.getByTestId("global-message")).toContainText("Profile activated.");
    await expect(page.getByTestId(`active-badge-${id}`)).toBeVisible();
  }

  // Edit profile name
  await page.getByTestId(`edit-profile-${id}`).click();
  await expect(page.getByTestId("profile-name-input")).toHaveValue("E2E OpenAI profile");
  await page.getByTestId("profile-name-input").fill("E2E OpenAI profile (edited)");
  await page.getByTestId("profile-save-btn").click();
  await expect(page.getByTestId("global-message")).toContainText("Profile updated.");
});
