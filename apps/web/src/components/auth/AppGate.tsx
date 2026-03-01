"use client";

import { AuthPanel } from "@/components/auth/AuthPanel";
import { Shell } from "@/components/layout/Shell";
import { useSession } from "@/lib/session";

export function AppGate({ children }: { children: React.ReactNode }) {
  const { status } = useSession();

  if (status === "loading") {
    return (
      <main className="grid min-h-screen place-items-center bg-neutral-950">
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-4 py-3 text-sm text-neutral-300">Loading session...</div>
      </main>
    );
  }

  if (status === "unauthenticated") {
    return <AuthPanel />;
  }

  return <Shell>{children}</Shell>;
}
