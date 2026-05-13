"use client";

import { AuthPanel } from "@/components/auth/AuthPanel";
import { Shell } from "@/components/layout/Shell";
import { useSession } from "@/lib/session";

export function AppGate({ children }: { children: React.ReactNode }) {
  const { status } = useSession();

  if (status === "loading") {
    return (
      <main className="grid min-h-screen place-items-center bg-app-bg text-text-primary">
        <div className="rounded-lg border border-border-subtle bg-surface-panel/85 px-4 py-3 text-sm text-text-secondary shadow-panel">
          Loading session...
        </div>
      </main>
    );
  }

  if (status === "unauthenticated") {
    return <AuthPanel />;
  }

  return <Shell>{children}</Shell>;
}
