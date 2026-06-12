import { expect, test } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { loginWithSeedAccount, gotoView } from "./helpers.ts";

function hasSqlite3Cli() {
  const result = spawnSync("sqlite3", ["--version"], { encoding: "utf8" });
  return result.status === 0 && !result.error;
}

test.skip(!hasSqlite3Cli(), "requires sqlite3 CLI on the server");

test("@core database backup create → list → export → restore flow through Settings UI", async ({ page }) => {
  await loginWithSeedAccount(page);
  await gotoView(page, "settings");
  await expect(page.getByTestId("settings-page")).toBeVisible();

  // Scroll to the data controls section to ensure buttons are in view
  await page.getByTestId("settings-data-controls").scrollIntoViewIfNeeded();

  // ---- Create a backup ----
  await page.getByTestId("settings-backup-create").click();

  // Wait for a backup row to appear (status message shown, backup in list)
  await expect(page.getByTestId("global-message")).toContainText("Backup created", { timeout: 20_000 });
  const backupRows = page.getByTestId(/^settings-backup-item-/);
  await expect(backupRows.first()).toBeVisible();

  // Capture the backup id from the first row's data-testid attribute
  const firstRow = backupRows.first();
  const rowTestId = await firstRow.getAttribute("data-testid");
  expect(rowTestId).toBeTruthy();
  const backupId = (rowTestId as string).replace("settings-backup-item-", "");
  expect(backupId).toBeTruthy();

  // ---- Export the backup archive ----
  const downloadPromise = page.waitForEvent("download", { timeout: 15_000 });
  await page.getByTestId(`settings-backup-export-${backupId}`).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain("minance-backup-");
  expect(download.suggestedFilename()).toContain(".tar.gz");

  // ---- Initiate restore ----
  await page.getByTestId(`settings-backup-restore-select-${backupId}`).click();
  await expect(page.getByTestId("settings-backup-confirm-input")).toBeVisible();

  // Type the backup id to confirm
  await page.getByTestId("settings-backup-confirm-input").fill(backupId);

  // Click restore
  const responsePromise = page.waitForResponse(
    (res) => res.url().includes("/v1/system/backups/") && res.url().includes("/restore") && res.request().method() === "POST",
    { timeout: 30_000 }
  );
  await page.getByTestId("settings-backup-restore-confirm").click();
  await responsePromise;

  // Verify success — the session still exists so we should see the reload hint
  await expect(page.getByTestId("global-message")).toContainText("Backup restored", { timeout: 10_000 });
});
