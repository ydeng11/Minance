"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MessageSquare, SlidersHorizontal } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { AssistantConversation } from "@/components/assistant/AssistantConversation";
import { HelpMenu } from "@/components/layout/HelpMenu";
import { getShellContentWidthClass } from "@/components/layout/shellWidth";
import { ViewDialog } from "@/components/view/ViewDialog";
import { useViewController } from "@/components/view/ViewController";
import { isViewRoute } from "@/components/view/viewRoutes";
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
  const { isViewOpen, toggleView, view } = useViewController();
  const appEnv = process.env.NEXT_PUBLIC_APP_ENV || "local";
  const shellContentWidthClass = getShellContentWidthClass(pathname);
  const showViewToggle = Boolean(view) && isViewRoute(pathname);

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
    <div className="flex h-screen w-full flex-col bg-app-bg text-text-primary md:flex-row">
      <div className="hidden md:block">
        <Sidebar />
      </div>

      <main id="app-main" tabIndex={-1} className="flex-1 overflow-y-auto pb-20 outline-none md:pb-0" data-testid="app-shell">
        <p className="sr-only" aria-live="polite" aria-atomic="true">{`Page: ${routeLabel}`}</p>
        <div className={`mx-auto w-full p-4 md:p-8 ${shellContentWidthClass}`}>
          <header className="mb-6 flex flex-col gap-4 rounded-[28px] border border-border-subtle bg-surface-panel/85 p-4 shadow-panel [background-image:var(--gradient-shell)] sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-muted">Workspace</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h1 className="font-display text-2xl font-semibold tracking-tight text-text-primary">Minance</h1>
                <span className="rounded-full border border-border-subtle bg-surface-field px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                  {appEnv}
                </span>
              </div>
              <p className="mt-2 text-sm text-text-secondary" data-testid="user-email">{user?.email ?? ""}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <HelpMenu />
              {showViewToggle ? (
                <button
                  type="button"
                  onClick={toggleView}
                  data-testid="shell-view-toggle"
                  aria-expanded={isViewOpen}
                  className="inline-flex items-center gap-2 rounded-xl border border-border-subtle bg-surface-field px-3 py-2 text-sm font-medium text-text-secondary transition hover:bg-surface-elevated hover:text-text-primary active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg"
                >
                  <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                  View
                </button>
              ) : null}
              <button
                ref={assistantToggleRef}
                type="button"
                onClick={toggleAssistant}
                data-testid="assistant-toggle"
                aria-controls="assistant-sidebar"
                aria-expanded={assistantOpen}
                className="inline-flex items-center gap-2 rounded-xl border border-accent/35 bg-accent-soft px-3 py-2 text-sm font-medium text-accent transition hover:bg-accent-soft/80 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg"
              >
                <MessageSquare className="h-4 w-4" aria-hidden="true" />
                AI Assistant
              </button>
              <button
                type="button"
                onClick={logout}
                data-testid="logout-button"
                className="rounded-xl border border-border-subtle bg-surface-field px-3 py-2 text-sm font-medium text-text-secondary transition hover:bg-surface-elevated hover:text-text-primary active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg"
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
        <button
          type="button"
          onClick={closeAssistant}
          data-testid="assistant-overlay"
          aria-label="Close assistant"
          className="fixed inset-0 z-[70] bg-app-bg/65 backdrop-blur-sm"
        />
      ) : null}
      <aside
        id="assistant-sidebar"
        ref={assistantSidebarRef}
        data-testid="assistant-sidebar"
        role="dialog"
        aria-modal={assistantOpen ? "true" : undefined}
        aria-hidden={assistantOpen ? undefined : true}
        aria-label="AI Assistant"
        tabIndex={-1}
        hidden={!assistantOpen}
        className="fixed inset-y-0 right-0 z-[80] w-full max-w-xl border-l border-border-subtle bg-surface-panel/95 shadow-panel [background-image:var(--gradient-shell)] backdrop-blur-xl"
      >
        <AssistantConversation mode="panel" focusToken={assistantFocusToken} onClose={closeAssistant} />
      </aside>

      <ViewDialog />
    </div>
  );
}
