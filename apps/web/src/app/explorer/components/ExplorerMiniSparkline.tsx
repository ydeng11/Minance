"use client";

interface ExplorerMiniSparklineProps {
  data: number[];
  strokeClassName?: string;
  testId?: string;
}

export function ExplorerMiniSparkline({
  data,
  strokeClassName = "stroke-emerald-400",
  testId
}: ExplorerMiniSparklineProps) {
  const values = data.length > 1 ? data : [0, 0];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100;
      const y = 32 - ((value - min) / range) * 28;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox="0 0 100 36"
      preserveAspectRatio="none"
      className="h-10 w-full"
      data-testid={testId}
      aria-hidden="true"
    >
      <polyline
        fill="none"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        className={strokeClassName}
      />
    </svg>
  );
}
