"use client";

import { SessionProvider } from "@/lib/session";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
