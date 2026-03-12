import { expect, test } from "@playwright/test";
import { gotoView, loginWithSeedAccount } from "./helpers.ts";

test("@core transactions workspace header keeps filters visible", async ({ page }) => {
  await loginWithSeedAccount(page);
  await gotoView(page, "transactions");

  await expect(page.getByTestId("txn-workspace-header")).toBeVisible();
  await expect(page.getByTestId("txn-filter-surface")).toBeVisible();
  await expect(page.getByTestId("txn-filter-primary-row")).toBeVisible();
  await expect(page.getByTestId("txn-filter-secondary-row")).toBeVisible();
  await expect(page.getByTestId("txn-create-open")).toBeVisible();
  await expect(page.getByTestId("txn-amount-filter")).toBeVisible();
  await expect(page.getByText("Date preset applies across the ledger and drill-down links.")).toHaveCount(0);
});
