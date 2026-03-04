import { test, expect } from "@playwright/test";
import {
  analyticsAnomalyRows,
  analyticsCategoryBars,
  analyticsHeatmapCells,
  analyticsMerchantBars,
  assistantResponseCards,
  ensureAiCredential,
  gotoView,
  loginWithSeedAccount,
  uploadAndCommitFixtureCsv
} from "./helpers.ts";

test("@core assistant and analytics visualizations render with imported data", async ({ page }) => {
  await loginWithSeedAccount(page);
  await ensureAiCredential(page);
  await uploadAndCommitFixtureCsv(page, { assertAiSuggested: true });

  await gotoView(page, "assistant");
  await page.getByTestId("assistant-question").fill("How much did I spend on dining this quarter?");
  await page.getByTestId("assistant-ask").click();

  await expect.poll(async () => await assistantResponseCards(page).count()).toBeGreaterThan(0);
  const firstResponse = assistantResponseCards(page).first();
  await expect(firstResponse).toBeVisible();
  await expect(firstResponse).toContainText(/\b(?:openrouter|openai|anthropic|google)\/[a-z0-9_.-]+\b/i);

  await gotoView(page, "dashboard");
  const dashboardKpis = page.locator('[data-testid="dashboard-kpis"] button');
  await expect(dashboardKpis).toHaveCount(4);

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
});
