import assert from "node:assert/strict";
import { test, expect } from "@playwright/test";
import { gotoView, loginWithSeedAccount } from "./helpers.mjs";

test("@core investments screen keeps Copilot-style structural parity", async ({ page }) => {
  await loginWithSeedAccount(page);
  await gotoView(page, "investments");

  const investmentsPage = page.getByTestId("investments-page");
  await expect(investmentsPage).toBeVisible();

  await expect(page.getByTestId("investments-main-grid")).toBeVisible();
  await expect(page.getByTestId("investments-overview-card")).toBeVisible();
  await expect(page.getByTestId("investments-security-card")).toBeVisible();
  await expect(page.getByTestId("investments-accounts-panel")).toBeVisible();
  await expect(page.getByTestId("investments-metrics-panel")).toBeVisible();
  await expect(page.getByTestId("investments-positions-panel")).toBeVisible();

  const layout = await page.evaluate(() => {
    const grid = document.querySelector('[data-testid="investments-main-grid"]');
    const overview = document.querySelector('[data-testid="investments-overview-card"]');
    const security = document.querySelector('[data-testid="investments-security-card"]');

    if (!(grid instanceof HTMLElement) || !(overview instanceof HTMLElement) || !(security instanceof HTMLElement)) {
      return null;
    }

    const gridRect = grid.getBoundingClientRect();
    const overviewRect = overview.getBoundingClientRect();
    const securityRect = security.getBoundingClientRect();

    return {
      width: gridRect.width,
      leftWidth: overviewRect.width,
      rightWidth: securityRect.width
    };
  });

  assert.ok(layout, "investments grid metrics should be measurable");
  assert.ok(layout.width >= 960, `expected desktop investments canvas width >= 960, got ${layout.width}`);
  assert.ok(layout.leftWidth >= layout.width * 0.35, "left panel should occupy a substantial column");
  assert.ok(layout.rightWidth >= layout.width * 0.35, "right panel should occupy a substantial column");

  await expect(investmentsPage).toHaveScreenshot("investments-layout-parity.png", {
    maxDiffPixelRatio: 0.03,
    animations: "disabled"
  });
});
