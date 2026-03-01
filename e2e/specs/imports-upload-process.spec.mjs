import { test, expect } from "@playwright/test";
import { CSV_FIXTURE_PATH, gotoView, loginWithSeedAccount } from "./helpers.mjs";

test("@core imports upload and process actions are reliable", async ({ page }) => {
  await loginWithSeedAccount(page);
  await gotoView(page, "imports");

  const processButton = page.getByTestId("import-process");
  await expect(processButton).toBeDisabled();

  await page.getByTestId("import-upload").click();
  await page.getByTestId("import-file").setInputFiles(CSV_FIXTURE_PATH);
  await expect(page.getByTestId("import-selected-file")).toContainText("transactions.csv");
  await expect(processButton).toBeEnabled();

  await processButton.click();
  await expect(page.getByTestId("global-message")).toContainText("Import analyzed.");

  await page.getByTestId("import-upload").click();
  await page.getByTestId("import-file").setInputFiles(CSV_FIXTURE_PATH);
  await processButton.click();
  await expect(page.getByTestId("global-message")).toContainText("Import analyzed.");
});
