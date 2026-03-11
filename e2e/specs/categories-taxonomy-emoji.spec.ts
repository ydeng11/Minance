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

test("@core settings taxonomy emoji fields use searchable picker", async ({ page }) => {
  const categoryName = `Settings Emoji ${Date.now()}`;

  await loginWithSeedAccount(page);
  await gotoView(page, "settings");

  await page.getByTestId("settings-new-category-emoji-trigger").click();
  await expect(page.getByTestId("emoji-picker")).toBeVisible();
  await page.getByTestId("emoji-picker-search").fill("rocket");
  await page.getByTestId("emoji-picker-search").press("Enter");
  await expect(page.getByTestId("settings-new-category-emoji-trigger")).toContainText("🚀");
  await page.getByTestId("new-category").fill(categoryName);
  await page.getByTestId("add-category").click();
  await expect(page.getByTestId("global-message")).toContainText("Category added.");

  await page.getByTestId("settings-strategy-coarse-emoji-trigger-essential").click();
  await expect(page.getByTestId("emoji-picker")).toBeVisible();
  await page.getByTestId("emoji-picker-search").fill("brain");
  await page.getByTestId("emoji-picker-search").press("Enter");
  await expect(page.getByTestId("settings-strategy-coarse-emoji-trigger-essential")).toContainText("🧠");

  await page.getByTestId("settings-strategy-granular-emoji-trigger-dining").click();
  await expect(page.getByTestId("emoji-picker")).toBeVisible();
  await page.getByTestId("emoji-picker-search").fill("dragon face");
  await page.getByTestId("emoji-picker-search").press("Enter");
  await expect(page.getByTestId("settings-strategy-granular-emoji-trigger-dining")).toContainText("🐲");
  await page.getByTestId("save-category-strategy").click();
  await expect(page.getByTestId("global-message")).toContainText("Category strategy saved.");
});
