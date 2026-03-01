import assert from "node:assert/strict";
import { test, expect } from "@playwright/test";
import {
  CSV_FIXTURE_PATH,
  gotoView,
  loginWithSeedAccount,
  searchTransactions,
  uploadAndCommitFixtureCsv
} from "./helpers.mjs";

async function collectContrast(locator, options = {}) {
  const pseudo = options.pseudo || null;
  const metric = options.metric || "text";

  return locator.first().evaluate(
    (element, args) => {
      function parseColor(value) {
        if (!value) {
          return null;
        }

        const lower = value.trim().toLowerCase();
        if (lower === "transparent") {
          return { r: 0, g: 0, b: 0, a: 0 };
        }

        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;
        const context = canvas.getContext("2d");
        if (!context) {
          return null;
        }

        context.clearRect(0, 0, 1, 1);
        context.fillStyle = "rgba(1, 2, 3, 0.5)";
        const sentinel = context.fillStyle;

        try {
          context.fillStyle = value;
        } catch {
          return null;
        }

        if (context.fillStyle === sentinel && lower !== sentinel) {
          return null;
        }

        context.fillRect(0, 0, 1, 1);
        const pixel = context.getImageData(0, 0, 1, 1).data;

        return {
          r: pixel[0],
          g: pixel[1],
          b: pixel[2],
          a: pixel[3] / 255
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

      function alphaBlend(foreground, background) {
        const alpha = foreground.a + background.a * (1 - foreground.a);
        if (alpha <= 0) {
          return { r: 0, g: 0, b: 0, a: 0 };
        }

        return {
          r: (foreground.r * foreground.a + background.r * background.a * (1 - foreground.a)) / alpha,
          g: (foreground.g * foreground.a + background.g * background.a * (1 - foreground.a)) / alpha,
          b: (foreground.b * foreground.a + background.b * background.a * (1 - foreground.a)) / alpha,
          a: alpha
        };
      }

      function resolveBackground(target) {
        const solidBlack = { r: 0, g: 0, b: 0, a: 1 };
        let composite = solidBlack;
        let node = target;

        while (node && node instanceof HTMLElement) {
          const background = parseColor(getComputedStyle(node).backgroundColor);
          if (background && background.a > 0) {
            composite = alphaBlend(background, composite);
          }
          node = node.parentElement;
        }

        return composite;
      }

      const style = getComputedStyle(element, args.pseudo);
      const foregroundSource = args.metric === "border" ? style.borderColor : style.color;
      const foreground = parseColor(foregroundSource);
      const background = resolveBackground(element);

      if (!foreground) {
        throw new Error(`Could not parse foreground color: ${foregroundSource}`);
      }

      return {
        ratio: contrastRatio(foreground, background),
        foreground: foregroundSource,
        background: `rgb(${Math.round(background.r)} ${Math.round(background.g)} ${Math.round(background.b)})`
      };
    },
    { pseudo, metric }
  );
}

async function expectContrast(locator, options) {
  const result = await collectContrast(locator, options);
  const minRatio = options.minRatio || 4.5;

  assert.ok(
    result.ratio >= minRatio,
    `${options.label} contrast ${result.ratio.toFixed(2)} is below ${minRatio} (fg ${result.foreground}, bg ${result.background})`
  );
}

test("@core table and input text remain readable across transactions/import UI", async ({ page }) => {
  await loginWithSeedAccount(page);
  await uploadAndCommitFixtureCsv(page);

  await gotoView(page, "transactions");
  await searchTransactions(page, "Coffee Shop");

  const transactionsTable = page.getByTestId("txn-table");
  await expect(transactionsTable.locator("tbody tr").first()).toBeVisible();

  await expectContrast(transactionsTable.locator("thead th").first(), {
    label: "transactions table header",
    minRatio: 5.5
  });

  await expectContrast(transactionsTable.locator("tbody td").first(), {
    label: "transactions table body cell",
    minRatio: 5
  });

  const queryInput = page.getByTestId("txn-query");
  await expectContrast(queryInput, {
    label: "transactions search input text",
    minRatio: 7
  });

  await expectContrast(queryInput, {
    label: "transactions search input placeholder",
    minRatio: 4.5,
    pseudo: "::placeholder"
  });

  await gotoView(page, "imports");
  await page.getByTestId("import-file").setInputFiles(CSV_FIXTURE_PATH);
  await page.getByTestId("import-process").click();
  await expect(page.getByTestId("global-message")).toContainText("Import analyzed.");
  await expect(page.getByTestId("processed-panel")).toBeVisible();

  const processedMemo = page.locator('[data-testid^="processed-memo-"]').first();
  await expect(processedMemo).toBeVisible();

  await expectContrast(processedMemo, {
    label: "processed row memo input text",
    minRatio: 7
  });

  await processedMemo.focus();
  await expectContrast(processedMemo, {
    label: "processed row memo input focus border",
    minRatio: 3,
    metric: "border"
  });
});
