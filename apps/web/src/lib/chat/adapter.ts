import type { AssistantQuery } from "@/lib/api/types";

export interface AssistantMessageCard {
  id: string;
  question: string;
  answer: string;
  summary?: string;
  keyPoints: string[];
  followUp?: string;
  highlights: string[];
  provider: string;
  model: string;
  drillDownUrl: string;
  createdAt: string;
  state: "pending" | "complete" | "error";
  pendingEmoji?: string;
  /** Clarification request — agent needs more info */
  clarification?: {
    question: string;
    options?: string[];
  };
  /** Confirmation preview data */
  confirmationPreview?: Record<string, unknown>;
  /** Pending action key for confirmation flow */
  pendingActionKey?: string;
  /** Structured subscription data */
  subscriptions?: Array<{
    merchant: string;
    cadence: string;
    amount: number;
    nextDate?: string;
    status: string;
  }>;
  /** Structured card benefit data */
  cardBenefits?: Array<{
    cardName: string;
    benefitType: string;
    category?: string;
    rate: number;
    used: number;
    cap: number | null;
    remaining: number | null;
  }>;
  /** Structured budget comparison data */
  budgetComparison?: Array<{
    category: string;
    actual: number;
    target: number | null;
    difference: number;
  }>;
}

function toShortStringList(value: unknown, limit = 4): string[] {
  return Array.isArray(value) ? value.map((entry) => String(entry)).filter(Boolean).slice(0, limit) : [];
}

/* ------------------------------------------------------------------ */
/*  Trailing JSON parser                                                */
/*  The LLM sometimes appends a structured JSON object after the       */
/*  answer text. Detect, parse, and use it to populate fields.         */
/* ------------------------------------------------------------------ */

interface TrailingJson {
  answer?: string;
  summary?: string;
  key_points?: string[];
  highlights?: string[];
}

// ---------------------------------------------------------------------------
// String-aware balanced-brace JSON extractor
// ---------------------------------------------------------------------------

/**
 * Find matching open brace for a position known to be at a '}'.
 * Uses string-awareness to skip braces inside quoted values.
 */
