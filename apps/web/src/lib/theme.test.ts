import test from "node:test";
import assert from "node:assert/strict";
import {
  APP_THEME_STORAGE_KEY,
  DEFAULT_APP_THEME,
  buildThemeInitScript,
  parseAppTheme
} from "./theme";

test("parseAppTheme accepts supported values and rejects invalid input", () => {
  assert.equal(parseAppTheme("dark"), "dark");
  assert.equal(parseAppTheme("light"), "light");
  assert.equal(parseAppTheme("system"), null);
  assert.equal(parseAppTheme(""), null);
  assert.equal(parseAppTheme(null), null);
});

test("buildThemeInitScript reads persisted theme and falls back to the default", () => {
  const script = buildThemeInitScript();

  assert.match(script, new RegExp(APP_THEME_STORAGE_KEY));
  assert.match(script, /document\.documentElement\.dataset\.theme/);
  assert.match(script, new RegExp(DEFAULT_APP_THEME));
});
