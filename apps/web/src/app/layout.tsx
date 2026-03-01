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
        <AppProviders>
          <AppGate>{children}</AppGate>
        </AppProviders>
      </body>
    </html>
  );
}
