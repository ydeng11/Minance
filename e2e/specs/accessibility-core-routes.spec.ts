import axe from "axe-core";
import { test, expect } from "@playwright/test";
import { gotoView, loginWithSeedAccount } from "./helpers.ts";

const CORE_ROUTE_FLOWS = [
  { label: "dashboard", viewName: "dashboard", testId: "dashboard-page" },
  { label: "transactions", viewName: "transactions", testId: "transactions-page" },
  { label: "import", viewName: "imports", testId: "import-page" },
  { label: "settings", viewName: "settings", testId: "settings-page" }
];

const AXE_RUN_OPTIONS = {
  runOnly: {
    type: "tag",
    values: ["wcag2a", "wcag2aa"]
  },
  rules: {
    "color-contrast": { enabled: false }
  }
};

function formatViolations(violations) {
  if (!violations.length) {
    return "none";
  }

  return violations
    .map((violation) => {
      const targets = violation.nodes.length
        ? violation.nodes.flatMap((node) => node.targets).join(" | ")
        : "unknown-target";
      return `${violation.id} (${violation.impact}) ${violation.help}: ${targets}`;
    })
    .join("\n");
}

async function ensureAxeLoaded(page) {
  const hasAxe = await page.evaluate(() => typeof window.axe?.run === "function");
  if (!hasAxe) {
    await page.addScriptTag({ content: axe.source });
  }
}

async function expectNoViolations(page, label, contextSelector = null) {
  await ensureAxeLoaded(page);

  const violations = await page.evaluate(
    async ({ options, contextSelector }) => {
      const context = contextSelector ? document.querySelector(contextSelector) : document;
      if (!context) {
        return [
          {
            id: "missing-context",
            impact: "critical",
            help: `Could not find context selector: ${contextSelector}`,
            nodes: []
          }
        ];
      }

      const result = await window.axe.run(context, options);
      return result.violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact || "unknown",
        help: violation.help,
        nodes: violation.nodes.map((node) => ({
          targets: node.target
        }))
      }));
    },
    { options: AXE_RUN_OPTIONS, contextSelector }
  );

  expect(
    violations,
    `Accessibility violations detected for ${label}:\n${formatViolations(violations)}`
  ).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  await loginWithSeedAccount(page);
});

for (const flow of CORE_ROUTE_FLOWS) {
  test(`@core @a11y ${flow.label} route has no axe violations`, async ({ page }) => {
    await gotoView(page, flow.viewName);
    await expect(page.getByTestId(flow.testId)).toBeVisible();
    await expectNoViolations(page, flow.label);
  });
}

test("@core @a11y assistant dialog flow has no axe violations", async ({ page }) => {
  const assistantToggle = page.getByTestId("assistant-toggle");
  await assistantToggle.click();

  const assistantSidebar = page.getByTestId("assistant-sidebar");
  await expect(assistantSidebar).toBeVisible();
  await expect(page.getByTestId("assistant-question")).toBeFocused();

  await page.getByTestId("assistant-question").fill("Show my highest spend categories this month.");
  await expect(page.getByTestId("assistant-ask")).toBeEnabled();

  await expectNoViolations(page, "assistant dialog", "#assistant-sidebar");

  await page.keyboard.press("Escape");
  await expect(assistantSidebar).toHaveCount(0);
  await expect(assistantToggle).toBeFocused();
});
