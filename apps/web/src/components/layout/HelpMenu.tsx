"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, CircleHelp, ExternalLink, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getHelpResources, type HelpLink } from "@/components/help/helpResources";

function HelpMenuItem({
  link,
  onSelect
}: {
  link: HelpLink;
  onSelect: () => void;
}) {
  const classes =
    "group block rounded-xl border border-border-subtle bg-surface-field p-3 transition hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg";

  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-text-primary">{link.label}</span>
        {link.external ? <ExternalLink className="h-3.5 w-3.5 text-text-muted group-hover:text-text-secondary" aria-hidden="true" /> : null}
      </div>
      <p className="mt-1 text-xs text-text-secondary">{link.description}</p>
    </>
  );

  if (link.external) {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noreferrer"
        role="menuitem"
        className={classes}
        data-testid={`help-menu-link-${link.id}`}
        data-help-item
        onClick={onSelect}
      >
        {content}
      </a>
    );
  }

  return (
    <Link
      href={link.href}
      role="menuitem"
      className={classes}
      data-testid={`help-menu-link-${link.id}`}
      data-help-item
      onClick={onSelect}
    >
      {content}
    </Link>
  );
}

export function HelpMenu() {
  const resources = getHelpResources();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);

  function closeMenu(restoreFocus = false) {
    setOpen(false);
    if (!restoreFocus) {
      return;
    }

    requestAnimationFrame(() => {
      toggleRef.current?.focus();
    });
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    const firstItem = panelRef.current?.querySelector<HTMLElement>("[data-help-item]");
    firstItem?.focus();

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        closeMenu();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeMenu(true);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={containerRef} data-testid="help-menu">
      <button
        ref={toggleRef}
        id="help-menu-toggle"
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        data-testid="help-menu-toggle"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls="help-menu-panel"
        className={cn(
          "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg",
          open
            ? "border-accent/35 bg-accent-soft text-accent"
            : "border-border-subtle bg-surface-field text-text-secondary hover:bg-surface-elevated hover:text-text-primary"
        )}
      >
        <CircleHelp className="h-4 w-4" aria-hidden="true" />
        Help
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>

      {open ? (
        <div
          id="help-menu-panel"
          ref={panelRef}
          role="menu"
          aria-labelledby="help-menu-toggle"
          className="absolute right-0 top-full z-40 mt-2 w-[320px] rounded-[24px] border border-border-subtle bg-surface-panel/95 p-3 shadow-dialog [background-image:var(--gradient-shell)] backdrop-blur"
          data-testid="help-menu-panel"
        >
          <section>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-muted">Documentation</p>
            <div className="mt-2 grid gap-2">
              {resources.docsLinks.map((link) => (
                <HelpMenuItem key={link.id} link={link} onSelect={() => closeMenu()} />
              ))}
            </div>
          </section>

          <section className="mt-3 border-t border-border-subtle pt-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-muted">Support</p>
            <div className="mt-2 grid gap-2">
              {resources.supportLinks.map((link) => (
                <HelpMenuItem key={link.id} link={link} onSelect={() => closeMenu()} />
              ))}
              {resources.messengerLink ? (
                <HelpMenuItem link={resources.messengerLink} onSelect={() => closeMenu()} />
              ) : (
                <div
                  className="rounded-xl border border-border-subtle bg-surface-field p-3 text-xs text-text-secondary"
                  data-testid="help-menu-messenger-disabled"
                >
                  <div className="flex items-center gap-1.5 text-text-primary">
                    <MessageCircle className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
                    Messenger integration disabled
                  </div>
                  <p className="mt-1">
                    Set <code>NEXT_PUBLIC_HELP_MESSENGER_URL</code> to enable external chat support.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
