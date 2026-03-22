import { test, expect } from "@playwright/test";
import {
  explorerCategoryHeatmapRows,
  explorerWeekdaySummaryCells,
  createManualTransaction,
  gotoView,
  loginWithSeedAccount,
  uploadAndCommitFixtureCsv
} from "./helpers.ts";

test("explorer advanced filters omit review status controls", async ({ page }) => {
  await loginWithSeedAccount(page);
  await uploadAndCommitFixtureCsv(page);
  await gotoView(page, "explorer");

  await expect(page.getByTestId("explorer-command-bar")).toBeVisible();
  await expect(page.getByTestId("explorer-summary-band")).toBeVisible();
  await expect(page.getByTestId("explorer-perspective-tabs")).toBeVisible();
  await expect(page.getByTestId("explorer-filter-rail")).toHaveCount(0);

  await page.getByTestId("explorer-open-advanced-filters").click();
  await expect(page.getByTestId("explorer-advanced-filters")).toBeVisible();
  await expect(page.getByText("Review status")).toHaveCount(0);
  await expect(page.getByTestId("explorer-advanced-filter-review")).toHaveCount(0);
  await expect(page.getByTestId("explorer-active-filters")).not.toContainText("Reviewed");
  await expect(page.getByTestId("explorer-active-filters")).not.toContainText("Needs Review");
});

test("explorer advanced filters support category and type multiselect plus tag suggestions", async ({ page }) => {
  await loginWithSeedAccount(page);
  await uploadAndCommitFixtureCsv(page);
  await createManualTransaction(page, {
    category: "Dining",
    merchant: `Explorer Tag Suggestion ${Date.now()}`,
    tags: "monthly, household"
  });
  await createManualTransaction(page, {
    category: "Groceries",
    merchant: `Explorer Category Seed ${Date.now()}`,
    tags: "weekly"
  });
  await gotoView(page, "explorer");

  await page.getByTestId("explorer-open-advanced-filters").click();
  await expect(page.getByTestId("explorer-advanced-filters")).toBeVisible();

  await page.getByTestId("explorer-category-multiselect-trigger").click();
  await page.getByRole("option", { name: "Dining", exact: true }).click();
  await page.getByRole("option", { name: "Groceries", exact: true }).click();

  await page.getByTestId("explorer-type-multiselect-trigger").click();
  await page.getByRole("option", { name: "Expense" }).click();
  await page.getByRole("option", { name: "Transfer" }).click();

  await page.getByTestId("explorer-tag-filter").fill("mon");
  await expect(page.getByTestId("explorer-tag-suggestions")).toContainText("monthly");
});

test("explorer keeps merchant search in the command bar and not in the advanced filters modal", async ({ page }) => {
  await loginWithSeedAccount(page);
  await uploadAndCommitFixtureCsv(page);
  await gotoView(page, "explorer");

  const advancedFilters = page.getByTestId("explorer-advanced-filters");

  await expect(page.getByPlaceholder("Search merchants, notes, and descriptions")).toBeVisible();
  await page.getByTestId("explorer-open-advanced-filters").click();
  await expect(advancedFilters).toBeVisible();
  await expect(advancedFilters.getByPlaceholder("Filter by merchant")).toHaveCount(0);
});

test("overview perspective uses a full-width trend chart with the active range label", async ({ page }) => {
  await loginWithSeedAccount(page);
  await uploadAndCommitFixtureCsv(page);
  await page.goto("/explorer?range=365d");

  await expect(page.getByTestId("explorer-overview-trend")).toBeVisible();
  await expect(page.getByTestId("explorer-comparison-panel")).toHaveCount(0);
  await expect(page.getByTestId("explorer-overview-trend")).toContainText("Last 12 months");
  await expect(page.getByTestId("explorer-overview-trend")).not.toContainText("Last 6 months");
  await expect(page.getByTestId("analytics-category-bars")).toBeVisible();
  await expect(page.getByTestId("analytics-merchant-bars")).toBeVisible();
  await expect(page.getByTestId("explorer-weekday-summary")).toBeVisible();
  await expect(page.getByTestId("analytics-anomalies")).toBeVisible();
});

