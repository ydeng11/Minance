import { test, expect } from "@playwright/test";
import {
  analyticsAnomalyRows,
  analyticsCategoryBars,
  analyticsHeatmapCells,
  analyticsMerchantBars,
  assistantResponseCards,
  clearAllCredentials,
  ensureAiCredential,
  getLocalDateYmd,
  gotoView,
  loginWithSeedAccount,
  logout,
  searchTransactions,
  settingsCredentialContainer,
  uploadAndCommitFixtureCsv
} from "./helpers.mjs";

test("@core full user flow covers auth, AI settings, imports, transactions, analytics, and assistant", async ({
  page
}) => {
  await loginWithSeedAccount(page);

  await clearAllCredentials(page);
  const aiConfig = await ensureAiCredential(page);
  await expect(settingsCredentialContainer(page)).toContainText(aiConfig.provider);
  await expect(page.getByTestId("global-message")).toContainText("Preferences saved.");

  const { importDetails } = await uploadAndCommitFixtureCsv(page, {
    assertAiSuggested: true
  });
  expect(importDetails?.importJob?.aiSuggested).toBe(true);

  await gotoView(page, "transactions");
  const manualMerchant = `PW Core ${Date.now()}`;
  const form = page.getByTestId("txn-form");

  await form.locator('input[name="transaction_date"]').fill(getLocalDateYmd());
  await form.locator('input[name="description"]').fill(`${manualMerchant} description`);
  await form.locator('input[name="merchant_raw"]').fill(manualMerchant);
  await form.locator('input[name="amount"]').fill("49.75");
  await form.locator('select[name="direction"]').selectOption("debit");
  await form.locator('select[name="category_final"]').selectOption("Dining");
  await form.locator('input[name="account_name"]').fill("Playwright Account");
  await form.locator('input[name="memo"]').fill("Core flow create");
  await form.locator('button[type="submit"]').click();
  await searchTransactions(page, manualMerchant);
  const createdRow = page.locator('[data-testid="txn-table"] tr', { hasText: manualMerchant });
  await expect.poll(async () => await createdRow.count()).toBe(1);

  await createdRow.locator('button', { hasText: 'Edit' }).click();
  await form.locator('input[name="amount"]').fill("61.25");
  await form.locator('input[name="description"]').fill(`${manualMerchant} updated`);
  await form.locator('button[type="submit"]').click();
  await searchTransactions(page, manualMerchant);
  const updatedRow = page.locator('[data-testid="txn-table"] tr', { hasText: manualMerchant });
  await expect.poll(async () => await updatedRow.count()).toBe(1);
  await expect(updatedRow).toContainText("$61.25");

  await updatedRow.locator('button', { hasText: 'Delete' }).click();
  await searchTransactions(page, manualMerchant);
  await expect.poll(async () => await page.locator('[data-testid="txn-table"] tr', { hasText: manualMerchant }).count()).toBe(0);

  await gotoView(page, "dashboard");
  const dashboardKpis = page.locator('[data-testid="dashboard-kpis"] article');
  await expect(dashboardKpis).toHaveCount(4);
  const kpiTexts = await dashboardKpis.allTextContents();
  for (const text of kpiTexts) {
    expect(text.trim().length).toBeGreaterThan(0);
  }

  await expect(analyticsCategoryBars(page).first()).toBeVisible();
  await expect(analyticsMerchantBars(page).first()).toBeVisible();

  const heatCells = analyticsHeatmapCells(page);
  if ((await heatCells.count()) > 0) {
    await expect(heatCells.first()).toBeVisible();
  } else {
    await expect(page.getByTestId("analytics-heatmap")).toContainText("No spend data for range.");
  }

  const anomalyRows = analyticsAnomalyRows(page);
  if ((await anomalyRows.count()) > 0) {
    await expect(anomalyRows.first()).toBeVisible();
  } else {
    await expect(page.getByTestId("analytics-anomalies")).toContainText("No anomalies detected.");
  }

  await gotoView(page, "assistant");
  await page.getByTestId("assistant-question").fill("How much did I spend on dining this quarter?");
  await page.getByTestId("assistant-ask").click();

  await expect.poll(async () => await assistantResponseCards(page).count()).toBeGreaterThan(0);
  const firstResponse = assistantResponseCards(page).first();
  await expect(firstResponse).toBeVisible();
  await expect(firstResponse).toContainText(new RegExp(`${aiConfig.provider}/`, "i"));
  await expect(firstResponse).toContainText(/\b[a-z0-9_-]+\/[a-z0-9_.-]+\b/i);

  await logout(page);
  await loginWithSeedAccount(page);
});
