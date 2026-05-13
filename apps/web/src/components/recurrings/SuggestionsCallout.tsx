// apps/web/src/components/recurrings/SuggestionsCallout.tsx
"use client";

import { useRouter } from "next/navigation";

interface SuggestionsCalloutProps {
  count: number;
}

export function SuggestionsCallout({ count }: SuggestionsCalloutProps) {
  const router = useRouter();
  const actionLabel = `Review ${count} potential recurring ${count === 1 ? "item" : "items"} not tracked`;

  if (count === 0) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => router.push("/recurrings")}
      className="group inline-flex items-center gap-1 text-xs text-warning transition hover:text-warning focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg"
      aria-label={actionLabel}
      title={actionLabel}
      data-testid="suggestions-callout"
    >
      <span className="inline-block animate-pulse">✨</span>
      <span className="text-warning/80 group-hover:text-warning">
        +{count} untracked
      </span>
    </button>
  );
}
