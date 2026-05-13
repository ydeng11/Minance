import type { Metadata } from "next";
import localFont from "next/font/local";
import "@/app/globals.css";
import { AppProviders } from "@/components/providers/AppProviders";
import { AppGate } from "@/components/auth/AppGate";
import { DEFAULT_APP_THEME, buildThemeInitScript } from "@/lib/theme";

const bodyFont = localFont({
  src: [
    { path: "./fonts/ibm-plex-sans-latin.woff2", weight: "400", style: "normal" },
    { path: "./fonts/ibm-plex-sans-latin.woff2", weight: "500", style: "normal" },
    { path: "./fonts/ibm-plex-sans-latin.woff2", weight: "600", style: "normal" },
    { path: "./fonts/ibm-plex-sans-latin.woff2", weight: "700", style: "normal" }
  ],
  variable: "--font-body",
  display: "swap"
});

const displayFont = localFont({
  src: [
    { path: "./fonts/fraunces-latin.woff2", weight: "500", style: "normal" },
    { path: "./fonts/fraunces-latin.woff2", weight: "600", style: "normal" },
    { path: "./fonts/fraunces-latin.woff2", weight: "700", style: "normal" }
  ],
  variable: "--font-editorial",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Minance | AI Finance",
  description: "Personal finance, reinvented."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme={DEFAULT_APP_THEME} suppressHydrationWarning>
      <head>
        <script id="app-theme-init" dangerouslySetInnerHTML={{ __html: buildThemeInitScript() }} />
      </head>
      <body className={`${bodyFont.variable} ${displayFont.variable} min-h-screen bg-app-bg text-text-primary font-sans antialiased`}>
        <a
          href="#app-main"
          className="sr-only fixed left-3 top-3 z-[120] rounded-md bg-accent px-3 py-2 text-sm font-semibold text-app-bg focus:not-sr-only focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          Skip to main content
        </a>
        <AppProviders>
          <AppGate>{children}</AppGate>
        </AppProviders>
      </body>
    </html>
  );
}
