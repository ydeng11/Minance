import { test, expect } from "@playwright/test";
import { loginWithSeedAccount } from "./helpers.ts";

test("@core AI settings supports end-to-end profile creation, activation, and editing", async ({ page }) => {
  await loginWithSeedAccount(page);

  await page.getByTestId("nav-settings").click();
  await page.getByTestId("settings-menu-ai").click();
  await expect(page.getByTestId("ai-settings-page")).toBeVisible();

  const apiKey = `sk-playwright-${Date.now()}-abcdefghijklmnop`;

  await expect.poll(async () => await page.locator('[data-testid="profile-provider-select"] option').count()).toBeGreaterThan(0);

  // Create a first profile. The first profile auto-activates.
  await page.getByTestId("profile-name-input").fill("E2E Profile A");
  await page.getByTestId("profile-provider-select").selectOption("openai");
  await page.getByTestId("profile-key-input").fill(apiKey);
  await page.getByTestId("profile-save-btn").click();

  await expect(page.getByTestId("global-message")).toContainText("Profile created.");
  await expect(page.getByTestId("profile-list")).toContainText("E2E Profile A");

  // Create a second profile so we can exercise the activation UI (only one
  // profile can be active at a time). The second profile is not auto-activated.
  await page.getByTestId("profile-name-input").fill("E2E Profile B");
  await page.getByTestId("profile-provider-select").selectOption("openai");
  await page.getByTestId("profile-key-input").fill(`sk-playwright-${Date.now()}-qrstuvwxyz`);
  await page.getByTestId("profile-save-btn").click();
  await expect(page.getByTestId("global-message")).toContainText("Profile created.");

  // Activate the second profile via its activate button. The first profile
  // becomes inactive, so exactly one activate button is present.
  const activateButton = page.getByTestId(/^activate-profile-/).first();
  await expect(activateButton).toBeVisible();
  const activateTestId = await activateButton.getAttribute("data-testid");
  const profileId = activateTestId?.replace("activate-profile-", "") ?? "";
  expect(profileId).toBeTruthy();

  await activateButton.click();
  await expect(page.getByTestId("global-message")).toContainText("Profile activated.");
  await expect(page.getByTestId(`active-badge-${profileId}`)).toBeVisible();

  // Edit the activated profile's name through the inline edit form.
  await page.getByTestId(`edit-profile-${profileId}`).click();
  await expect(page.getByTestId("profile-name-input")).toHaveValue("E2E Profile B");
  await page.getByTestId("profile-name-input").fill("E2E Profile B (edited)");
  await page.getByTestId("profile-save-btn").click();
  await expect(page.getByTestId("global-message")).toContainText("Profile updated.");
  await expect(page.getByTestId("profile-list")).toContainText("E2E Profile B (edited)");
});