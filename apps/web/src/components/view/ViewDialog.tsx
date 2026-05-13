"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { trapDialogTabKey } from "@/lib/dialogFocus";
import { useViewController } from "./ViewController";

export function ViewDialog() {
  const { actions, closeView, isViewOpen, view } = useViewController();
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLElement | null>(null);
  const previousFocusedElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isViewOpen) {
      return;
    }

    previousFocusedElementRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    requestAnimationFrame(() => {
      dialogRef.current?.focus();
    });

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeView();
        return;
      }

      trapDialogTabKey(event, dialogRef.current);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      requestAnimationFrame(() => {
        previousFocusedElementRef.current?.focus();
      });
    };
  }, [closeView, isViewOpen]);

  if (!isViewOpen || !view) {
    return null;
  }

  const title = view.title || "View";
  const description = view.description || "Refine Explorer and Transactions filters from the shell.";

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-app-bg/70 px-4 py-8 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          closeView();
        }
      }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        data-testid="shell-view-dialog"
        className="w-full max-w-5xl rounded-[30px] border border-border-subtle bg-surface-panel p-5 shadow-dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-accent/80">View</p>
            <h2 id={titleId} className="mt-2 text-2xl font-semibold tracking-tight text-text-primary">
              {title}
            </h2>
            <p id={descriptionId} className="mt-2 max-w-3xl text-sm text-text-secondary">
              {description}
            </p>
          </div>
          <button
            type="button"
            onClick={closeView}
            aria-label="Close view"
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border-subtle bg-surface-field text-text-secondary transition hover:bg-surface-elevated hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6">{view.content}</div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle pt-4">
          <button
            type="button"
            onClick={actions?.onReset}
            disabled={!actions?.onReset}
            data-testid="shell-view-reset"
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-border-subtle bg-surface-field px-4 text-sm font-medium text-text-secondary transition hover:bg-surface-elevated hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reset
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={closeView}
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-border-subtle bg-surface-field px-4 text-sm font-medium text-text-secondary transition hover:bg-surface-elevated hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                actions?.onApply?.();
                closeView();
              }}
              disabled={!actions?.onApply}
              data-testid="shell-view-apply"
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-accent/35 bg-accent-soft px-4 text-sm font-medium text-accent transition hover:bg-accent-soft/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg disabled:cursor-not-allowed disabled:opacity-50"
            >
              Apply
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
