import assert from "node:assert/strict";
import { test, expect } from "@playwright/test";
import {
  CSV_FIXTURE_PATH,
  gotoView,
  loginWithSeedAccount,
  searchTransactions,
  uploadAndCommitFixtureCsv
} from "./helpers.ts";

const CONTRAST_TARGETS = {
  body: 4.5,
  placeholder: 4.5,
  emphasizedText: 7,
  focusBorder: 3
};

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

        const probe = document.createElement("span");
        probe.style.color = "";
        probe.style.color = value;
        if (!probe.style.color) {
          return null;
        }

        probe.style.position = "absolute";
        probe.style.left = "-9999px";
        probe.style.top = "-9999px";
        document.body.appendChild(probe);
        const resolved = getComputedStyle(probe).color;
        probe.remove();

        if (!resolved || resolved === "transparent") {
          return { r: 0, g: 0, b: 0, a: 0 };
        }

        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;
        const context = canvas.getContext("2d");
        if (context) {
          context.clearRect(0, 0, 1, 1);
          context.fillStyle = "rgb(1 2 3)";
          const sentinel = context.fillStyle;
          try {
            context.fillStyle = resolved;
          } catch {
            // Fall through to custom parsers.
          }
          if (context.fillStyle !== sentinel || resolved.toLowerCase() === sentinel.toLowerCase()) {
            context.fillRect(0, 0, 1, 1);
            const pixel = context.getImageData(0, 0, 1, 1).data;
            return {
              r: pixel[0],
              g: pixel[1],
              b: pixel[2],
              a: pixel[3] / 255
            };
          }
        }

        if (resolved.toLowerCase().startsWith("oklch(")) {
          const channels = resolved.match(/[0-9]*\.?[0-9]+/g);
          if (channels && channels.length >= 3) {
            const L = Number(channels[0]);
            const C = Number(channels[1]);
            const hDegrees = Number(channels[2]);
            const alpha = channels[3] == null ? 1 : Number(channels[3]);

            const hRadians = (hDegrees * Math.PI) / 180;
            const aLab = C * Math.cos(hRadians);
            const bLab = C * Math.sin(hRadians);

            const l_ = L + 0.3963377774 * aLab + 0.2158037573 * bLab;
            const m_ = L - 0.1055613458 * aLab - 0.0638541728 * bLab;
            const s_ = L - 0.0894841775 * aLab - 1.291485548 * bLab;

            const l = l_ ** 3;
            const m = m_ ** 3;
            const s = s_ ** 3;

            const linearR = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
            const linearG = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
            const linearB = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

            function toSrgb(channel) {
              if (!Number.isFinite(channel)) {
                return 0;
              }
              const clamped = Math.max(0, Math.min(1, channel));
              if (clamped <= 0.0031308) {
                return 12.92 * clamped;
              }
              return 1.055 * clamped ** (1 / 2.4) - 0.055;
            }

            return {
              r: Math.round(toSrgb(linearR) * 255),
              g: Math.round(toSrgb(linearG) * 255),
              b: Math.round(toSrgb(linearB) * 255),
              a: Number.isFinite(alpha) ? alpha : 1
            };
          }
        }

        const channels = resolved.match(/[0-9]*\.?[0-9]+/g);
        if (!channels || channels.length < 3) {
          return null;
        }

        const alpha = channels[3] == null ? 1 : Number(channels[3]);

        return {
          r: Number(channels[0]),
          g: Number(channels[1]),
          b: Number(channels[2]),
          a: Number.isFinite(alpha) ? alpha : 1
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

test("@core major tab text and input contrast meets dark-theme thresholds", async ({ page }) => {
  await loginWithSeedAccount(page);
  await uploadAndCommitFixtureCsv(page);

  await gotoView(page, "dashboard");
  await expectContrast(page.getByTestId("dashboard-page").locator("header p").first(), {
    label: "dashboard subtitle text",
    minRatio: CONTRAST_TARGETS.body
  });

  await expectContrast(page.getByTestId("dashboard-trend").locator("h3"), {
    label: "dashboard trend section heading",
    minRatio: CONTRAST_TARGETS.body
  });

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
    minRatio: CONTRAST_TARGETS.body
  });

  const rangeSelect = page.getByTestId("txn-range");
  await expectContrast(rangeSelect, {
    label: "transactions range select text",
    minRatio: CONTRAST_TARGETS.emphasizedText
  });

  await page.getByTestId("txn-open-advanced-filters").click();
  const tagInput = page.getByTestId("txn-tag-filter");
  await expect(tagInput).toBeVisible();

  await expectContrast(tagInput, {
    label: "transactions tag input text",
    minRatio: CONTRAST_TARGETS.emphasizedText
  });

  await tagInput.fill("");
  await expectContrast(tagInput, {
    label: "transactions tag input placeholder",
    minRatio: CONTRAST_TARGETS.placeholder,
    pseudo: "::placeholder"
  });

  await page.getByTestId("txn-advanced-apply").click();

  await gotoView(page, "imports");
  await page.getByTestId("import-file").setInputFiles(CSV_FIXTURE_PATH);
  await page.getByTestId("import-process").click();
  await expect(page.getByText(/^Analyzed \d+ rows in /)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("processed-panel")).toBeVisible();

  const processedMemo = page.locator('[data-testid^="processed-memo-"]').first();
  await expect(processedMemo).toBeVisible();

  await expectContrast(processedMemo, {
    label: "processed row memo input text",
    minRatio: CONTRAST_TARGETS.emphasizedText
  });

  await processedMemo.focus();
  await expectContrast(processedMemo, {
    label: "processed row memo input focus border",
    minRatio: CONTRAST_TARGETS.focusBorder,
    metric: "border"
  });

  await expectContrast(page.getByTestId("processed-summary"), {
    label: "import processed summary text",
    minRatio: CONTRAST_TARGETS.body
  });

  await gotoView(page, "settings");
  await expectContrast(page.getByTestId("settings-section-map").locator("p").first(), {
    label: "settings section map description text",
    minRatio: CONTRAST_TARGETS.body
  });

  await expectContrast(page.getByTestId("settings-data-controls").locator("p").first(), {
    label: "settings data controls description text",
    minRatio: CONTRAST_TARGETS.body
  });

  await gotoView(page, "assistant");
  const assistantQuestion = page.getByTestId("assistant-question");
  await expect(assistantQuestion).toBeVisible();

  await expectContrast(assistantQuestion, {
    label: "assistant question input text",
    minRatio: CONTRAST_TARGETS.emphasizedText
  });

  await expectContrast(assistantQuestion, {
    label: "assistant question input placeholder",
    minRatio: CONTRAST_TARGETS.placeholder,
    pseudo: "::placeholder"
  });
});
