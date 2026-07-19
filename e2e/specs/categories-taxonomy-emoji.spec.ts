import { test, expect } from "@playwright/test";
import { appApi, gotoView, loginWithSeedAccount } from "./helpers.ts";

test("@core categories add modal selects emoji from popup", async ({ page }) => {
  const categoryName = `Emoji Modal ${Date.now()}`;

  await loginWithSeedAccount(page);
  await gotoView(page, "categories");

  await page.getByTestId("categories-add").click();
  await expect(page.getByTestId("category-modal")).toBeVisible();

  await page.getByTestId("category-form-name").fill(categoryName);
  await page.getByTestId("category-form-emoji-trigger").click();
  await expect(page.getByTestId("emoji-picker")).toBeVisible();
  await page.getByTestId("emoji-picker-search").fill("rocket");
  await page.getByTestId("emoji-picker-search").press("Enter");
  await page.getByTestId("category-form-type").selectOption("expense");
  await page.getByTestId("category-form-save").click();

  await expect(page.getByTestId("global-message")).toContainText("Category created.");
  await expect(page.locator('[data-testid^="category-row-"]', { hasText: categoryName })).toContainText("🚀");
});

test("@core taxonomy management coarse group emoji uses popup selector", async ({ page }) => {
  await loginWithSeedAccount(page);
  await gotoView(page, "categories");

  await page.getByTestId("taxonomy-emoji-trigger-essential").click();
  await expect(page.getByTestId("emoji-picker")).toBeVisible();
  await page.getByTestId("emoji-picker-search").fill("rocket");
  await page.getByTestId("emoji-picker-search").press("Enter");

  await expect(page.getByTestId("taxonomy-emoji-trigger-essential")).toContainText("🚀");
});

test("@core grouped taxonomy lists reflow immediately after moving a filtered category", async ({ page }) => {
  const categoryName = `Filtered Move ${Date.now()}`;

  await loginWithSeedAccount(page);

  const created = await appApi(page, "/v1/categories", {
    method: "POST",
    body: {
      name: categoryName,
      emoji: "🎯",
      coarseKey: "extra",
      type: "expense"
    }
  });

  await gotoView(page, "categories");
  await page.getByTestId("categories-group-filter").selectOption("extra");

  const categoryRow = page.locator('[data-testid^="taxonomy-group-extra"]', { hasText: categoryName });
  await expect(categoryRow).toBeVisible();

  await page.getByTestId(`taxonomy-move-${created.category.id}`).selectOption("essential");

  await expect(page.locator('[data-testid^="taxonomy-group-essential"]', { hasText: categoryName })).toBeVisible();
});

test("@core categories search and group filter controls align to the same top edge", async ({ page }) => {
  await loginWithSeedAccount(page);
  await gotoView(page, "categories");

  const searchTop = await page.getByTestId("categories-query").evaluate((element) => element.getBoundingClientRect().top);
  const groupFilterTop = await page.getByTestId("categories-group-filter").evaluate((element) => element.getBoundingClientRect().top);

  expect(Math.abs(searchTop - groupFilterTop)).toBeLessThanOrEqual(1);
});

test("@core settings no longer exposes taxonomy editing controls", async ({ page }) => {
  await loginWithSeedAccount(page);
  await gotoView(page, "settings");

  await expect(page.getByTestId("settings-page")).toBeVisible();
  await expect(page.getByTestId("settings-section-map")).toHaveCount(0);
  await expect(page.getByTestId("settings-appearance")).toHaveCount(0);
  await expect(page.getByTestId("settings-data-controls")).toBeVisible();
  await expect(page.getByTestId("settings-integrations")).toHaveCount(0);
  await expect(page.getByTestId("settings-ai-settings-link")).toHaveCount(0);
  await expect(page.getByTestId("settings-help-link")).toHaveCount(0);
  await expect(page.getByTestId("settings-import-open")).toBeVisible();

  const themeToggle = page.getByTestId("theme-toggle");
  await expect(themeToggle).toBeVisible();
  const initialTheme = await page.locator("html").getAttribute("data-theme");
  await themeToggle.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", initialTheme === "light" ? "dark" : "light");

  await expect(page.getByTestId("settings-page")).not.toContainText("Category taxonomy saved.");
  await expect(page.getByTestId("settings-page")).not.toContainText("Add a category");
  await expect(page.getByTestId("settings-page")).not.toContainText("Grouping & taxonomy management");
});
