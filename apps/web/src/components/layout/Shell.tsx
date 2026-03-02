"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MessageSquare } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { AssistantConversation } from "@/components/assistant/AssistantConversation";
import { HelpMenu } from "@/components/layout/HelpMenu";
import { useSession } from "@/lib/session";

const ASSISTANT_FOCUSABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[contenteditable='true']",
  "[tabindex]:not([tabindex='-1'])"
].join(",");

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useSession();
  const appEnv = process.env.NEXT_PUBLIC_APP_ENV || "local";

  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantFocusToken, setAssistantFocusToken] = useState(0);
  const assistantToggleRef = useRef<HTMLButtonElement | null>(null);
  const assistantSidebarRef = useRef<HTMLElement | null>(null);

  const routeLabel = useMemo(() => {
    if (pathname === "/") {
      return "Dashboard";
    }

    return pathname
      .split("/")
      .filter(Boolean)
      .map((segment) => segment.replace(/-/g, " "))
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(" / ");
  }, [pathname]);

  const getAssistantFocusableElements = useCallback(() => {
    if (!assistantSidebarRef.current) {
      return [];
    }

    return Array.from(assistantSidebarRef.current.querySelectorAll<HTMLElement>(ASSISTANT_FOCUSABLE_SELECTOR)).filter((element) => {
      if (element.hasAttribute("disabled") || element.getAttribute("aria-hidden") === "true") {
        return false;
      }

      const computedStyle = getComputedStyle(element);
      if (computedStyle.display === "none" || computedStyle.visibility === "hidden") {
        return false;
      }

      return !(element.offsetParent === null && computedStyle.position !== "fixed");
    });
  }, []);

  const focusAssistantFirstElement = useCallback(() => {
    const focusable = getAssistantFocusableElements();
    const fallbackTarget = assistantSidebarRef.current;
    const target = focusable[0] ?? fallbackTarget;
    target?.focus();
  }, [getAssistantFocusableElements]);

  const openAssistant = useCallback(() => {
    setAssistantOpen(true);
    setAssistantFocusToken((prev) => prev + 1);
  }, []);

  const closeAssistant = useCallback(() => {
    setAssistantOpen(false);
    requestAnimationFrame(() => {
      assistantToggleRef.current?.focus();
    });
  }, []);

  const toggleAssistant = useCallback(() => {
    if (assistantOpen) {
      closeAssistant();
      return;
    }
    openAssistant();
  }, [assistantOpen, closeAssistant, openAssistant]);

  useEffect(() => {
    if (!assistantOpen) {
      return;
    }

    requestAnimationFrame(() => {
      if (!assistantSidebarRef.current?.contains(document.activeElement)) {
        focusAssistantFirstElement();
      }
    });

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeAssistant();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusable = getAssistantFocusableElements();
      const activeElement = document.activeElement as HTMLElement | null;
      const firstElement = focusable[0];
      const lastElement = focusable[focusable.length - 1];

      if (!firstElement || !lastElement) {
        event.preventDefault();
        assistantSidebarRef.current?.focus();
        return;
      }

      const isOutsideSidebar = !activeElement || !assistantSidebarRef.current?.contains(activeElement);
      if (isOutsideSidebar) {
        event.preventDefault();
        if (event.shiftKey) {
          lastElement.focus();
        } else {
          focusAssistantFirstElement();
        }
        return;
      }

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
        return;
      }

      if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    function onFocusIn(event: FocusEvent) {
      const target = event.target as Node | null;
      if (!target || assistantSidebarRef.current?.contains(target)) {
        return;
      }

      focusAssistantFirstElement();
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, [assistantOpen, closeAssistant, focusAssistantFirstElement, getAssistantFocusableElements]);

  return (
    <div className="flex h-screen w-full flex-col bg-neutral-950 text-white md:flex-row">
      <div className="hidden md:block">
        <Sidebar />
      </div>

      <main id="app-main" tabIndex={-1} className="flex-1 overflow-y-auto pb-20 outline-none md:pb-0" data-testid="app-shell">
        <p className="sr-only" aria-live="polite" aria-atomic="true">{`Page: ${routeLabel}`}</p>
        <div className="mx-auto w-full max-w-6xl p-4 md:p-8">
          <header className="mb-6 flex flex-col gap-3 rounded-2xl border border-neutral-900 bg-neutral-950/50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-neutral-100">Minance</h1>
              <p className="text-sm text-neutral-500" data-testid="user-email">{user?.email ?? ""}</p>
              <p className="text-[11px] uppercase tracking-wide text-neutral-600">{appEnv}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <HelpMenu />
              <button
                ref={assistantToggleRef}
                type="button"
                onClick={toggleAssistant}
                data-testid="assistant-toggle"
                aria-controls="assistant-sidebar"
                aria-expanded={assistantOpen}
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
              >
                <MessageSquare className="h-4 w-4" aria-hidden="true" />
                AI Assistant
              </button>
              <button
                type="button"
                onClick={logout}
                data-testid="logout-button"
                className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm font-medium text-neutral-300 transition hover:bg-neutral-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
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
            id="assistant-sidebar"
            ref={assistantSidebarRef}
            data-testid="assistant-sidebar"
            role="dialog"
            aria-modal="true"
            aria-label="AI Assistant"
            tabIndex={-1}
            className="fixed inset-y-0 right-0 z-[80] w-full max-w-xl border-l border-neutral-900 bg-neutral-950/95 backdrop-blur-xl"
          >
            <AssistantConversation mode="panel" focusToken={assistantFocusToken} onClose={closeAssistant} />
          </aside>
        </>
      ) : null}
    </div>
  );
}
