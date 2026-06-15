"use client";

import { BarChart3, Layers3 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExplorerPerspective } from "../filters";

interface ExplorerPerspectiveTabsProps {
  perspective: ExplorerPerspective;
  onChange: (perspective: ExplorerPerspective) => void;
}

const PERSPECTIVES: Array<{
  value: ExplorerPerspective;
  label: string;
  description: string;
  icon: typeof BarChart3;
}> = [
  {
    value: "overview",
    label: "Overview",
    description: "Big picture trends and outliers",
    icon: BarChart3
  },
  {
    value: "category",
    label: "Category",
    description: "Where spending is going",
    icon: Layers3
  }
];

const TABS_SHELL_CLASS =
  "flex flex-col gap-3 rounded-[28px] border border-border-subtle bg-surface-panel/85 p-3 shadow-panel sm:flex-row";
const TAB_BASE_CLASS =
  "group flex flex-1 items-start gap-3 rounded-[20px] border px-4 py-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg";
const TAB_ACTIVE_CLASS = "border-accent/35 bg-accent-soft text-text-primary";
const TAB_INACTIVE_CLASS =
  "border-transparent bg-surface-field/70 text-text-secondary hover:border-border-subtle hover:bg-surface-elevated hover:text-text-primary";
const ICON_BASE_CLASS = "mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl border transition";
const ICON_ACTIVE_CLASS = "border-accent/35 bg-accent-soft text-accent";
const ICON_INACTIVE_CLASS = "border-border-subtle bg-surface-panel text-text-muted group-hover:text-text-secondary";

export function ExplorerPerspectiveTabs({ perspective, onChange }: ExplorerPerspectiveTabsProps) {
  return (
    <div
      className={TABS_SHELL_CLASS}
      data-testid="explorer-perspective-tabs"
    >
      {PERSPECTIVES.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => onChange(item.value)}
          data-testid={`explorer-perspective-${item.value}`}
          className={cn(
            TAB_BASE_CLASS,
            perspective === item.value
              ? TAB_ACTIVE_CLASS
              : TAB_INACTIVE_CLASS
          )}
        >
          <div
            className={cn(
              ICON_BASE_CLASS,
              perspective === item.value
                ? ICON_ACTIVE_CLASS
                : ICON_INACTIVE_CLASS
            )}
          >
            <item.icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold tracking-tight">{item.label}</div>
            <div className="mt-1 text-sm text-text-muted">{item.description}</div>
          </div>
        </button>
      ))}
    </div>
  );
}