test("spending trend inspects a month before filtering explorer", async ({ page }) => {
  await loginWithSeedAccount(page);
  await uploadAndCommitFixtureCsv(page);
  await page.goto("/explorer?range=365d");

  const trend = page.getByTestId("explorer-overview-trend");
  await expect(trend).toBeVisible();
  await expect(page.getByTestId("explorer-trend-detail")).toContainText("Spend composition");
  await expect(page.getByTestId("explorer-trend-detail")).toContainText("Income composition");

  await page.getByTestId("explorer-trend-month-2026-02").click();
  await expect(page).toHaveURL(/\/explorer\?range=365d$/);

  await page.getByTestId("explorer-trend-apply-month").click();
  await expect(page).toHaveURL(/start=2026-02-01/);
  await expect(page).toHaveURL(/end=2026-02-28/);
});

test("summary cards separate selected-range totals from recent seven-day context", async ({ page }) => {
  await loginWithSeedAccount(page);
  await uploadAndCommitFixtureCsv(page);
  await page.goto("/explorer?range=365d");

  const summary = page.getByTestId("explorer-summary-band");
  await expect(summary).toBeVisible();
  await expect(summary).toContainText("Last 7 days");
  await expect(summary).toContainText("within current filters");
  await expect(summary).not.toContainText("Recent 7-day trend");
  await expect(page.getByTestId("explorer-summary-sparkline-net")).toBeVisible();
});

test("overview uses a fixed weekday spend summary across date ranges", async ({ page }) => {
  await loginWithSeedAccount(page);
  await uploadAndCommitFixtureCsv(page);

  await page.goto("/explorer?range=365d");

  const summary = page.getByTestId("explorer-weekday-summary");
  const cells = explorerWeekdaySummaryCells(page);

  await expect(summary).toBeVisible();
  await expect(summary).toContainText("Sun");
  await expect(summary).toContainText("Sat");
  await expect(cells).toHaveCount(7);
  await expect(cells.first()).not.toContainText("$");
  await expect(cells.first()).not.toContainText(/txns/i);
  await expect(cells.first()).toHaveAttribute("title", /\$\d/);
  await expect(cells.first()).toHaveAttribute("title", /transactions/i);
  await expect(page.getByTestId("analytics-heatmap")).toHaveCount(0);
});

test("overview weekday summary keeps weekday labels horizontally centered in a lower label band", async ({ page }) => {
  await loginWithSeedAccount(page);
  await uploadAndCommitFixtureCsv(page);
  await page.goto("/explorer?range=365d");

  const cells = explorerWeekdaySummaryCells(page);
  await expect(cells).toHaveCount(7);

  const metrics = await cells.evaluateAll((elements) => {
    return elements.map((element) => {
      const label = element.firstElementChild;
      if (!(label instanceof HTMLElement)) {
        throw new Error("Weekday summary cell is missing its label element");
      }

      const cellRect = element.getBoundingClientRect();
      const labelRect = label.getBoundingClientRect();

      return {
        label: label.textContent?.trim() || "",
        xOffset: Math.abs(labelRect.left + labelRect.width / 2 - (cellRect.left + cellRect.width / 2)),
        yDelta: labelRect.top + labelRect.height / 2 - (cellRect.top + cellRect.height / 2),
        overflowX: Math.max(0, label.scrollWidth - label.clientWidth)
      };
    });
  });

  for (const metric of metrics) {
    expect(metric.xOffset, `${metric.label} should stay horizontally centered in its capsule`).toBeLessThanOrEqual(2);
    expect(metric.yDelta, `${metric.label} should sit below the capsule midpoint instead of vertically centered`).toBeGreaterThanOrEqual(12);
    expect(metric.overflowX, `${metric.label} should fit inside the capsule width`).toBeLessThanOrEqual(1);
  }
});

