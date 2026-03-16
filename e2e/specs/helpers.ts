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
export const POSITIVE_EXPENSE_FIXTURE_PATH = path.resolve(__dirname, "../fixtures/positive-expense-inference.csv");

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

export async function appApi(page, routePath, options = {}) {
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
  return page.locator('[data-testid="analytics-category-bars"] > :is(div, button)');
}

export function analyticsMerchantBars(page) {
  return page.locator('[data-testid="analytics-merchant-bars"] > :is(div, button)');
}

export function analyticsHeatmapCells(page) {
  return page.locator('[data-testid="analytics-heatmap"] > div');
}

export function explorerWeekdaySummaryCells(page) {
  return page.getByTestId("explorer-weekday-summary-cell");
}

export function explorerCategoryHeatmapRows(page) {
  return page.getByTestId("explorer-category-weekday-heatmap-row");
}

export function analyticsAnomalyRows(page) {
  return page.getByTestId("analytics-anomaly-card");
}

async function readAuthState(page, appShell, authMessage) {
  if (await appShell.isVisible().catch(() => false)) {
    return "authenticated";
  }

  return ((await authMessage.textContent().catch(() => "")) || "").trim();
}

export async function loginWithSeedAccount(page) {
  await page.goto("/");
  await page.getByTestId("auth-email").fill(SEED_ACCOUNT.email);
  await page.getByTestId("auth-password").fill(SEED_ACCOUNT.password);
  await page.getByTestId("auth-submit").click();

  const appShell = page.getByTestId("app-shell");
  const authMessage = page.getByTestId("auth-message");
  await expect.poll(() => readAuthState(page, appShell, authMessage)).not.toBe("");

  const authState = await readAuthState(page, appShell, authMessage);
  if (authState.toLowerCase().includes("invalid credentials")) {
    await page.getByTestId("auth-tab-signup").click();
    await page.getByTestId("auth-submit").click();
  }

  await expect(appShell).toBeVisible();
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

  if (viewName === "dashboard") {
    await page.getByTestId("nav-dashboard").click();
    await expect(page.getByTestId("dashboard-page")).toBeVisible();
    return;
  }

  if (viewName === "analytics" || viewName === "explorer") {
    await page.getByTestId("nav-explorer").click();
    await expect(page.getByTestId("explorer-page")).toBeVisible();
    return;
  }

  if (viewName === "investments") {
    await page.goto("/investments");
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId("dashboard-page")).toBeVisible();
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

  if (viewName === "accounts") {
    await page.getByTestId("nav-accounts").click();
    await expect(page.getByTestId("accounts-page")).toBeVisible();
    return;
  }

  if (viewName === "categories") {
    await page.getByTestId("nav-categories").click();
    await expect(page.getByTestId("categories-page")).toBeVisible();
    return;
  }

  if (viewName === "recurrings" || viewName === "recurring") {
    await page.getByTestId("nav-recurrings").click();
    await expect(page.getByTestId("recurrings-page")).toBeVisible();
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

function isTransactionsListResponse(response) {
  return response.url().includes("/v1/transactions") && response.request().method() === "GET";
}

export async function applyTransactionsFilters(page) {
  await Promise.all([
    page.waitForResponse(isTransactionsListResponse),
    page.getByTestId("txn-apply").click()
  ]);
}

export async function openNewTransactionDialog(page) {
  await page.goto("/transactions");
  await expect(page.getByTestId("transactions-page")).toBeVisible();
  await page.getByTestId("txn-create-open").click();
  const dialog = page.getByTestId("txn-create-dialog");
  await expect(dialog).toBeVisible();
  return dialog;
}

async function ensureCategoryExists(page, categoryName) {
  const categoriesPayload = await appApi(page, "/v1/categories");
  const categories = Array.isArray(categoriesPayload?.categories) ? categoriesPayload.categories : [];

  if (categories.some((entry) => entry?.name === categoryName)) {
    return;
  }

  await appApi(page, "/v1/categories", {
    method: "POST",
    body: {
      name: categoryName,
      emoji: "🍽️",
      type: "expense"
    }
  });
}

async function waitForCategoryOption(form, categoryName) {
  await expect.poll(async () => {
    return await form
      .locator('select[name="category_final"] option')
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("value") || ""));
  }).toContain(categoryName);
}

export async function createManualTransaction(page, options = {}) {
  const categoryName = options.category || "Dining";
  const merchant = options.merchant || `PW Manual ${Date.now()}`;
  const description = options.description || `${merchant} description`;
  const transactionDate = options.transactionDate || getLocalDateYmd();
  const amount = options.amount || "42.50";
  const direction = options.direction || "outflow";
  const accountName = options.accountName || "Playwright Account";

  await ensureCategoryExists(page, categoryName);
  const dialog = await openNewTransactionDialog(page);
  const form = dialog.getByTestId("txn-form");

  await form.locator('input[name="transaction_date"]').fill(transactionDate);
  await form.locator('input[name="description"]').fill(description);
  await form.locator('input[name="merchant_raw"]').fill(merchant);
  await form.locator('input[name="amount"]').fill(amount);
  await form.locator('select[name="direction"]').selectOption(direction);
  await waitForCategoryOption(form, categoryName);
  await form.locator('select[name="category_final"]').selectOption(categoryName);
  await form.locator('input[name="account_name"]').fill(accountName);

  if (options.memo) {
    await form.locator('input[name="memo"]').fill(options.memo);
  }

  if (options.tags) {
    await form.getByTestId("txn-create-tags").fill(options.tags);
  }

  await form.locator('button[type="submit"]').click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByTestId("global-message")).toContainText("Transaction created.");

  return {
    merchant,
    description
  };
}

export async function searchTransactions(page, query) {
  await gotoView(page, "transactions");
  await page.getByTestId("txn-query").fill(query);
  await applyTransactionsFilters(page);
}
