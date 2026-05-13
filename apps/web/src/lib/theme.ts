export type AppTheme = "dark" | "light";

export const DEFAULT_APP_THEME: AppTheme = "dark";
export const APP_THEME_STORAGE_KEY = "minance.theme";

export function parseAppTheme(value: string | null | undefined): AppTheme | null {
  return value === "dark" || value === "light" ? value : null;
}

export function getDocumentAppTheme(): AppTheme {
  if (typeof document === "undefined") {
    return DEFAULT_APP_THEME;
  }

  return parseAppTheme(document.documentElement.dataset.theme) ?? DEFAULT_APP_THEME;
}

export function applyAppTheme(theme: AppTheme) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.theme = theme;
}

export function persistAppTheme(theme: AppTheme) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(APP_THEME_STORAGE_KEY, theme);
}

export function buildThemeInitScript() {
  return `(() => {
    try {
      const rawTheme = window.localStorage.getItem(${JSON.stringify(APP_THEME_STORAGE_KEY)});
      const theme = rawTheme === "light" || rawTheme === "dark" ? rawTheme : ${JSON.stringify(DEFAULT_APP_THEME)};
      document.documentElement.dataset.theme = theme;
    } catch {
      document.documentElement.dataset.theme = ${JSON.stringify(DEFAULT_APP_THEME)};
    }
  })();`;
}
