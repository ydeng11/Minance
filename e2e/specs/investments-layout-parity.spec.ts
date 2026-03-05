import { test, expect } from "@playwright/test";
import { loginWithSeedAccount } from "./helpers.ts";

test("@core investments route redirects to dashboard while hidden from UI", async ({ page }) => {
  // TODO(maybe-later): Restore investments layout parity assertions after frontend re-enable.
  await loginWithSeedAccount(page);
  await page.goto("/investments");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId("dashboard-page")).toBeVisible();
});
