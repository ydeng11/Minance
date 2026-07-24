"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  URL sanitisation                                                    */
/* ------------------------------------------------------------------ */

const SAFE_PROTOCOLS = ["http:", "https:", "mailto:", "tel:", "ftp:"];
function sanitiseUrl(url: string): string | null {
  // Relative URL (starts with /, ., or has no protocol) — safe, return as-is
  if (url.startsWith("/") || url.startsWith(".") || !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url)) {
    return url;
  }
  try {
    const parsed = new URL(url);
    if (!SAFE_PROTOCOLS.includes(parsed.protocol)) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Inline tokenizer — coalesces consecutive plain-text chars           */
/* ------------------------------------------------------------------ */

interface InlineToken {
  text: string;
  bold?: true;
  italic?: true;
  code?: true;
  link?: { href: string };
}

function tokenizeInline(text: string): InlineToken[] {
  const result: InlineToken[] = [];
  let plainStart = 0;

  const flushPlain = (end: number) => {
    if (end > plainStart) {
      result.push({ text: text.slice(plainStart, end) });
    }
  };

  for (let i = 0; i < text.length; ) {
    // Inline code
    if (text.startsWith("`", i)) {
      const end = text.indexOf("`", i + 1);
      if (end !== -1) {
        flushPlain(i);
        result.push({ text: text.slice(i + 1, end), code: true });
        plainStart = end + 1;
        i = end + 1;
        continue;
      }
    }

    // Bold (**)
    if (text.startsWith("**", i)) {
      const end = text.indexOf("**", i + 2);
      if (end !== -1 && end !== i + 2) {
        flushPlain(i);
        result.push({ text: text.slice(i + 2, end), bold: true });
        plainStart = end + 2;
        i = end + 2;
        continue;
      }
    }

    // Italic (*single)
    if (text[i] === "*" && text[i + 1] !== "*") {
      const end = text.indexOf("*", i + 1);
      if (end !== -1) {
        flushPlain(i);
        if (text[end + 1] === "*" && text[end + 2] === "*") {
          // ***text*** → bold+italic
          result.push({ text: text.slice(i + 1, end), bold: true, italic: true });
          plainStart = end + 3;
          i = end + 3;
          continue;
        }
        result.push({ text: text.slice(i + 1, end), italic: true });
        plainStart = end + 1;
        i = end + 1;
        continue;
      }
    }

    // Link [text](url)
    if (text[i] === "[") {
      const closeB = text.indexOf("](", i);
      if (closeB !== -1) {
        const linkText = text.slice(i + 1, closeB);
        const closeP = text.indexOf(")", closeB + 2);
        if (closeP !== -1) {
          const href = text.slice(closeB + 2, closeP);
          const safe = sanitiseUrl(href);
          if (safe) {
            flushPlain(i);
            result.push({ text: linkText, link: { href: safe } });
            plainStart = closeP + 1;
            i = closeP + 1;
            continue;
          }
        }
      }
    }

    i += 1;
  }

  // Flush remaining plain text
  flushPlain(text.length);

  // Coalesce consecutive plain-text tokens
  const out: InlineToken[] = [];
  for (const t of result) {
    if (!t.bold && !t.italic && !t.code && !t.link) {
      const last = out[out.length - 1];
      if (last && !last.bold && !last.italic && !last.code && !last.link) {
        last.text += t.text;
        continue;
      }
    }
    out.push({ ...t });
  }

  return out;
}

/* ------------------------------------------------------------------ */
/*  Inline renderer                                                     */
/* ------------------------------------------------------------------ */

function InlineContent({ tokens }: { tokens: InlineToken[] }) {
  if (tokens.length === 0) return null;
  if (tokens.length === 1 && !tokens[0]!.bold && !tokens[0]!.italic && !tokens[0]!.code && !tokens[0]!.link) {
    // Single plain span — skip the wrapper <span>
    return <>{tokens[0]!.text}</>;
  }

  return (
    <>
      {tokens.map((token, i) => {
        const key = `${token.text}-${i}`;
        if (token.code) {
          return (
            <code
              key={key}
              className="rounded bg-surface-elevated px-1 py-0.5 text-xs font-mono text-text-primary"
            >
              {token.text}
            </code>
          );
        }
        if (token.link) {
          return (
            <a
              key={key}
              href={token.link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline underline-offset-2 hover:text-accent/80"
            >
              {token.text}
            </a>
          );
        }
        if (token.bold && token.italic) {
          return (
            <strong key={key} className="font-bold italic">
              {token.text}
            </strong>
          );
        }
        if (token.bold) {
          return (
            <strong key={key} className="font-semibold">
              {token.text}
            </strong>
          );
        }
        if (token.italic) {
          return (
            <em key={key} className="italic">
              {token.text}
            </em>
          );
        }
        return <span key={key}>{token.text}</span>;
      })}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Table detection                                                     */
/* ------------------------------------------------------------------ */

const TABLE_ROW_RE = /^\|.+\|$/;
const TABLE_SEPARATOR_RE = /^\|[\s:|\-]+\|$/;

interface TableBlock {
  type: "table";
  headers: string[];
  rows: string[][];
}

interface ParagraphBlock {
  type: "paragraph";
  lines: string[];
}

interface HeadingBlock {
  type: "heading";
  level: number;
  text: string;
}

interface ListBlock {
  type: "list";
  ordered: boolean;
  items: string[];
}

function parseBlocks(lines: string[]): (ParagraphBlock | HeadingBlock | ListBlock | TableBlock)[] {
  const blocks: (ParagraphBlock | HeadingBlock | ListBlock | TableBlock)[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!;
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    // Heading
    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({ type: "heading", level: headingMatch[1]!.length, text: headingMatch[2]! });
      i += 1;
      continue;
    }

    // Table
    if (TABLE_ROW_RE.test(trimmed) && i + 1 < lines.length && TABLE_SEPARATOR_RE.test(lines[i + 1]!.trim())) {
      const headerCells = parseTableRow(trimmed);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length) {
        const rowTrimmed = lines[i]!.trim();
        if (!TABLE_ROW_RE.test(rowTrimmed)) break;
        rows.push(parseTableRow(rowTrimmed));
        i += 1;
      }
      blocks.push({ type: "table", headers: headerCells, rows });
      continue;
    }

    // Unordered list
    if (/^[-*+]\s/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length) {
        const itemTrimmed = lines[i]!.trim();
        const listMatch = itemTrimmed.match(/^[-*+]\s+(.*)$/);
        if (!listMatch) break;
        items.push(listMatch[1]!);
        i += 1;
      }
      blocks.push({ type: "list", ordered: false, items });
      continue;
    }

    // Ordered list
    if (/^\d+[.)]\s/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length) {
        const itemTrimmed = lines[i]!.trim();
        const listMatch = itemTrimmed.match(/^\d+[.)]\s+(.*)$/);
        if (!listMatch) break;
        items.push(listMatch[1]!);
        i += 1;
      }
      blocks.push({ type: "list", ordered: true, items });
      continue;
    }

    // Paragraph (lone pipe lines are paragraph content, not tables)
    const paraLines: string[] = [];
    while (i < lines.length) {
      const ct = lines[i]!.trim();
      if (!ct) break;
      if (/^(#{1,3})\s/.test(ct)) break;
      if (TABLE_ROW_RE.test(ct)) {
        if (i + 1 < lines.length && TABLE_SEPARATOR_RE.test(lines[i + 1]!.trim())) break;
        paraLines.push(ct);
        i += 1;
        continue;
      }
      if (/^[-*+]\s/.test(ct)) break;
      if (/^\d+[.)]\s/.test(ct)) break;
      paraLines.push(ct);
      i += 1;
    }
    if (paraLines.length > 0) {
      blocks.push({ type: "paragraph", lines: paraLines });
    }
  }

  return blocks;
}

