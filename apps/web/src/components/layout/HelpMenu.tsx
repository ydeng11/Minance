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
    "group block rounded-lg border border-neutral-900 bg-neutral-950/70 p-2 transition hover:border-neutral-700 hover:bg-neutral-900";

  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-neutral-100">{link.label}</span>
        {link.external ? <ExternalLink className="h-3.5 w-3.5 text-neutral-500 group-hover:text-neutral-300" /> : null}
      </div>
      <p className="mt-1 text-xs text-neutral-400">{link.description}</p>
    </>
  );

  if (link.external) {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noreferrer"
        className={classes}
        data-testid={`help-menu-link-${link.id}`}
        onClick={onSelect}
      >
        {content}
      </a>
    );
  }

  return (
    <Link href={link.href} className={classes} data-testid={`help-menu-link-${link.id}`} onClick={onSelect}>
      {content}
    </Link>
  );
}

export function HelpMenu() {
  const resources = getHelpResources();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
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
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        data-testid="help-menu-toggle"
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition",
          open
            ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-300"
            : "border-neutral-800 bg-neutral-900 text-neutral-200 hover:border-neutral-700 hover:text-white"
        )}
      >
        <CircleHelp className="h-4 w-4" />
        Help
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-2 w-[320px] rounded-xl border border-neutral-800 bg-neutral-950/95 p-3 shadow-2xl shadow-black/40 backdrop-blur"
          data-testid="help-menu-panel"
        >
          <section>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Documentation</p>
            <div className="mt-2 grid gap-2">
              {resources.docsLinks.map((link) => (
                <HelpMenuItem key={link.id} link={link} onSelect={() => setOpen(false)} />
              ))}
            </div>
          </section>

          <section className="mt-3 border-t border-neutral-900 pt-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Support</p>
            <div className="mt-2 grid gap-2">
              {resources.supportLinks.map((link) => (
                <HelpMenuItem key={link.id} link={link} onSelect={() => setOpen(false)} />
              ))}
              {resources.messengerLink ? (
                <HelpMenuItem link={resources.messengerLink} onSelect={() => setOpen(false)} />
              ) : (
                <div
                  className="rounded-lg border border-neutral-900 bg-neutral-950/70 p-2 text-xs text-neutral-400"
                  data-testid="help-menu-messenger-disabled"
                >
                  <div className="flex items-center gap-1.5 text-neutral-300">
                    <MessageCircle className="h-3.5 w-3.5 text-neutral-500" />
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
