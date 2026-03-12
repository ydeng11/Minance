"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ExplorerCardProps {
  title?: string;
  subtitle?: string;
  className?: string;
  contentClassName?: string;
  headerAction?: ReactNode;
  children: ReactNode;
  testId?: string;
}

export function ExplorerCard({
  title,
  subtitle,
  className,
  contentClassName,
  headerAction,
  children,
  testId
}: ExplorerCardProps) {
  return (
    <section
      className={cn(
        "rounded-[28px] border border-neutral-900 bg-[linear-gradient(180deg,rgba(15,18,20,0.98),rgba(8,10,12,0.92))] shadow-[0_18px_48px_rgba(0,0,0,0.28)]",
        className
      )}
      data-testid={testId}
    >
      {(title || subtitle || headerAction) ? (
        <header className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-6 sm:pt-6">
          <div>
            {title ? (
              <h3 className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-400">{title}</h3>
            ) : null}
            {subtitle ? (
              <p className="mt-2 text-sm text-neutral-500">{subtitle}</p>
            ) : null}
          </div>
          {headerAction}
        </header>
      ) : null}
      <div className={cn("px-5 pb-5 pt-5 sm:px-6 sm:pb-6", (title || subtitle || headerAction) && "pt-4", contentClassName)}>
        {children}
      </div>
    </section>
  );
}
