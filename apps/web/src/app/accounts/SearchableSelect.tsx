"use client";

import { useRef, useState, type KeyboardEvent } from "react";

export interface SearchableOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: SearchableOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  testId?: string;
  /** Show "Custom" option first in the list */
  showCustom?: boolean;
  /** Class overrides */
  className?: string;
}

const FIELD_CLASS =
  "min-h-[44px] w-full rounded-md border border-border-strong bg-surface-panel px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50";

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Search…",
  testId,
  showCustom = false,
  className = ""
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Derive the display label from the current value
  const selectedLabel = options.find((o) => o.value === value)?.label ?? value;

  // Filter options by search text
  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(searchText.toLowerCase())
  );

  // Prepend "Custom" option when desired
  const displayOptions = showCustom
    ? [{ value: "", label: "Custom account" }, ...filtered]
    : filtered;

  function handleInputChange(text: string) {
    setSearchText(text);
    if (!isOpen) setIsOpen(true);

    // If the user typed something that matches no option exactly,
    // allow freeform — set value to the raw text (custom input).
    onChange(text);
  }

  function handleSelect(opt: SearchableOption) {
    onChange(opt.value);
    setSearchText(opt.label);
    setIsOpen(false);
    inputRef.current?.blur();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
    if (e.key === "Enter" && displayOptions.length > 0) {
      e.preventDefault();
      handleSelect(displayOptions[0]);
    }
  }

  // Click outside to close
  function handleBlur() {
    // Delay to allow click on an option to register first
    setTimeout(() => {
      if (!containerRef.current?.contains(document.activeElement)) {
        setIsOpen(false);
      }
    }, 180);
  }

  function handleFocus() {
    setIsOpen(true);
    // Select all text on focus so typing replaces it
    inputRef.current?.select();
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="text"
        className={FIELD_CLASS}
        placeholder={placeholder}
        data-testid={testId}
        value={isOpen ? searchText : selectedLabel}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        role="combobox"
        aria-expanded={isOpen}
      />
      {isOpen && displayOptions.length > 0 && (
        <ul
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-md border border-border-subtle bg-surface-panel shadow-lg"
          role="listbox"
        >
          {displayOptions.map((opt) => (
            <li
              key={opt.value + opt.label}
              role="option"
              aria-selected={opt.value === value}
              className={`cursor-pointer px-3 py-2 text-sm transition hover:bg-accent/10 ${
                opt.value === value
                  ? "bg-accent/15 text-accent font-medium"
                  : "text-text-primary"
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(opt);
              }}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
