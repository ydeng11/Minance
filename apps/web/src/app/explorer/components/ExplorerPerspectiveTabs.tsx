"use client";

import { BarChart3, Layers3, Landmark } from "lucide-react";
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
  },
  {
    value: "account",
    label: "Account",
    description: "Which accounts drive activity",
    icon: Landmark
  }
];

export function ExplorerPerspectiveTabs({ perspective, onChange }: ExplorerPerspectiveTabsProps) {
  return (
    <div
      className="flex flex-col gap-3 rounded-[28px] border border-neutral-900 bg-neutral-950/85 p-3 sm:flex-row"
      data-testid="explorer-perspective-tabs"
    >
      {PERSPECTIVES.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => onChange(item.value)}
          data-testid={`explorer-perspective-${item.value}`}
          className={cn(
            "group flex flex-1 items-start gap-3 rounded-[20px] border px-4 py-4 text-left transition",
            perspective === item.value
              ? "border-emerald-400/30 bg-emerald-400/10 text-neutral-50"
              : "border-transparent bg-neutral-900/70 text-neutral-300 hover:border-neutral-800 hover:bg-neutral-900"
          )}
        >
          <div
            className={cn(
              "mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl border transition",
              perspective === item.value
                ? "border-emerald-400/30 bg-emerald-400/15 text-emerald-300"
                : "border-neutral-800 bg-neutral-950 text-neutral-500 group-hover:text-neutral-300"
            )}
          >
            <item.icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold tracking-tight">{item.label}</div>
            <div className="mt-1 text-sm text-neutral-500">{item.description}</div>
          </div>
        </button>
      ))}
    </div>
  );
}
