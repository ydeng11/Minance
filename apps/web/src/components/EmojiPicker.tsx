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

const TRIGGER_CLASS_NAME =
  "inline-flex items-center justify-between gap-2 rounded-lg border border-border-strong bg-surface-field px-3 py-2 text-left text-sm text-text-primary outline-none transition hover:border-accent/40 focus:border-accent focus:ring-1 focus:ring-focus-ring disabled:cursor-not-allowed disabled:opacity-60";
const OPTION_BASE_CLASS = "mb-3 flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm transition";
const OPTION_SELECTED_CLASS = "border-accent/50 bg-accent-soft text-accent";
const OPTION_UNSELECTED_CLASS =
  "border-border-subtle bg-surface-field text-text-secondary hover:border-border-strong hover:bg-surface-elevated";

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
        className={`${TRIGGER_CLASS_NAME} ${triggerClassName}`}
      >
        <span className="min-w-0 truncate">{triggerLabel}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-text-secondary" />
      </button>
      {typeof document !== "undefined" && isOpen ? createPortal(
        <div
          ref={panelRef}
          data-testid="emoji-picker"
          className="fixed z-[120] w-[min(24rem,calc(100vw-1.5rem))] rounded-2xl border border-border-subtle bg-surface-panel p-3 shadow-dialog"
          style={{ top: position.top, left: position.left }}
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-text-primary">Select emoji</p>
              <p className="text-xs text-text-secondary">Search the full emoji catalog for categories and taxonomy groups.</p>
            </div>
            <button
              type="button"
              aria-label="Close emoji picker"
              onClick={() => setIsOpen(false)}
              className="rounded-md border border-border-subtle bg-surface-field p-1.5 text-text-secondary transition hover:bg-surface-elevated hover:text-text-primary"
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
            className={`${OPTION_BASE_CLASS} ${!normalizedValue ? OPTION_SELECTED_CLASS : OPTION_UNSELECTED_CLASS}`}
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
                className="h-10 w-full rounded-lg border border-border-strong bg-surface-field px-3 text-sm text-text-primary placeholder:text-text-secondary outline-none focus:border-accent focus:ring-1 focus:ring-focus-ring"
                hideIcon
              />
            </RichEmojiPicker.Header>
            <RichEmojiPicker.Group className="rounded-xl border border-border-subtle bg-surface-field/60">
              <RichEmojiPicker.List containerHeight={320} hideStickyHeader />
            </RichEmojiPicker.Group>
          </RichEmojiPicker>
        </div>,
        document.body
      ) : null}
    </>
  );
}
