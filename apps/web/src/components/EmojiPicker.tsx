"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { EmojiPicker as RichEmojiPicker } from "@ferrucc-io/emoji-picker";
import { ChevronDown, X } from "lucide-react";

interface EmojiPickerProps {
  ariaLabel: string;
  disabled?: boolean;
  placeholder?: string;
  triggerClassName?: string;
  triggerTestId?: string;
  value: string;
  onChange: (value: string) => void;
}

interface PickerPosition {
  top: number;
  left: number;
}

function normalizeEmoji(value: string) {
  return String(value || "").trim();
}

export function EmojiPicker({
  ariaLabel,
  disabled = false,
  placeholder = "Choose emoji",
  triggerClassName = "",
  triggerTestId,
  value,
  onChange
}: EmojiPickerProps) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<PickerPosition>({ top: 0, left: 0 });

  const normalizedValue = normalizeEmoji(value);
  const triggerLabel = normalizedValue || placeholder;

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) {
      return;
    }

    const rect = trigger.getBoundingClientRect();
    const panelWidth = Math.min(384, window.innerWidth - 24);
    const left = Math.min(
      Math.max(12, rect.left),
      Math.max(12, window.innerWidth - panelWidth - 12)
    );

    setPosition({
      top: rect.bottom + 8,
      left
    });
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    updatePosition();

    function handlePointerDown(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }
      setIsOpen(false);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    function handleViewportChange() {
      updatePosition();
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [isOpen, updatePosition]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        disabled={disabled}
        data-testid={triggerTestId}
        onClick={() => {
          if (disabled) {
            return;
          }
          if (!isOpen) {
            updatePosition();
          }
          setIsOpen((previous) => !previous);
        }}
        className={`inline-flex items-center justify-between gap-2 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-left text-sm text-neutral-100 outline-none transition hover:border-emerald-500/40 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-60 ${triggerClassName}`}
      >
        <span className="min-w-0 truncate">{triggerLabel}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-neutral-400" />
      </button>
      {typeof document !== "undefined" && isOpen ? createPortal(
        <div
          ref={panelRef}
          data-testid="emoji-picker"
          className="fixed z-[120] w-[min(24rem,calc(100vw-1.5rem))] rounded-2xl border border-neutral-800 bg-neutral-950 p-3 shadow-2xl"
          style={{ top: position.top, left: position.left }}
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-neutral-100">Select emoji</p>
              <p className="text-xs text-neutral-400">Search the full emoji catalog for categories and taxonomy groups.</p>
            </div>
            <button
              type="button"
              aria-label="Close emoji picker"
              onClick={() => setIsOpen(false)}
              className="rounded-md border border-neutral-800 bg-neutral-900 p-1.5 text-neutral-300 transition hover:bg-neutral-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              onChange("");
              setIsOpen(false);
            }}
            className={`mb-3 flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${
              !normalizedValue
                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-200"
                : "border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-800"
            }`}
          >
            <span>No emoji</span>
            {!normalizedValue ? <span className="text-xs uppercase tracking-wide">Selected</span> : null}
          </button>

          <RichEmojiPicker
            className="w-full border-0 bg-transparent shadow-none"
            emojisPerRow={8}
            emojiSize={28}
            onEmojiSelect={(emoji) => {
              onChange(emoji);
              setIsOpen(false);
            }}
          >
            <RichEmojiPicker.Header className="px-0 pb-3">
              <RichEmojiPicker.Input
                autoFocus
                data-testid="emoji-picker-search"
                placeholder="Search emoji"
                className="h-10 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-sm text-neutral-100 placeholder:text-neutral-400 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500/40"
                hideIcon
              />
            </RichEmojiPicker.Header>
            <RichEmojiPicker.Group className="rounded-xl border border-neutral-800 bg-neutral-950/60">
              <RichEmojiPicker.List containerHeight={320} hideStickyHeader />
            </RichEmojiPicker.Group>
          </RichEmojiPicker>
        </div>,
        document.body
      ) : null}
    </>
  );
}