test("overview weekday summary uses one readable label color across all capsules", async ({ page }) => {
  await loginWithSeedAccount(page);
  await uploadAndCommitFixtureCsv(page);
  await page.goto("/explorer?range=365d");

  const cells = explorerWeekdaySummaryCells(page);
  await expect(cells).toHaveCount(7);

  const metrics = await cells.evaluateAll((elements) => {
    function parseColor(color) {
      const probe = document.createElement("span");
      probe.style.color = "";
      probe.style.color = color;
      if (!probe.style.color) {
        return null;
      }

      probe.style.position = "absolute";
      probe.style.left = "-9999px";
      probe.style.top = "-9999px";
      document.body.appendChild(probe);
      const resolved = getComputedStyle(probe).color;
      probe.remove();

      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      const context = canvas.getContext("2d");
      if (!context) {
        return null;
      }

      context.clearRect(0, 0, 1, 1);
      context.fillStyle = resolved;
      context.fillRect(0, 0, 1, 1);
      const pixel = context.getImageData(0, 0, 1, 1).data;

      return {
        r: pixel[0],
        g: pixel[1],
        b: pixel[2]
      };
    }

    function toLinear(channel) {
      const normalized = channel / 255;
      if (normalized <= 0.04045) {
        return normalized / 12.92;
      }
      return ((normalized + 0.055) / 1.055) ** 2.4;
    }

    function luminance(color) {
      return 0.2126 * toLinear(color.r) + 0.7152 * toLinear(color.g) + 0.0722 * toLinear(color.b);
    }

    function contrastRatio(foreground, background) {
      const light = Math.max(luminance(foreground), luminance(background));
      const dark = Math.min(luminance(foreground), luminance(background));
      return (light + 0.05) / (dark + 0.05);
    }

    return elements.map((element) => {
      const label = element.firstElementChild;
      if (!(label instanceof HTMLElement)) {
        throw new Error("Weekday summary cell is missing its label element");
      }

      const text = getComputedStyle(label).color;
      const background = getComputedStyle(element).backgroundColor;
      const textColor = parseColor(text);
      const backgroundColor = parseColor(background);
      if (!textColor || !backgroundColor) {
        throw new Error(`Could not parse colors for weekday summary cell: ${text} on ${background}`);
      }

      return {
        label: label.textContent?.trim() || "",
        text,
        contrast: contrastRatio(textColor, backgroundColor)
      };
    });
  });

  expect(new Set(metrics.map((metric) => metric.text)).size).toBe(1);

  for (const metric of metrics) {
    expect(metric.contrast, `${metric.label} should keep readable contrast against its capsule`).toBeGreaterThanOrEqual(4.5);
  }
});

test("category perspective compares filtered top categories by weekday before applying a filter", async ({ page }) => {
  await loginWithSeedAccount(page);
  await uploadAndCommitFixtureCsv(page);
  await page.goto("/explorer?perspective=category&range=365d");

  await expect(page.getByTestId("explorer-category-weekday-heatmap")).toBeVisible();
  await expect(page.getByTestId("explorer-category-weekday-heatmap")).toContainText("Sun");
  await expect(page.getByTestId("explorer-category-weekday-heatmap")).toContainText("Sat");

  const rows = explorerCategoryHeatmapRows(page);
  const rowCount = await rows.count();
  expect(rowCount).toBeGreaterThan(0);
  expect(rowCount).toBeLessThanOrEqual(7);
  await expect(rows.first()).toContainText("Spend");
  await expect(rows.first()).toContainText("Transactions");
  await expect(rows.first()).not.toContainText("•");

  await page.getByTestId("explorer-category-lens").getByRole("button").first().click();
  await expect(page).toHaveURL(/perspective=category/);
  await expect(page).not.toHaveURL(/category=/);

  await page.getByTestId("explorer-category-apply-filter").click();
  await expect(page).toHaveURL(/category=/);
});