function findMatchingOpen(content: string, closeIndex: number): number {
  let depth = 0;
  let inString = false;
  let escape = false;
  let lastOpen = -1;

  for (let i = 0; i <= closeIndex; i++) {
    const ch = content[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (!inString) {
      if (ch === "{") {
        if (depth === 0) lastOpen = i;
        depth++;
      } else if (ch === "}") {
        depth--;
        if (depth === 0 && i === closeIndex) return lastOpen;
      }
    }
  }
  return -1;
}

/** Try JSON.parse with fallbacks for unescaped newlines in strings */
function tryParseLenient(json: string): Record<string, unknown> | null {
  try {
    const p = JSON.parse(json);
    return typeof p === "object" && p !== null ? (p as Record<string, unknown>) : null;
  } catch {
    // Replace literal newlines/tabs with spaces and retry
    try {
      const cleaned = json.replace(/\n/g, " ").replace(/\r/g, " ").replace(/\t/g, " ");
      const p = JSON.parse(cleaned);
      return typeof p === "object" && p !== null ? (p as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
}

const STRUCTURED_KEYS = new Set(["answer", "summary", "key_points", "highlights"]);

function hasStructuredKeys(obj: Record<string, unknown>): boolean {
  return Object.keys(obj).some((k) => STRUCTURED_KEYS.has(k));
}

function extractFields(parsed: Record<string, unknown>): TrailingJson {
  const result: TrailingJson = {};
  if (typeof parsed.answer === "string") result.answer = parsed.answer;
  if (typeof parsed.summary === "string") result.summary = parsed.summary;
  if (Array.isArray(parsed.key_points)) {
    result.key_points = parsed.key_points.filter((k): k is string => typeof k === "string");
  }
  if (Array.isArray(parsed.highlights)) {
    result.highlights = parsed.highlights.filter((h): h is string => typeof h === "string");
  }
  return result;
}

/**
 * Normalize an answer string that may contain embedded trailing JSON.
 * Uses a string-aware balanced-brace walker that respects quoted strings
 * and escape sequences, so drill_down_filters and other nested objects
 * are correctly identified.
 */
function normalizeTrailingJson(raw: string): { cleaned: string; fields: TrailingJson } {
  const trimmed = raw.trim();
  if (!trimmed) return { cleaned: raw, fields: {} };

  // First try: strict parse of the entire string as JSON
  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === "object" && parsed !== null && hasStructuredKeys(parsed as Record<string, unknown>)) {
      const fields = extractFields(parsed as Record<string, unknown>);
      const body = typeof (parsed as Record<string, unknown>).answer === "string"
        ? (parsed as Record<string, unknown>).answer as string
        : trimmed;
      // Recursively normalize the body to handle embedded JSON
      const nested = normalizeTrailingJson(body);
      return {
        cleaned: nested.cleaned || body,
        fields: { ...fields, ...nested.fields }
      };
    }
  } catch {
    // Not strict-parseable — fall through
  }

  // Find trailing complete JSON objects (backward scan, string-aware)
  let idx = trimmed.length - 1;
  while (idx >= 0) {
    const closeBrace = trimmed.lastIndexOf("}", idx);
    if (closeBrace < 0) break;

    const openBrace = findMatchingOpen(trimmed, closeBrace);
    if (openBrace >= 0) {
      const candidate = trimmed.slice(openBrace, closeBrace + 1);
      const parsed = tryParseLenient(candidate);
      if (parsed && hasStructuredKeys(parsed)) {
        const fields = extractFields(parsed);
        const prose = trimmed.slice(0, openBrace).trim();
        const body = prose || fields.answer || trimmed;

        // Recursively normalize the body for embedded JSON
        if (prose) {
          const nested = normalizeTrailingJson(body);
          return { cleaned: nested.cleaned || body, fields: { ...fields, ...nested.fields } };
        }
        return { cleaned: body, fields };
      }
      // Move before this non-structured block and continue scanning
      idx = openBrace - 1;
    } else {
      idx = closeBrace - 1;
    }
  }

  return { cleaned: trimmed, fields: {} };
}

export function assistantQueryToMessage(query: AssistantQuery): AssistantMessageCard {
  // Normalize the answer: strip trailing JSON if present, recover structured fields
  const { cleaned: normalizedAnswer, fields: trailingFields } = normalizeTrailingJson(query.result.answer);

  const message: AssistantMessageCard = {
    id: query.id,
    question: query.question,
    answer: normalizedAnswer,
    keyPoints: toShortStringList(query.result.keyPoints),
    highlights: Array.isArray(query.result.highlights) ? query.result.highlights : [],
    provider: query.result.provider,
    model: query.result.model,
    drillDownUrl: query.result.drillDownUrl,
    createdAt: query.createdAt,
    state: "complete"
  };

  // Trailing JSON overrides take priority over explicit API fields
  if (typeof trailingFields.summary === "string") {
    message.summary = trailingFields.summary;
  } else if (typeof query.result.summary === "string") {
    message.summary = query.result.summary;
  }

  if (trailingFields.key_points && trailingFields.key_points.length > 0) {
    message.keyPoints = trailingFields.key_points;
  }

  if (trailingFields.highlights && trailingFields.highlights.length > 0) {
    message.highlights = trailingFields.highlights;
  }

  if (typeof query.result.followUp === "string") {
    message.followUp = query.result.followUp;
  }

  // Clarification
  if (query.result.clarification) {
    message.clarification = query.result.clarification;
  }

  // Confirmation preview
  if (query.result.confirmationPreview) {
    message.confirmationPreview = query.result.confirmationPreview;
  }

  // Pending action key
  if (query.result.pendingActionKey) {
    message.pendingActionKey = query.result.pendingActionKey;
  }

  // Structured data
  if (query.result.subscriptions) {
    message.subscriptions = query.result.subscriptions;
  }
  if (query.result.cardBenefits) {
    message.cardBenefits = query.result.cardBenefits;
  }
  if (query.result.budgetComparison) {
    message.budgetComparison = query.result.budgetComparison;
  }

  return message;
}

/**
 * Normalize an already-hydrated AssistantMessageCard from localStorage.
 * Older stored messages may still have raw trailing JSON in their answer
 * fields. This strips it on hydration.
 */
export function normalizeHydratedMessage(message: AssistantMessageCard): AssistantMessageCard {
  if (!message.answer || message.state !== "complete") return message;
  // Fast path: no JSON-like structure (must have { followed by a recognised key)
  if (!/\{\s*"(answer|summary|key_points|highlights)"/.test(message.answer)) return message;

  const { cleaned, fields } = normalizeTrailingJson(message.answer);
  if (!fields.answer && !fields.summary) return message; // No JSON found

  return {
    ...message,
    answer: cleaned || fields.answer || message.answer,
    summary: fields.summary || message.summary,
    keyPoints: fields.key_points?.length ? fields.key_points : message.keyPoints,
    highlights: fields.highlights?.length ? fields.highlights : message.highlights,
  };
}
