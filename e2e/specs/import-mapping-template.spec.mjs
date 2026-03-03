import { test, expect } from "@playwright/test";
import { CSV_FIXTURE_PATH, gotoView, loginWithSeedAccount } from "./helpers.mjs";

test("@core import mapping templates apply deterministic field mappings", async ({ page }) => {
  await loginWithSeedAccount(page);
  await gotoView(page, "imports");

  await page.getByTestId("import-file").setInputFiles(CSV_FIXTURE_PATH);
  await page.getByTestId("import-process").click();

  const mappingPanel = page.getByTestId("mapping-panel");
  await expect(mappingPanel).toBeVisible();

  await page.getByTestId("mapping-template-select").selectOption("generic_statement");
  await page.getByTestId("mapping-template-apply").click();

  await expect(page.getByTestId("mapping-template-notice")).toContainText("Generic Statement applied");
  await expect(page.getByTestId("mapping-field-date")).not.toHaveValue("");
  await expect(page.getByTestId("mapping-field-merchant")).not.toHaveValue("");
  await expect(page.getByTestId("mapping-field-amount")).not.toHaveValue("");
});