function parseTableRow(line: string): string[] {
  return line
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.trim());
}

/* ------------------------------------------------------------------ */
/*  Full-screen table dialog with portal, focus trap, scroll lock       */
/* ------------------------------------------------------------------ */

function TableDialog({
  headers,
  rows,
  returnFocusTo,
  onClose
}: {
  headers: string[];
  rows: string[][];
  returnFocusTo?: HTMLElement | null;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  // Mount animation
  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
    dialogRef.current?.focus();
  }, []);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Focus trap
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusable = el!.querySelectorAll<HTMLElement>(
        "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
      );
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleTab);
    return () => document.removeEventListener("keydown", handleTab);
  }, []);

  // Restore focus on unmount
  useEffect(() => {
    return () => {
      if (returnFocusTo && typeof returnFocusTo.focus === "function") {
        returnFocusTo.focus();
      }
    };
    // Run only on unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const dialog = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Expanded table view"
      onKeyDown={handleKeyDown}
      onClick={handleBackdropClick}
      className={cn(
        "fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-2 sm:p-4 transition-opacity duration-200",
        mounted ? "opacity-100" : "opacity-0"
      )}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={cn(
          "relative flex h-full max-h-full w-[95%] flex-col rounded-2xl border border-border-subtle bg-surface-panel shadow-2xl outline-none transition-all duration-200 sm:h-auto sm:max-h-[95vh] sm:w-[90%]",
          mounted ? "scale-100" : "scale-95"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3 sm:px-6 sm:py-4">
          <h3 className="text-sm font-semibold sm:text-base text-text-primary">Table View</h3>
          <button
            type="button"
            onClick={onClose}
            ref={(el) => {
              if (el && !el.getAttribute("tabindex")) el.setAttribute("tabindex", "0");
            }}
            className="rounded-md p-1.5 text-text-secondary transition hover:bg-surface-elevated hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            aria-label="Close table view"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Scrollable table body */}
        <div className="flex-1 overflow-auto p-4 sm:p-6">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {headers.map((header, i) => (
                  <th
                    key={i}
                    className="border-b-2 border-border-subtle px-3 py-2 sm:px-4 sm:py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary"
                  >
                    <InlineContent tokens={tokenizeInline(header)} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr
                  key={ri}
                  className="border-b border-border-subtle last:border-b-0 hover:bg-surface-elevated/50"
                >
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-2 sm:px-4 sm:py-2.5 text-sm text-text-primary">
                      <InlineContent tokens={tokenizeInline(cell)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(dialog, document.body);
}

/* ------------------------------------------------------------------ */
/*  Table overflow widget                                               */
/* ------------------------------------------------------------------ */

function TableWidget({
  headers,
  rows,
  onExpand
}: {
  headers: string[];
  rows: string[][];
  onExpand: () => void;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  // Tracks overflow=false on first render; ResizeObserver detects actual overflow.
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const check = () => {
      if (el.scrollWidth > el.clientWidth) {
        setIsOverflowing(true);
      }
      // Keep false if no overflow — don't show expand unnecessarily
    };

    check();

    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="relative">
      <div ref={wrapperRef} className="overflow-x-auto rounded-lg border border-border-subtle">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {headers.map((header, ci) => (
                <th
                  key={ci}
                  className="border-b border-border-subtle bg-surface-elevated/60 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary whitespace-nowrap"
                >
                  <InlineContent tokens={tokenizeInline(header)} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr
                key={ri}
                className="border-b border-border-subtle last:border-b-0 hover:bg-surface-elevated/30"
              >
                {row.map((cell, ci) => (
                  <td key={ci} className="px-3 py-2 text-sm text-text-primary whitespace-nowrap">
                    <InlineContent tokens={tokenizeInline(cell)} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isOverflowing && (
        <button
          type="button"
          onClick={onExpand}
          className="mt-1.5 flex items-center gap-1.5 rounded-md border border-border-subtle bg-surface-field px-2.5 py-1 text-[11px] text-text-secondary transition hover:bg-surface-elevated hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          aria-label="Expand table to full view"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 3 21 3 21 9" />
            <polyline points="9 21 3 21 3 15" />
            <line x1="21" y1="3" x2="14" y2="10" />
            <line x1="3" y1="21" x2="10" y2="14" />
          </svg>
          Expand table
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main MarkdownRenderer                                               */
/* ------------------------------------------------------------------ */

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const expandBtnRef = useRef<HTMLButtonElement | null>(null);
  const [expandedTable, setExpandedTable] = useState<{
    headers: string[];
    rows: string[][];
  } | null>(null);

  const blocks = useMemo(() => parseBlocks(content.split("\n")), [content]);

  const handleExpand = (headers: string[], rows: string[][]) => {
    setExpandedTable({ headers, rows });
  };

  const handleCloseExpand = () => {
    setExpandedTable(null);
  };

  return (
    <div className={cn("space-y-3 text-sm leading-6 text-text-primary", className)}>
      {blocks.map((block, bi) => {
        switch (block.type) {
          case "heading":
            if (block.level === 1) {
              return (
                <h1 key={bi} className="text-lg font-bold tracking-tight text-text-primary">
                  <InlineContent tokens={tokenizeInline(block.text)} />
                </h1>
              );
            }
            if (block.level === 2) {
              return (
                <h2 key={bi} className="text-base font-bold tracking-tight text-text-primary">
                  <InlineContent tokens={tokenizeInline(block.text)} />
                </h2>
              );
            }
            return (
              <h3 key={bi} className="text-sm font-semibold text-text-primary">
                <InlineContent tokens={tokenizeInline(block.text)} />
              </h3>
            );

          case "paragraph":
            return (
              <p key={bi}>
                {block.lines.map((line, li) => (
                  <span key={li}>
                    {li > 0 && <br />}
                    <InlineContent tokens={tokenizeInline(line)} />
                  </span>
                ))}
              </p>
            );

          case "list":
            if (block.ordered) {
              return (
                <ol key={bi} className="list-decimal space-y-1 pl-5">
                  {block.items.map((item, li) => (
                    <li key={li}>
                      <InlineContent tokens={tokenizeInline(item)} />
                    </li>
                  ))}
                </ol>
              );
            }
            return (
              <ul key={bi} className="list-disc space-y-1 pl-5">
                {block.items.map((item, li) => (
                  <li key={li}>
                    <InlineContent tokens={tokenizeInline(item)} />
                  </li>
                ))}
              </ul>
            );

          case "table":
            return (
              <TableWidget
                key={bi}
                headers={block.headers}
                rows={block.rows}
                onExpand={() => handleExpand(block.headers, block.rows)}
              />
            );
        }
      })}

      {expandedTable && (
        <TableDialog
          headers={expandedTable.headers}
          rows={expandedTable.rows}
          returnFocusTo={expandBtnRef.current}
          onClose={handleCloseExpand}
        />
      )}
    </div>
  );
}
