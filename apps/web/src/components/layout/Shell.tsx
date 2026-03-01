"use client";

import { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { AssistantConversation } from "@/components/assistant/AssistantConversation";
import { useSession } from "@/lib/session";

export function Shell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useSession();
  const appEnv = process.env.NEXT_PUBLIC_APP_ENV || "local";

  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantFocusToken, setAssistantFocusToken] = useState(0);

  function openAssistant() {
    setAssistantOpen(true);
    setAssistantFocusToken((prev) => prev + 1);
  }

  function closeAssistant() {
    setAssistantOpen(false);
  }

  function toggleAssistant() {
    if (assistantOpen) {
      closeAssistant();
      return;
    }
    openAssistant();
  }

  useEffect(() => {
    if (!assistantOpen) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeAssistant();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [assistantOpen]);

  return (
    <div className="flex h-screen w-full flex-col bg-neutral-950 text-white md:flex-row">
      <div className="hidden md:block">
        <Sidebar />
      </div>

      <main className="flex-1 overflow-y-auto pb-20 md:pb-0" data-testid="app-shell">
        <div className="mx-auto w-full max-w-6xl p-4 md:p-8">
          <header className="mb-6 flex flex-col gap-3 rounded-2xl border border-neutral-900 bg-neutral-950/50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-neutral-100">Minance</h1>
              <p className="text-sm text-neutral-500" data-testid="user-email">{user?.email ?? ""}</p>
              <p className="text-[11px] uppercase tracking-wide text-neutral-600">{appEnv}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={toggleAssistant}
                data-testid="assistant-toggle"
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20"
              >
                <MessageSquare className="h-4 w-4" />
                AI Assistant
              </button>
              <button
                type="button"
                onClick={logout}
                data-testid="logout-button"
                className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm font-medium text-neutral-300 transition hover:bg-neutral-800 hover:text-white"
              >
                Log out
              </button>
            </div>
          </header>
          {children}
        </div>
      </main>

      <BottomNav />

      {assistantOpen ? (
        <>
          <button
            type="button"
            onClick={closeAssistant}
            data-testid="assistant-overlay"
            aria-label="Close assistant"
            className="fixed inset-0 z-[70] bg-black/45"
          />
          <aside
            data-testid="assistant-sidebar"
            role="dialog"
            aria-modal="true"
            aria-label="AI Assistant"
            className="fixed inset-y-0 right-0 z-[80] w-full max-w-xl border-l border-neutral-900 bg-neutral-950/95 backdrop-blur-xl"
          >
            <AssistantConversation mode="panel" focusToken={assistantFocusToken} onClose={closeAssistant} />
          </aside>
        </>
      ) : null}
    </div>
  );
}
