export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export const WEEKDAY_HEAT_TONE_CLASS_NAMES = [
  "bg-surface-field ring-1 ring-inset ring-border-subtle",
  "bg-accent-soft/35 ring-1 ring-inset ring-accent/20",
  "bg-accent-soft/70 ring-1 ring-inset ring-accent/35",
  "bg-accent-soft ring-1 ring-inset ring-accent/55"
] as const;

function getWeekdayHeatToneIndex(amount: number, maxAmount: number) {
  if (amount <= 0 || maxAmount <= 0) {
    return 0;
  }

  const ratio = amount / maxAmount;
  if (ratio < 0.34) {
    return 1;
  }

  if (ratio < 0.67) {
    return 2;
  }

  return 3;
}

export function getWeekdayHeatToneClassName(amount: number, maxAmount: number) {
  return WEEKDAY_HEAT_TONE_CLASS_NAMES[getWeekdayHeatToneIndex(amount, maxAmount)];
}
