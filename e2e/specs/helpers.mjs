import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect } from "@playwright/test";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const SEED_ACCOUNT = {
  email: "dev@minance.local",
  password: "devpassword123"
};

export const CSV_FIXTURE_PATH = path.resolve(__dirname, "../fixtures/transactions.csv");

const PROVIDER_ORDER = ["openrouter", "openai", "anthropic", "google"];

function providerTestKey(provider) {
  const suffix = String(Date.now());
  const openRouterKey = process.env.E2E_OPENROUTER_KEY || process.env.OPENROUTER_API_KEY;

  if (provider === "openrouter") {
    if (openRouterKey && openRouterKey.startsWith("sk-or-v1-")) {
      return openRouterKey;
    }
    return `sk-or-v1-playwright-${suffix}-abcdefghijklmnop`;
  }
  if (provider === "openai") {
    return `sk-playwright-${suffix}-abcdefghijklmnop`;
  }
  if (provider === "anthropic") {
    return `sk-ant-playwright-${suffix}-abcdefghijklmnop`;
  }
  if (provider === "google") {
    return `AIza-playwright-${suffix}-abcdefghijklmnop`;
  }
  return `playwright-${suffix}-test-key`;
}

async function appApi(page, routePath, options = {}) {
  const method = options.method || "GET";
  const body = options.body || null;

  const result = await page.evaluate(
    async ({ routePath, method, body }) => {
      const rawTokens = localStorage.getItem("minance_tokens");
      const tokens = rawTokens ? JSON.parse(rawTokens) : null;
      const headers = { "Content-Type": "application/json" };

      if (tokens?.accessToken) {
        headers.Authorization = `Bearer ${tokens.accessToken}`;
      }

      const response = await fetch(routePath, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
      });

      const payload = await response.json().catch(() => null);
      return {
        ok: response.ok,
        status: response.status,
        payload
      };
    },
    { routePath, method, body }
  );

  if (!result.ok) {
    throw new Error(`App API failed (${method} ${routePath}): ${result.status}`);
  }

  return result.payload;
}

export function getLocalDateYmd(date = new Date()) {
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function settingsCredentialContainer(page) {
  return page.getByTestId("credential-list");
}

export function assistantResponseCards(page) {
  return page.locator('[data-testid="assistant-responses"] article');
}

export function analyticsCategoryBars(page) {
  return page.locator('[data-testid="analytics-category-bars"] > div');
}

export function analyticsMerchantBars(page) {
  return page.locator('[data-testid="analytics-merchant-bars"] > div');
}

export function analyticsHeatmapCells(page) {
  return page.locator('[data-testid="analytics-heatmap"] > div');
}

export function analyticsAnomalyRows(page) {
  return page.locator('[data-testid="analytics-anomalies"] > div');
}

export async function loginWithSeedAccount(page) {
  await page.goto("/");
  await page.getByTestId("auth-email").fill(SEED_ACCOUNT.email);
  await page.getByTestId("auth-password").fill(SEED_ACCOUNT.password);
  await page.getByTestId("auth-submit").click();
  await expect(page.getByTestId("app-shell")).toBeVisible();
  await expect(page.getByTestId("user-email")).toContainText(SEED_ACCOUNT.email);
}

export async function logout(page) {
  if (await page.getByTestId("assistant-close").isVisible().catch(() => false)) {
    await page.getByTestId("assistant-close").click();
    await expect(page.getByTestId("assistant-sidebar")).toHaveCount(0);
  }

  await page.getByTestId("logout-button").click();
  await expect(page.getByTestId("auth-panel")).toBeVisible();
  await expect(page.getByTestId("auth-submit")).toBeVisible();
}

export async function gotoView(page, viewName) {
  const assistantSidebar = page.getByTestId("assistant-sidebar");
  const assistantClose = page.getByTestId("assistant-close");
  const assistantIsOpen = await assistantSidebar.isVisible().catch(() => false);

  if (viewName !== "assistant" && assistantIsOpen) {
    await assistantClose.click();
    await expect(assistantSidebar).toHaveCount(0);
  }

  if (viewName === "analytics" || viewName === "dashboard") {
    await page.getByTestId("nav-dashboard").click();
    await expect(page.getByTestId("dashboard-page")).toBeVisible();
    return;
  }

  if (viewName === "investments") {
    await page.getByTestId("nav-investments").click();
    await expect(page.getByTestId("investments-page")).toBeVisible();
    return;
  }

  if (viewName === "imports") {
    await page.getByTestId("nav-import").click();
    await expect(page.getByTestId("import-page")).toBeVisible();
    return;
  }

  if (viewName === "transactions") {
    await page.getByTestId("nav-transactions").click();
    await expect(page.getByTestId("transactions-page")).toBeVisible();
    return;
  }

  if (viewName === "assistant") {
    if (!assistantIsOpen) {
      await page.getByTestId("assistant-toggle").click();
    }
    await expect(page.getByTestId("assistant-sidebar")).toBeVisible();
    return;
  }

  if (viewName === "settings") {
    await page.getByTestId("nav-settings").click();
    await expect(page.getByTestId("settings-page")).toBeVisible();
  }
}

export async function gotoAiSettings(page) {
  const settingsMenuAi = page.getByTestId("settings-menu-ai");
  if (await settingsMenuAi.count()) {
    await settingsMenuAi.click();
  } else {
    const secondaryAiLink = page.getByTestId("secnav-ai-settings");
    if (await secondaryAiLink.count()) {
      await secondaryAiLink.click();
    } else {
      await page.goto("/settings/ai");
    }
  }
  await expect(page.getByTestId("ai-settings-page")).toBeVisible();
}

export async function gotoMigrationSettings(page) {
  const settingsMenuMigration = page.getByTestId("settings-menu-migration");
  if (await settingsMenuMigration.count()) {
    await settingsMenuMigration.click();
  } else {
    const secondaryMigrationLink = page.getByTestId("secnav-migration");
    if (await secondaryMigrationLink.count()) {
      await secondaryMigrationLink.click();
    } else {
      await page.goto("/settings/migration");
    }
  }
  await expect(page.getByTestId("migration-settings-page")).toBeVisible();
}

export async function clearAllCredentials(page) {
  await gotoAiSettings(page);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const credentialsPayload = await appApi(page, "/v1/ai/credentials");
    const credentials = Array.isArray(credentialsPayload?.credentials) ? credentialsPayload.credentials : [];
    if (credentials.length === 0) {
      break;
    }

    for (const credential of credentials) {
      await appApi(page, `/v1/ai/credentials/${credential.id}`, { method: "DELETE" });
    }
  }

  const remainingPayload = await appApi(page, "/v1/ai/credentials");
  const remaining = Array.isArray(remainingPayload?.credentials) ? remainingPayload.credentials : [];
  if (remaining.length) {
    throw new Error(`Failed to clear all AI credentials (${remaining.length} remaining)`);
  }

  await page.goto("/settings/ai");
  await expect(page.getByTestId("ai-settings-page")).toBeVisible();
  await expect(settingsCredentialContainer(page)).toContainText("No keys configured.");
}

