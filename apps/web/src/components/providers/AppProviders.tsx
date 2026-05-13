"use client";

import { Toaster } from "sonner";
import { CommandPalette } from "@/components/command-palette/CommandPalette";
import { ViewControllerProvider } from "@/components/view/ViewController";
import { ThemeProvider, useAppTheme } from "@/components/providers/ThemeProvider";
import { SessionProvider } from "@/lib/session";

function AppProvidersContent({ children }: { children: React.ReactNode }) {
  const { theme } = useAppTheme();

  return (
    <ViewControllerProvider>
      {children}
      <CommandPalette />
      <Toaster closeButton position="top-center" richColors theme={theme} />
    </ViewControllerProvider>
  );
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <AppProvidersContent>{children}</AppProvidersContent>
      </ThemeProvider>
    </SessionProvider>
  );
}
