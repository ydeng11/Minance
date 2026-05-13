import { test, expect } from "@playwright/test";
import { CSV_FIXTURE_PATH, gotoView, loginWithSeedAccount } from "./helpers.ts";

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
  await expect(page.getByText(/^Analyzed \d+ rows in /)).toBeVisible({ timeout: 30_000 });

  await page.getByTestId("import-upload").click();
  await page.getByTestId("import-file").setInputFiles(CSV_FIXTURE_PATH);
  await processButton.click();
  await expect(page.getByText(/^Analyzed \d+ rows in /)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("issues-panel")).toBeVisible();
  await expect(page.getByTestId("reconciliation-panel")).toBeVisible();
  await expect(page.getByTestId("reconciliation-summary")).toContainText("Accounts: 2");
});

test("@core import review adapts to narrow screens", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loginWithSeedAccount(page);
  await page.goto("/import");
  await expect(page.getByTestId("import-page")).toBeVisible();

  await page.getByTestId("import-upload").click();
  await page.getByTestId("import-file").setInputFiles(CSV_FIXTURE_PATH);
  await page.getByTestId("import-process").click();

  await expect(page.getByText(/^Analyzed \d+ rows in /)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("processed-mobile-cards")).toBeVisible();
  await expect(page.getByTestId("reconciliation-mobile-cards")).toBeVisible();
  await expect(page.getByTestId("processed-table")).not.toBeVisible();
  await expect(page.getByTestId("reconciliation-table")).not.toBeVisible();
});
