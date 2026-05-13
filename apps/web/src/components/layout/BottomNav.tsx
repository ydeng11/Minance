"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  LineChart,
  PieChart,
  WalletCards,
  Tags,
  Repeat2,
  UploadCloud,
  Settings,
  Menu
} from "lucide-react";
import { trapDialogTabKey } from "@/lib/dialogFocus";
import { cn } from "@/lib/utils";

const PRIMARY_NAV_ITEMS = [
  { name: "Home", href: "/", icon: Home, testId: "mnav-dashboard" },
  { name: "Explore", href: "/explorer", icon: LineChart, testId: "mnav-explorer" },
  { name: "Txns", href: "/transactions", icon: PieChart, testId: "mnav-transactions" },
  // TODO(maybe-later): Re-enable Investments mobile navigation when product scope includes investments again.
  { name: "Import", href: "/import", icon: UploadCloud, testId: "mnav-import" }
];

const SECONDARY_NAV_ITEMS = [
  { name: "Accts", href: "/accounts", icon: WalletCards, testId: "mnav-accounts" },
  { name: "Cats", href: "/categories", icon: Tags, testId: "mnav-categories" },
  { name: "Recur", href: "/recurrings", icon: Repeat2, testId: "mnav-recurrings" },
  { name: "Settings", href: "/settings", icon: Settings, testId: "mnav-settings" }
];

export function BottomNav() {
  const pathname = usePathname();
  const [moreOpenPathname, setMoreOpenPathname] = useState<string | null>(null);
  const moreButtonRef = useRef<HTMLButtonElement | null>(null);
  const moreDialogRef = useRef<HTMLDivElement | null>(null);
  const firstSecondaryLinkRef = useRef<HTMLAnchorElement | null>(null);
  const moreOpen = moreOpenPathname === pathname;

  function isRouteActive(href: string) {
    if (href === "/") {
      return pathname === "/";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function closeMore(restoreFocus = true) {
    setMoreOpenPathname(null);
    if (!restoreFocus) {
      return;
    }

    requestAnimationFrame(() => {
      moreButtonRef.current?.focus();
    });
  }

  function toggleMore() {
    if (moreOpen) {
      closeMore(false);
      return;
    }

    setMoreOpenPathname(pathname);
  }

  const isSecondaryRoute = SECONDARY_NAV_ITEMS.some((item) => isRouteActive(item.href));

  useEffect(() => {
    if (!moreOpen) {
      return;
    }

    requestAnimationFrame(() => {
      firstSecondaryLinkRef.current?.focus();
    });

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMore();
        return;
      }

      trapDialogTabKey(event, moreDialogRef.current);
    }

    function onFocusIn(event: FocusEvent) {
      const target = event.target as Node | null;
      if (!target || moreDialogRef.current?.contains(target)) {
        return;
      }

      firstSecondaryLinkRef.current?.focus();
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, [moreOpen]);

  return (
    <>
      {moreOpen ? (
        <button
          type="button"
          aria-label="Close more navigation"
          className="fixed inset-0 z-[54] bg-app-bg/65 backdrop-blur-sm md:hidden"
          data-testid="mobile-more-overlay"
          onClick={() => closeMore()}
        />
      ) : null}

      {moreOpen ? (
        <div
          id="mobile-more-nav"
          ref={moreDialogRef}
          role="dialog"
          aria-modal="true"
          aria-label="More navigation"
          tabIndex={-1}
          data-testid="mobile-more-nav"
          className="fixed inset-x-3 bottom-24 z-[55] rounded-[24px] border border-border-subtle bg-surface-panel/95 p-3 shadow-dialog [background-image:var(--gradient-shell)] backdrop-blur-xl md:hidden"
        >
          <div className="mb-2 flex items-center justify-between gap-2 px-1">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-muted">More</p>
            <button
              type="button"
              onClick={() => closeMore()}
              className="rounded-lg border border-border-subtle bg-surface-field px-2 py-1 text-xs text-text-secondary transition hover:bg-surface-elevated hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {SECONDARY_NAV_ITEMS.map((item, index) => {
              const isActive = isRouteActive(item.href);
              return (
                <Link
                  key={item.href}
                  ref={index === 0 ? firstSecondaryLinkRef : undefined}
                  href={item.href}
                  data-testid={`mnav-more-${item.href.slice(1)}`}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => closeMore(false)}
                  className={cn(
                    "flex min-h-[44px] items-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg",
                    isActive
                      ? "border-accent/35 bg-accent-soft text-accent"
                      : "border-border-subtle bg-surface-field text-text-primary hover:bg-surface-elevated"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}

      <nav
        className="fixed inset-x-0 bottom-0 z-[56] border-t border-border-subtle bg-surface-panel/90 px-2 py-2 shadow-panel [background-image:var(--gradient-shell)] backdrop-blur-xl md:hidden"
        data-testid="mobile-nav"
        aria-label="Primary"
      >
        <div className="grid grid-cols-5 gap-1">
          {PRIMARY_NAV_ITEMS.map((item) => {
            const isActive = isRouteActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                data-testid={item.testId}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex min-h-[44px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-2 py-3 text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg",
                  isActive ? "bg-accent-soft/70 text-accent" : "text-text-secondary hover:bg-surface-elevated/80 hover:text-text-primary"
                )}
              >
                <item.icon className={cn("h-4 w-4", isActive && "text-accent")} aria-hidden="true" />
                {item.name}
              </Link>
            );
          })}

          <button
            ref={moreButtonRef}
            type="button"
            data-testid="mnav-more"
            aria-expanded={moreOpen}
            aria-controls="mobile-more-nav"
            className={cn(
              "flex min-h-[44px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-2 py-3 text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg",
              moreOpen || isSecondaryRoute
                ? "bg-accent-soft/70 text-accent"
                : "text-text-secondary hover:bg-surface-elevated/80 hover:text-text-primary"
            )}
            onClick={toggleMore}
          >
            <Menu className={cn("h-4 w-4", (moreOpen || isSecondaryRoute) && "text-accent")} aria-hidden="true" />
            More
          </button>
        </div>
      </nav>
    </>
  );
}
