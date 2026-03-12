import { test, expect } from "@playwright/test";
import {
  gotoView,
  loginWithSeedAccount,
  uploadAndCommitFixtureCsv
} from "./helpers.ts";

test("explorer shows summary metrics, perspective tabs, and a desktop filter rail", async ({ page }) => {
  await loginWithSeedAccount(page);
  await uploadAndCommitFixtureCsv(page);
  await gotoView(page, "explorer");

  await expect(page.getByTestId("explorer-summary-band")).toBeVisible();
  await expect(page.getByTestId("explorer-perspective-tabs")).toBeVisible();
  await expect(page.getByTestId("explorer-filter-rail")).toBeVisible();
});
