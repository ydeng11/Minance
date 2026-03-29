import path from "node:path";
import { test, expect } from "@playwright/test";
import {
  appApi,
  applyTransactionsFilters,
  gotoView,
  loginWithSeedAccount,
  openTransactionsAdvancedFilters
} from "./helpers.ts";

const CHASE_IMPORT_FIXTURE_PATH = path.resolve(
  process.cwd(),
  "Chase8457_Activity20260101_20260325_20260326.CSV"
);
const EXISTING_ACCOUNT = {
  displayName: "Hyatt",
  displayIdentifier: "Hyatt (Chase | Credit)",
  sourceInstitution: "Chase",
  accountType: "credit",
  currency: "USD",
  initialBalance: 0
};
const IMPORTED_MERCHANT = "AUTOMATIC PAYMENT - THANK";

async function ensureExistingHyattAccount(page) {
  const accountsPayload = await appApi(page, "/v1/accounts");
  const accounts = Array.isArray(accountsPayload?.accounts) ? accountsPayload.accounts : [];
  const existingAccount = accounts.find((account) => (
    account?.displayName === EXISTING_ACCOUNT.displayName
    && account?.sourceInstitution === EXISTING_ACCOUNT.sourceInstitution
    && account?.accountType === EXISTING_ACCOUNT.accountType
  ));

  if (existingAccount) {
    return existingAccount;
  }

  const createdPayload = await appApi(page, "/v1/accounts", {
    method: "POST",
    body: {
      displayName: EXISTING_ACCOUNT.displayName,
      sourceInstitution: EXISTING_ACCOUNT.sourceInstitution,
      accountType: EXISTING_ACCOUNT.accountType,
      currency: EXISTING_ACCOUNT.currency,
      initialBalance: EXISTING_ACCOUNT.initialBalance
    }
  });

  return createdPayload.account;
}

test("@core imports Chase CSV into an existing account and shows it on Transactions with account filtering", async ({ page }) => {
  await loginWithSeedAccount(page);
  const hyattAccount = await ensureExistingHyattAccount(page);
  expect(hyattAccount?.normalizedKey).toBe("hyatt");

  await gotoView(page, "imports");

  await page.getByTestId("import-file").setInputFiles(CHASE_IMPORT_FIXTURE_PATH);
  await expect(page.getByTestId("import-selected-file")).toContainText("Chase8457_Activity20260101_20260325_20260326.CSV");

  await page.getByTestId("import-process").click();
  await expect(page.getByTestId("global-message")).toContainText("Import analyzed.");

  const accountSelect = page.locator('select[aria-label^="Account for row"]').first();
  await expect(accountSelect).toBeVisible();
  await expect(accountSelect).toHaveValue("Imported Account");
  await accountSelect.selectOption({ label: EXISTING_ACCOUNT.displayIdentifier });
  await expect(page.getByTestId("global-message")).toContainText("Mapping saved.");
  await expect(accountSelect).toHaveValue(EXISTING_ACCOUNT.displayName);

  await page.getByTestId("commit-import").click();
  await expect(page.getByTestId("import-summary")).toContainText('"summary"');
  await expect(page.getByTestId("import-summary")).toContainText('"imported": 1');

  await gotoView(page, "transactions");
  await page.getByTestId("txn-query").fill(IMPORTED_MERCHANT);
  await applyTransactionsFilters(page);

  const importedRows = page.locator('[data-testid="txn-table"] tbody > tr', { hasText: IMPORTED_MERCHANT });
  await expect(importedRows).toHaveCount(1);
  await expect(importedRows.first()).toBeVisible();

  await openTransactionsAdvancedFilters(page);
  await page.getByTestId("txn-account-filter-trigger").click();
  await page.getByTestId("txn-account-filter-search").fill(EXISTING_ACCOUNT.displayName);
  await page.getByRole("option", { name: EXISTING_ACCOUNT.displayIdentifier, exact: true }).click();
  await applyTransactionsFilters(page);

  await expect(page).toHaveURL(/account=hyatt/);
  await expect(page.getByTestId("txn-active-filters")).toContainText(`Accounts: ${EXISTING_ACCOUNT.displayIdentifier}`);
  await expect(importedRows).toHaveCount(1);
  await expect(importedRows.first()).toBeVisible();
});
