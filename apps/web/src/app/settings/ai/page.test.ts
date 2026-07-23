import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const pageSource = readFileSync(join(process.cwd(), "src/app/settings/ai/page.tsx"), "utf8");

test("ai settings page exposes test IDs for every interactive section", () => {
  assert.match(pageSource, /data-testid="ai-settings-page"/);
  assert.match(pageSource, /data-testid="profile-list"/);
  assert.match(pageSource, /data-testid="profile-form"/);
  assert.match(pageSource, /data-testid="profile-name-input"/);
  assert.match(pageSource, /data-testid="profile-provider-select"/);
  assert.match(pageSource, /data-testid="profile-model-input"/);
  assert.match(pageSource, /data-testid="profile-key-input"/);
  assert.match(pageSource, /data-testid="profile-save-btn"/);
});

test("ai settings decorative icons are hidden from assistive technology", () => {
  assert.match(pageSource, /aria-hidden="true"/);
});

test("ai settings API key inputs use password type and a datalist for model suggestions", () => {
  assert.match(pageSource, /type="password"/);
  assert.match(pageSource, /const MODEL_LIST_ID = "ai-model-datalist"/);
  assert.match(pageSource, /datalist id=\{MODEL_LIST_ID\}/);
  assert.match(pageSource, /list=\{MODEL_LIST_ID\}/);
});

test("ai settings save button shows spinner during loading and disables when empty or saving", () => {
  assert.match(pageSource, /isSaving \?/);
  assert.match(pageSource, /disabled=\{/);
  assert.match(pageSource, /formName\.trim\(\)/);
  assert.match(pageSource, /formKey\.trim\(\)/);
  assert.match(pageSource, /editingId \? false :/);
});

test("ai settings uses semantic design tokens, not hard-coded color scales", () => {
  assert.match(
    pageSource,
    /PANEL_CLASS =\n  "rounded-\[24px\] border border-border-subtle bg-surface-panel\/85 p-4 shadow-panel"/
  );
  assert.match(
    pageSource,
    /FIELD_CLASS =\n  "rounded-lg border border-border-subtle bg-surface-field px-3 py-2 text-text-primary outline-none transition focus:border-accent focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg"/
  );
  assert.match(pageSource, /LABEL_CLASS = "grid gap-1 text-sm text-text-secondary"/);
});

test("ai settings profile list has an empty state when no profiles exist", () => {
  assert.match(pageSource, /\{profiles\.length === 0 && !isFormOpen \?/);
  assert.match(pageSource, /No profiles yet/);
});

test("ai settings profile items include activate, edit, replace-key, and delete controls with scoped test IDs", () => {
  assert.match(pageSource, /data-testid=\{`profile-\$\{profile\.id\}`\}/);
  assert.match(pageSource, /data-testid=\{`active-badge-\$\{profile\.id\}`\}/);
  assert.match(pageSource, /data-testid=\{`activate-profile-\$\{profile\.id\}`\}/);
  assert.match(pageSource, /data-testid=\{`edit-profile-\$\{profile\.id\}`\}/);
  assert.match(pageSource, /data-testid=\{`rotate-key-\$\{profile\.id\}`\}/);
  assert.match(pageSource, /data-testid=\{`delete-profile-\$\{profile\.id\}`\}/);
});

test("ai settings renders SettingsMenu and StatusMessage components", () => {
  assert.match(pageSource, /<SettingsMenu \/>/);
  assert.match(pageSource, /import \{ SettingsMenu \} from "@\/components\/settings\/SettingsMenu"/);
  assert.match(pageSource, /<StatusMessage>/);
  assert.match(pageSource, /import \{ StatusMessage \} from "@\/components\/feedback\/StatusMessage"/);
});

test("ai settings does not include failover or old preference UI", () => {
  assert.doesNotMatch(pageSource, /failover/i);
  assert.doesNotMatch(pageSource, /defaultProvider/);
  assert.doesNotMatch(pageSource, /defaultModel/);
});
