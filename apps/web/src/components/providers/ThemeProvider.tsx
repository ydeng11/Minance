"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  applyAppTheme,
  getDocumentAppTheme,
  persistAppTheme,
  type AppTheme
} from "@/lib/theme";

interface ThemeContextValue {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>(() => getDocumentAppTheme());

  const setTheme = useCallback((nextTheme: AppTheme) => {
    setThemeState(nextTheme);
  }, []);

  useEffect(() => {
    applyAppTheme(theme);
    persistAppTheme(theme);
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      setTheme
    }),
    [theme, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useAppTheme must be used within a ThemeProvider");
  }

  return context;
}
