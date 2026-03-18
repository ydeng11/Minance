// apps/web/src/components/recurrings/SuggestionsCallout.tsx
"use client";

import { useRouter } from "next/navigation";

interface SuggestionsCalloutProps {
  count: number;
}

export function SuggestionsCallout({ count }: SuggestionsCalloutProps) {
  const router = useRouter();

  if (count === 0) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => router.push("/recurrings")}
      className="group inline-flex items-center gap-1 text-xs text-amber-300/80 transition hover:text-amber-200"
      title={`${count} potential recurring items not tracked`}
      data-testid="suggestions-callout"
    >
      <span className="inline-block animate-pulse">✨</span>
      <span className="text-amber-200/70 group-hover:text-amber-200">
        +{count} untracked
      </span>
    </button>
  );
}