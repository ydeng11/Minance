import type { ExplorerSummarySparklinePoint } from "@/lib/api/types";

export interface MerchantPresentation {
  displayName: string;
  caption: string;
  monogram: string;
}

export interface SummarySecondaryStateInput {
  comparisonEnabled: boolean;
  deltaLabel: string;
  sparkline: number[];
}

export interface SummarySparklineSeries {
  spend: number[];
  income: number[];
  net: number[];
}

export type SummarySecondaryState =
  | {
      mode: "sparkline";
      label: string;
    }
  | {
      mode: "delta";
      label: string;
    };

const KNOWN_MERCHANT_PATTERNS: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /\bfid\b|\bfidelity\b/i, name: "Fidelity" },
  { pattern: /\bpaypal\b/i, name: "PayPal" },
  { pattern: /\bcostco\b/i, name: "Costco" },
  { pattern: /\bchase\b/i, name: "Chase" }
];

const MERCHANT_NOISE_TOKENS = new Set([
  "ach",
  "autopay",
  "card",
  "checkcard",
  "debit",
  "des",
  "id",
  "llc",
  "online",
  "payment",
  "pos",
  "purchase",
  "transaction"
]);

function normalizeWhitespace(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function toTitleCase(value: string) {
  return value.replace(/\b([a-z])([a-z]*)/gi, (_match, first: string, rest: string) => {
    return `${first.toUpperCase()}${rest.toLowerCase()}`;
  });
}

function cleanMerchantNoise(value: string) {
  const cleaned = value
    .replace(/[^a-z0-9\s&/-]/gi, " ")
    .split(/\s+/)
    .filter((token) => token && !MERCHANT_NOISE_TOKENS.has(token.toLowerCase()))
    .slice(0, 4)
    .join(" ");

  return normalizeWhitespace(cleaned);
}

function toMonogram(value: string) {
  const words = value
    .replace(/[^a-z0-9\s]/gi, " ")
    .split(/\s+/)
    .filter(Boolean);

  const initials = words.slice(0, 2).map((word) => word[0]?.toUpperCase() || "").join("");
  if (initials.length >= 2) {
    return initials;
  }

  const compact = value.replace(/[^a-z0-9]/gi, "").slice(0, 2).toUpperCase();
  return compact || "TX";
}

export function buildMerchantPresentation(raw: string): MerchantPresentation {
  const caption = normalizeWhitespace(String(raw || ""));
  const known = KNOWN_MERCHANT_PATTERNS.find((entry) => entry.pattern.test(caption));
  const cleaned = cleanMerchantNoise(caption);
  const displayName = known?.name || toTitleCase(cleaned || caption || "Unknown merchant");

  return {
    displayName,
    caption,
    monogram: toMonogram(displayName)
  };
}

export function buildSummarySecondaryState(
  input: SummarySecondaryStateInput
): SummarySecondaryState {
  if (!input.comparisonEnabled && input.sparkline.length > 1) {
    return {
      mode: "sparkline",
      label: "Last 7 days"
    };
  }

  return {
    mode: "delta",
    label: input.deltaLabel
  };
}

export function buildSummarySparklineSeries(
  sparkline: ExplorerSummarySparklinePoint[] | null | undefined
): SummarySparklineSeries {
  const series: SummarySparklineSeries = {
    spend: [],
    income: [],
    net: []
  };

  for (const point of sparkline ?? []) {
    series.spend.push(point.spend);
    series.income.push(point.income);
    series.net.push(point.net);
  }

  return series;
}

export function getSummaryValueClassName(value: string) {
  if (value.length >= 14) {
    return "text-2xl";
  }

  if (value.length >= 10) {
    return "text-3xl";
  }

  return "text-4xl";
}
