import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    baseURL: `http://127.0.0.1:${E2E_FRONTEND_PORT}`,
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
  globalSetup: path.join(__dirname, "e2e/global-setup.mjs"),
  webServer: [
    {
      command: `env PORT=${E2E_API_PORT} MINANCE_DATA_FILE=${E2E_DATA_FILE} MINANCE_SEED_TEST_ACCOUNT=true DEV_TEST_ACCOUNT_EMAIL=dev@minance.local DEV_TEST_ACCOUNT_PASSWORD=devpassword123 node services/api/src/server.js`,
      url: `http://127.0.0.1:${E2E_API_PORT}`,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI
    },
    {
      command: `env MINANCE_API_ORIGIN=http://127.0.0.1:${E2E_API_PORT} MINANCE_NEXT_DIST_DIR=.next-e2e npm run dev --workspace @minance/web -- -p ${E2E_FRONTEND_PORT}`,
      url: `http://127.0.0.1:${E2E_FRONTEND_PORT}`,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI
    }
  ]
});
