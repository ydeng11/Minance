import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getSupportedAccountTypes } from "../../../../../packages/domain/src/accounts";
import { resolveSupportedAccountTypes } from "./accountTypes";

const pageSource = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "page.tsx"), "utf8");

test("resolveSupportedAccountTypes falls back to the shared domain account type list", () => {
  assert.deepEqual(resolveSupportedAccountTypes([]), getSupportedAccountTypes());
  assert.deepEqual(resolveSupportedAccountTypes(["credit", "loan"]), ["credit", "loan"]);
});

test("accounts dialogs include focus management contracts", () => {
  assert.match(pageSource, /import \{ getDialogFocusableElements, trapDialogTabKey \} from "@\/lib\/dialogFocus";/);
  assert.match(pageSource, /wizardDialogRef/);
  assert.match(pageSource, /settingsDialogRef/);
  assert.match(pageSource, /lastFocusedElementRef/);
  assert.match(pageSource, /focusDialogFirstElement/);
  assert.match(pageSource, /restoreFocusAfterDialogClose/);
  assert.match(pageSource, /event\.key === "Escape"/);
  assert.match(pageSource, /trapDialogTabKey\(event, activeDialog\)/);
});

test("accounts controls declare touch targets and decorative icons", () => {
  assert.match(pageSource, /min-h-\[44px\]/);
  assert.match(pageSource, /min-w-\[44px\]/);
  assert.match(pageSource, /<Plus className="h-4 w-4" aria-hidden="true" \/>/);
  assert.match(pageSource, /<X className="h-4 w-4" aria-hidden="true" \/>/);
  assert.match(pageSource, /CardFace/);
  assert.match(pageSource, /CardDetailsSection/);
});

test("updateManualDraft safely indexes manualErrors with overlapping keys only", () => {
  assert.match(pageSource, /function updateManualDraft\(/);
  assert.match(pageSource, /const errorField = field as keyof ManualAccountErrors;/);
  assert.match(pageSource, /\[errorField\]/);
});

test("account delete confirmation uses styled in-app controls", () => {
  assert.match(pageSource, /isDeleteConfirmOpen/);
  assert.match(pageSource, /data-testid="accounts-delete-confirm"/);
  assert.match(pageSource, /DANGER_CONFIRM_PANEL_CLASS/);
  assert.match(pageSource, /DANGER_CONFIRM_BUTTON_CLASS/);
  assert.match(pageSource, /Delete account/);
  assert.doesNotMatch(pageSource, /window\.confirm\(`Delete/);
});
