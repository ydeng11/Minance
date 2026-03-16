export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const TONE_CLASS_NAMES = [
  "bg-neutral-900 ring-1 ring-inset ring-neutral-800",
  "bg-emerald-950 ring-1 ring-inset ring-emerald-900/80",
  "bg-emerald-800 ring-1 ring-inset ring-emerald-700/80",
  "bg-emerald-500 ring-1 ring-inset ring-emerald-400/80"
] as const;

export function getWeekdayHeatToneClassName(amount: number, maxAmount: number) {
  if (amount <= 0 || maxAmount <= 0) {
    return TONE_CLASS_NAMES[0];
  }

  const ratio = amount / maxAmount;
  if (ratio < 0.34) {
    return TONE_CLASS_NAMES[1];
  }

  if (ratio < 0.67) {
    return TONE_CLASS_NAMES[2];
  }

  return TONE_CLASS_NAMES[3];
}
