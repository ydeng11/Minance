import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const E2E_HOST = "localhost";
const E2E_FRONTEND_PORT = 4173;
const E2E_API_PORT = 4174;
const E2E_DATA_FILE = "services/api/tmp/e2e-store.json";

export default defineConfig({
  testDir: path.join(__dirname, "e2e/specs"),
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  retries: process.env.CI ? 2 : 0,
  expect: {
    timeout: 10_000
  },
  outputDir: path.join(__dirname, "output/playwright/test-results"),
  reporter: [
    ["line"],
    ["html", { outputFolder: path.join(__dirname, "output/playwright/report"), open: "never" }]
  ],
  use: {
    baseURL: `http://${E2E_HOST}:${E2E_FRONTEND_PORT}`,
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"]
      }
    }
  ],
  globalSetup: path.join(__dirname, "e2e/global-setup.ts"),
  webServer: [
    {
      command: `env NODE_ENV=test PORT=${E2E_API_PORT} MINANCE_STORE_BACKEND=json MINANCE_DATA_FILE_TEST=${E2E_DATA_FILE} MINANCE_ALLOWED_ORIGINS=http://${E2E_HOST}:${E2E_FRONTEND_PORT} MINANCE_SEED_TEST_ACCOUNT=true DEV_TEST_ACCOUNT_EMAIL=dev@minance.local DEV_TEST_ACCOUNT_PASSWORD=devpassword123 apps/web/node_modules/.bin/tsx services/api/src/server.ts`,
      url: `http://${E2E_HOST}:${E2E_API_PORT}`,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI
    },
    {
      command: `cd apps/web && env MINANCE_API_ORIGIN=http://${E2E_HOST}:${E2E_API_PORT} MINANCE_NEXT_DIST_DIR=.next-e2e pnpm dev --webpack --port ${E2E_FRONTEND_PORT}`,
      url: `http://${E2E_HOST}:${E2E_FRONTEND_PORT}`,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI
    }
  ]
});
