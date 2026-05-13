"use client";

import { cn } from "@/lib/utils";

export type StatusMessageTone = "info" | "error";

interface StatusMessageProps {
  children: React.ReactNode;
  className?: string;
  "data-testid"?: string;
  tone?: StatusMessageTone;
}

function toneClasses(tone: StatusMessageTone) {
  if (tone === "error") {
    return "border-danger/35 bg-danger-soft text-danger";
  }

  return "border-border-subtle bg-surface-field text-text-secondary";
}

export function StatusMessage({
  children,
  className,
  "data-testid": dataTestId = "global-message",
  tone = "info"
}: StatusMessageProps) {
  const isError = tone === "error";

  return (
    <p
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      aria-atomic="true"
      data-testid={dataTestId}
      className={cn("rounded-lg border px-3 py-2 text-sm", toneClasses(tone), className)}
    >
      {children}
    </p>
  );
}
