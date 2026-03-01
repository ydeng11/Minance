import { test, expect } from "@playwright/test";
import {
  clearAllCredentials,
  ensureAiCredential,
  loginWithSeedAccount,
  settingsCredentialContainer
} from "./helpers.mjs";

test("@core login and configure AI provider settings", async ({ page }) => {
  await loginWithSeedAccount(page);
  await clearAllCredentials(page);
  const aiConfig = await ensureAiCredential(page);

  await expect(settingsCredentialContainer(page)).toContainText(aiConfig.provider);
  await expect(page.getByTestId("global-message")).toContainText("Preferences saved.");
});