test("merchant and anomaly cards use polished presentation", async ({ page }) => {
  await loginWithSeedAccount(page);
  await uploadAndCommitFixtureCsv(page);
  await gotoView(page, "explorer");

  const merchants = page.getByTestId("analytics-merchant-bars");
  await expect(merchants).toBeVisible();
  const merchantCards = merchants.locator("button");
  await expect(merchantCards.first()).toBeVisible();
  await expect(merchantCards.first()).toContainText(/#1/i);
  await expect(merchantCards.first()).toContainText(/\$\d/);
  await expect(page.getByTestId("analytics-merchant-caption").first()).toBeVisible();

  const anomalies = page.getByTestId("analytics-anomalies");
  await expect(anomalies).toBeVisible();
  const anomalyCards = page.getByTestId("analytics-anomaly-card");
  if ((await anomalyCards.count()) > 0) {
    await expect(anomalyCards.first()).toBeVisible();
    await expect(anomalyCards.first()).toContainText(/Amount outlier|New merchant spike/);
  } else {
    await expect(anomalies).toContainText("Spending looks stable");
  }
});

test("category perspective keeps filters and renders scoped category insights", async ({ page }) => {
  await loginWithSeedAccount(page);
  await uploadAndCommitFixtureCsv(page);
  await gotoView(page, "explorer");

  await page.getByTestId("explorer-perspective-category").click();

  await expect(page.getByTestId("explorer-category-view")).toBeVisible();
  await expect(page.getByTestId("explorer-category-trend")).toBeVisible();
  await expect(page.getByTestId("explorer-category-merchants")).toBeVisible();
});

test("category lens shows richer inspection details", async ({ page }) => {
  await loginWithSeedAccount(page);
  await uploadAndCommitFixtureCsv(page);
  await gotoView(page, "explorer");

  await page.getByTestId("explorer-perspective-category").click();

  const lens = page.getByTestId("explorer-category-lens");
  await expect(lens).toBeVisible();
  await expect(lens).toContainText("Spend");
  await expect(lens).toContainText("Income");

  await lens.getByRole("button").first().click();

  await expect(page.getByTestId("explorer-category-lens-detail")).toContainText("Net");
  await expect(page.getByTestId("explorer-category-lens-detail")).toContainText("Transactions");
  await expect(page.getByTestId("analytics-category-bars")).toBeVisible();
});

test("account perspective renders account analytics and saved views restore it", async ({ page }) => {
  await loginWithSeedAccount(page);
  await uploadAndCommitFixtureCsv(page);
  await gotoView(page, "explorer");

  await page.getByTestId("explorer-perspective-account").click();
  await expect(page.getByTestId("explorer-account-view")).toBeVisible();
  await expect(page.getByTestId("explorer-account-rankings")).toBeVisible();

  await page.getByTestId("saved-view-name").fill("Credit card lens");
  await page.getByTestId("save-view-button").click();
  await page.getByRole("button", { name: "Apply" }).first().click();

  await expect(page.getByTestId("explorer-account-view")).toBeVisible();
});

test("category and account drill-down expand the explorer workspace in place", async ({ page }) => {
  await loginWithSeedAccount(page);
  await uploadAndCommitFixtureCsv(page);
  await gotoView(page, "explorer");

  await page.getByTestId("analytics-category-bars").getByRole("button").first().click();
  await expect(page).toHaveURL(/\/explorer/);
  await expect(page.getByTestId("explorer-active-filters")).toContainText(/groceries|dining|transport/i);

  await page.getByTestId("explorer-perspective-account").click();
  await page.getByTestId("explorer-account-rankings").getByRole("button").first().click();
  await expect(page).toHaveURL(/\/explorer/);
  await expect(page.getByTestId("explorer-account-view")).toContainText(/focused on/i);

  await page.getByTestId("explorer-open-transactions").click();
  await expect(page).toHaveURL(/\/transactions\?/);
  await expect(page.getByTestId("transactions-page")).toBeVisible();
});