export async function ensureOpenAiCredential(page) {
  return ensureAiCredential(page, { forcedProvider: "openai" });
}

export async function ensureAiCredential(page, options = {}) {
  await gotoAiSettings(page);

  const availableProviders = await page
    .locator('[data-testid="ai-provider-select"] option')
    .evaluateAll((nodes) => nodes.map((node) => node.value).filter(Boolean));

  if (!availableProviders.length) {
    throw new Error("No AI providers available in settings");
  }

  const forcedProvider = options.forcedProvider || null;
  let provider = forcedProvider;
  if (!provider) {
    provider = PROVIDER_ORDER.find((candidate) => availableProviders.includes(candidate)) || availableProviders[0];
  }

  if (!availableProviders.includes(provider)) {
    throw new Error(`Requested provider is unavailable: ${provider}`);
  }

  const credentialText = (await settingsCredentialContainer(page).textContent()) || "";
  const hasCredential = credentialText.toLowerCase().includes(provider.toLowerCase());

  if (!hasCredential) {
    await page.getByTestId("ai-provider-select").selectOption(provider);
    await page.getByTestId("ai-provider-label").fill(`Playwright ${provider} key`);
    await page.getByTestId("ai-provider-key").fill(providerTestKey(provider));
    await page.getByTestId("ai-provider-save").click();
    await expect(page.getByTestId("global-message")).toContainText("Credential saved.");
  }

  await page.getByTestId("ai-pref-provider").selectOption(provider);
  await expect.poll(async () => await page.locator('[data-testid="ai-pref-model"] option').count()).toBeGreaterThan(0);
  const model = await page.getByTestId("ai-pref-model").inputValue();

  await page.getByTestId("ai-save-preferences").click();
  await expect(page.getByTestId("global-message")).toContainText("Preferences saved.");
  await expect(settingsCredentialContainer(page)).toContainText(provider);

  return { provider, model };
}

export async function uploadAndCommitFixtureCsv(page, options = {}) {
  await gotoView(page, "imports");
  await page.getByTestId("import-file").setInputFiles(CSV_FIXTURE_PATH);
  await page.getByTestId("import-process").click();
  await expect(page.getByTestId("global-message")).toContainText("Import analyzed.");

  await expect(page.getByTestId("mapping-panel")).toBeVisible();
  await expect(page.getByTestId("processed-panel")).toBeVisible();
  await expect(page.getByTestId("processed-summary")).not.toHaveText("No processed rows loaded yet.");

  if (options.editProcessedRows !== false) {
    const memoField = page.locator('[data-testid^="processed-memo-"]').first();
    if ((await memoField.count()) > 0) {
      await memoField.fill("Playwright edited row");
      await memoField.press("Tab");
      await expect(page.getByTestId("global-message")).toContainText("Mapping saved.");
    }
  }

  let importDetails = null;
  const assertAiSuggested = options.assertAiSuggested;
  if (typeof assertAiSuggested === "boolean") {
    const importsList = await appApi(page, "/v1/imports");
    const latestImport = importsList.imports?.[0];
    if (!latestImport?.id) {
      throw new Error("Expected an import to be created but none were returned");
    }

    importDetails = await appApi(page, `/v1/imports/${latestImport.id}`);
    expect(importDetails.importJob?.aiSuggested).toBe(assertAiSuggested);
  }

  await page.getByTestId("commit-import").click();
  await expect(page.getByTestId("import-summary")).toContainText('"summary"');
  await expect(page.getByTestId("import-summary")).toContainText('"dateBounds"');

  return {
    importDetails
  };
}

export async function searchTransactions(page, query) {
  await gotoView(page, "transactions");
  await page.getByTestId("txn-query").fill(query);
  await Promise.all([
    page.waitForResponse((response) => {
      return response.url().includes("/v1/transactions") && response.request().method() === "GET";
    }),
    page.getByTestId("txn-apply").click()
  ]);
}
