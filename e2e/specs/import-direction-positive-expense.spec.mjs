import { test, expect } from "@playwright/test";
import {
  POSITIVE_EXPENSE_FIXTURE_PATH,
  appApi,
  gotoView,
  loginWithSeedAccount
} from "./helpers.mjs";

test("@core imports infer positive_is_debit for positive expense files", async ({ page }) => {
  await loginWithSeedAccount(page);
  await gotoView(page, "imports");

  await page.getByTestId("import-file").setInputFiles(POSITIVE_EXPENSE_FIXTURE_PATH);
  await page.getByTestId("import-process").click();
  await expect(page.getByTestId("global-message")).toContainText("Import analyzed.");

  const importsList = await appApi(page, "/v1/imports");
  const latestImport = importsList.imports?.[0];
  expect(latestImport?.id).toBeTruthy();

  const importDetails = await appApi(page, `/v1/imports/${latestImport.id}`);
  expect(importDetails?.importJob?.directionInference?.amountMode).toBe("single_amount");
  expect(importDetails?.importJob?.directionInference?.signConvention).toBe("positive_is_debit");
  expect(Number(importDetails?.importJob?.directionInference?.confidence || 0)).toBeGreaterThan(0.55);
});

