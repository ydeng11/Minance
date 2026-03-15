import { money } from "@/lib/utils";

interface AmountRangeControlProps {
  minBound: number;
  maxBound: number;
  minValue: string;
  maxValue: string;
  onChange: (next: { minAmount: string; maxAmount: string }) => void;
  testIdPrefix: string;
  inputClassName: string;
}

function toNumericAmount(value: string, fallback: number) {
  if (!value) {
    return fallback;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function buildFilterTrackStyle(minBound: number, maxBound: number, lower: number, upper: number) {
  if (maxBound <= minBound) {
    return {
      left: "0%",
      width: "100%"
    };
  }

  const leftPercent = ((lower - minBound) / (maxBound - minBound)) * 100;
  const widthPercent = ((upper - lower) / (maxBound - minBound)) * 100;
  return {
    left: `${clampPercent(leftPercent)}%`,
    width: `${clampPercent(widthPercent)}%`
  };
}

export function AmountRangeControl({
  minBound,
  maxBound,
  minValue,
  maxValue,
  onChange,
  testIdPrefix,
  inputClassName
}: AmountRangeControlProps) {
  const selectedMinAmount = toNumericAmount(minValue, minBound);
  const selectedMaxAmount = toNumericAmount(maxValue, maxBound);
  const lowerSelectedAmount = Math.min(selectedMinAmount, selectedMaxAmount);
  const upperSelectedAmount = Math.max(selectedMinAmount, selectedMaxAmount);
  const sliderTrackStyle = buildFilterTrackStyle(
    minBound,
    maxBound,
    lowerSelectedAmount,
    upperSelectedAmount
  );

  return (
    <div data-testid={`${testIdPrefix}-amount-range-control`}>
      <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.22em] text-neutral-500">
        <span>Amount bar</span>
        <span>{money(selectedMinAmount)} to {money(selectedMaxAmount)}</span>
      </div>

      <div className="relative mt-4">
        <div className="h-2 rounded-full bg-neutral-900" />
        <div
          className="pointer-events-none absolute top-0 h-2 rounded-full bg-emerald-400/70"
          style={sliderTrackStyle}
        />
        <input
          type="range"
          min={minBound}
          max={maxBound}
          value={lowerSelectedAmount}
          onChange={(event) => {
            const nextValue = Number(event.target.value);
            const nextMax = maxValue ? Number(maxValue) : maxBound;
            onChange({
              minAmount: String(Math.min(nextValue, nextMax)),
              maxAmount: maxValue
            });
          }}
          data-testid={`${testIdPrefix}-min-amount-range`}
          aria-label="Minimum amount range"
          className="pointer-events-auto absolute inset-x-0 top-[-7px] h-5 w-full cursor-pointer appearance-none bg-transparent accent-emerald-400"
        />
        <input
          type="range"
          min={minBound}
          max={maxBound}
          value={upperSelectedAmount}
          onChange={(event) => {
            const nextValue = Number(event.target.value);
            const nextMin = minValue ? Number(minValue) : minBound;
            onChange({
              minAmount: minValue,
              maxAmount: String(Math.max(nextValue, nextMin))
            });
          }}
          data-testid={`${testIdPrefix}-max-amount-range`}
          aria-label="Maximum amount range"
          className="pointer-events-auto absolute inset-x-0 top-[-7px] h-5 w-full cursor-pointer appearance-none bg-transparent accent-emerald-200"
        />
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <input
          value={minValue}
          onChange={(event) => onChange({ minAmount: event.target.value, maxAmount: maxValue })}
          inputMode="decimal"
          aria-label="Minimum amount"
          placeholder={`Min (${money(minBound)})`}
          className={inputClassName}
        />
        <input
          value={maxValue}
          onChange={(event) => onChange({ minAmount: minValue, maxAmount: event.target.value })}
          inputMode="decimal"
          aria-label="Maximum amount"
          placeholder={`Max (${money(maxBound)})`}
          className={inputClassName}
        />
      </div>
    </div>
  );
}
