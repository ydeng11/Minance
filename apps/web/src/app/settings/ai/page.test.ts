import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const pageSource = readFileSync(join(process.cwd(), "src/app/settings/ai/page.tsx"), "utf8");

test("ai settings page exposes test IDs for every interactive section", () => {
  assert.match(pageSource, /data-testid="ai-settings-page"/);
  assert.match(pageSource, /data-testid="ai-provider-select"/);
  assert.match(pageSource, /data-testid="ai-provider-label"/);
  assert.match(pageSource, /data-testid="ai-provider-key"/);
  assert.match(pageSource, /data-testid="ai-provider-save"/);
  assert.match(pageSource, /data-testid="ai-pref-provider"/);
  assert.match(pageSource, /data-testid="ai-pref-model"/);
  assert.match(pageSource, /data-testid="ai-pref-failover"/);
  assert.match(pageSource, /data-testid="ai-save-preferences"/);
  assert.match(pageSource, /data-testid="credential-list"/);
});

test("ai settings decorative icons are hidden from assistive technology", () => {
  assert.match(pageSource, /<Loader2 className="h-4 w-4 animate-spin" \/>/);
  assert.match(pageSource, /<Save className="h-4 w-4" \/>/);
  assert.match(pageSource, /<CheckCircle2 className="h-4 w-4" \/>/);
  assert.match(pageSource, /<Sparkles className="h-3 w-3" \/>/);
});

test("ai settings API key input uses password type and a datalist for model suggestions", () => {
  assert.match(pageSource, /type="password"/);
  assert.match(pageSource, /const MODEL_LIST_ID = "ai-model-datalist"/);
  assert.match(pageSource, /datalist id=\{MODEL_LIST_ID\}/);
  assert.match(pageSource, /list=\{MODEL_LIST_ID\}/);
});

test("ai settings save buttons show spinner during loading and disable when empty or saving", () => {
  assert.match(pageSource, /isSavingKey \? <Loader2 className="h-4 w-4 animate-spin" \/> : <Save className="h-4 w-4" \/>/);
  assert.match(
    pageSource,
    /isSavingPreferences \? <Loader2 className="h-4 w-4 animate-spin" \/> : <CheckCircle2 className="h-4 w-4" \/>/
  );
  assert.match(pageSource, /disabled=\{!providerSelect \|\| !providerKey\.trim\(\) \|\| isSavingKey\}/);
  assert.match(pageSource, /disabled=\{isSavingPreferences\}/);
});

test("ai settings uses semantic design tokens, not hard-coded color scales", () => {
  assert.match(pageSource, /SETTINGS_PANEL_CLASS_NAME = "rounded-\[24px\] border border-border-subtle bg-surface-panel\/85 p-4 shadow-panel"/);
  assert.match(pageSource, /SETTINGS_FIELD_CLASS_NAME = "rounded-lg border border-border-subtle bg-surface-field px-3 py-2 text-text-primary outline-none transition focus:border-accent focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg"/);
  assert.match(pageSource, /SETTINGS_LABEL_CLASS_NAME = "grid gap-1 text-sm text-text-secondary"/);
});

test("ai settings preferences section has an empty state when no credentials exist", () => {
  assert.match(pageSource, /\{credentials\.length === 0 \? <p className="text-sm text-text-muted">No keys configured\.<\/p> : null\}/);
});

test("ai settings credential list items include rotate and delete controls with scoped test IDs", () => {
  assert.match(pageSource, /data-testid=\{`rotate-credential-\$\{credential\.id\}`\}/);
  assert.match(pageSource, /data-testid=\{`delete-credential-\$\{credential\.id\}`\}/);
});

test("ai settings renders SettingsMenu and StatusMessage components", () => {
  assert.match(pageSource, /<SettingsMenu \/>/);
  assert.match(pageSource, /import \{ SettingsMenu \} from "@\/components\/settings\/SettingsMenu"/);
  assert.match(pageSource, /<StatusMessage>/);
  assert.match(pageSource, /import \{ StatusMessage \} from "@\/components\/feedback\/StatusMessage"/);
});
