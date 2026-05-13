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
        "rounded-[28px] border border-border-subtle bg-surface-panel shadow-panel ring-1 ring-border-subtle/35",
        className
      )}
      data-testid={testId}
    >
      {(title || subtitle || headerAction) ? (
        <header className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-6 sm:pt-6">
          <div>
            {title ? (
              <h3 className="text-sm font-medium uppercase tracking-[0.2em] text-text-muted">{title}</h3>
            ) : null}
            {subtitle ? (
              <p className="mt-2 text-sm text-text-secondary">{subtitle}</p>
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
