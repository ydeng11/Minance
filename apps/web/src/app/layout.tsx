import type { Metadata } from "next";
import "@/app/globals.css";
import { AppProviders } from "@/components/providers/AppProviders";
import { AppGate } from "@/components/auth/AppGate";

export const metadata: Metadata = {
  title: "Minance | AI Finance",
  description: "Personal finance, reinvented."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">
        <a
          href="#app-main"
          className="sr-only fixed left-3 top-3 z-[120] rounded-md bg-emerald-500 px-3 py-2 text-sm font-semibold text-neutral-950 focus:not-sr-only focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
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
