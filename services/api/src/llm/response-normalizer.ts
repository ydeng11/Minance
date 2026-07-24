// services/api/src/llm/response-normalizer.ts
// String/escape-aware balanced-brace extractor for LLM responses
// that may contain trailing JSON or fenced code blocks.

export interface StructuredFields {
  answer?: string;
  summary?: string;
  key_points?: string[];
  highlights?: string[];
  follow_up?: string;
  keyPoints?: string[];
}

export interface NormalizedResponse {
  /** The human-readable answer body (prose/markdown), with trailing JSON stripped */
  cleaned: string;
  /** Structured fields extracted from trailing JSON, if any */
  structured: StructuredFields | null;
}

// ---------------------------------------------------------------------------
// Recognised keys for validating a parsed object as structured response
// ---------------------------------------------------------------------------
const STRUCTURED_KEYS = new Set(["answer", "summary", "key_points", "keyPoints", "highlights", "follow_up", "followUp", "drill_down_filters"]);

function hasStructuredKeys(obj: Record<string, unknown>): boolean {
  return Object.keys(obj).some((k) => STRUCTURED_KEYS.has(k));
}

// ---------------------------------------------------------------------------
// String-aware balanced-brace extraction
// ---------------------------------------------------------------------------

/**
 * Find the start index of the top-level JSON object that ends at the
 * end of the string (or at `content.length - 1`). Returns -1 if no
 * complete balanced JSON object is found.
 *
 * This is string/escape-aware: it skips over `{` inside quoted strings
 * and respects \" escapes.
 */
function findTopLevelJsonEnd(content: string): number {
  let i = 0;
  let depth = 0;
  let inString = false;
  let escape = false;

  // Find the first '{' that starts a top-level object
  while (i < content.length) {
    const ch = content[i];
    if (escape) {
      escape = false;
      i++;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      i++;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      i++;
      continue;
    }
    if (!inString) {
      if (ch === "{") {
        depth = 1;
        break;
      }
    }
    i++;
  }

  if (depth === 0) return -1;

  // Now walk from that '{' to find the matching '}'
  const start = i;
  i++;
  while (i < content.length && depth > 0) {
    const ch = content[i];
    if (escape) {
      escape = false;
      i++;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      i++;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      i++;
      continue;
    }
    if (!inString) {
      if (ch === "{") depth++;
      else if (ch === "}") depth--;
    }
    i++;
  }

  if (depth !== 0) return -1; // unbalanced
  return i; // index after the closing '}'
}

// ---------------------------------------------------------------------------
// Relaxed parsing (handles unescaped newlines inside strings)
// ---------------------------------------------------------------------------

function tryParseLenient(json: string): Record<string, unknown> | null {
  // Strict parse first
  try {
    const p = JSON.parse(json);
    return typeof p === "object" && p !== null ? (p as Record<string, unknown>) : null;
  } catch {
    // Fall through to lenient strategies
  }

  // Strategy 2: replace literal newlines/tabs with spaces
  const cleaned = json
    .replace(/\n/g, " ")
    .replace(/\r/g, " ")
    .replace(/\t/g, " ");
  try {
    const p = JSON.parse(cleaned);
    return typeof p === "object" && p !== null ? (p as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Extract structured fields from a parsed object
// ---------------------------------------------------------------------------

function extractFields(parsed: Record<string, unknown>): StructuredFields {
  const result: StructuredFields = {};
  if (typeof parsed.answer === "string") result.answer = parsed.answer;
  if (typeof parsed.summary === "string") result.summary = parsed.summary;
  if (typeof parsed.follow_up === "string") result.follow_up = parsed.follow_up;
  if (typeof parsed.followUp === "string") result.followUp = parsed.followUp;
  if (Array.isArray(parsed.key_points)) {
    result.key_points = parsed.key_points.filter((k): k is string => typeof k === "string");
  }
  if (Array.isArray(parsed.keyPoints)) {
    result.keyPoints = parsed.keyPoints.filter((k): k is string => typeof k === "string");
  }
  if (Array.isArray(parsed.highlights)) {
    result.highlights = parsed.highlights.filter((h): h is string => typeof h === "string");
  }
  return result;
}

// ---------------------------------------------------------------------------
// Strip fenced code blocks
// ---------------------------------------------------------------------------

function stripFence(text: string): string {
  // Remove ```json ... ``` or ``` ... ``` around text
  return text.replace(/^```(?:json)?\s*\n?([\s\S]*?)```$/gm, "$1").trim();
}

// ---------------------------------------------------------------------------
// Main entry: normalize a raw LLM response
// ---------------------------------------------------------------------------

/**
 * Normalize a raw LLM content string.
 *
 * 1. Tries strict JSON.parse first (fast path for well-formed JSON).
 * 2. Otherwise, finds the last complete top-level JSON object using a
 *    string-aware balanced-brace walker.
 * 3. If that JSON contains recognised keys, uses it as structured fields
 *    and treats prose before it as the answer body.
 * 4. If the entire content IS that JSON (no prose before it), promotes
 *    the JSON's `answer` field as the body.
 * 5. Recursively normalizes the answer field (depth cap 2) to handle
 *    embedded JSON inside parsed.answer.
 * 6. Handles fenced ```json blocks.
 *
 * Returns { cleaned: string, structured: StructuredFields | null }.
 */
export function normalizeResponse(content: string, depth = 0): NormalizedResponse {
  if (depth > 2) return { cleaned: content, structured: null };

  const trimmed = content.trim();
  if (!trimmed) return { cleaned: content, structured: null };

  // --- Step 1: strip fence markers ---
  const defenced = stripFence(trimmed);

  // --- Step 2: try strict parse ---
  try {
    const parsed = JSON.parse(defenced);
    if (typeof parsed === "object" && parsed !== null) {
      const structured = extractFields(parsed as Record<string, unknown>);

      // If it's a recognised structured response, promote answer
      if (hasStructuredKeys(parsed as Record<string, unknown>)) {
        let body = typeof parsed.answer === "string" ? parsed.answer : defenced;
        const nested = normalizeResponse(body, depth + 1);
        if (nested.structured) {
          // Answer field itself contains embedded JSON -> strip it
          body = nested.cleaned || nested.structured.answer || body;
          return {
            cleaned: body,
            structured: mergeStructured(structured, nested.structured)
          };
        }
        return { cleaned: body, structured };
      }

      // Parsed as some other object — not a structured response
      return { cleaned: defenced, structured: null };
    }
  } catch {
    // Not strict-parseable — fall through
  }

  // --- Step 3: find top-level JSON object ---
  const jsonEnd = findTopLevelJsonEnd(defenced);
  if (jsonEnd <= 0) return { cleaned: defenced, structured: null };

  const jsonStr = defenced.slice(0, jsonEnd);
  const after = defenced.slice(jsonEnd).trim();

  // If there's text after the JSON, it might be part of the body
  // (unusual). Try to parse just the JSON prefix.
  // But first, only accept if the JSON ends at/near the end of text
  // OR if the text before it makes sense as prose and the JSON is
  // at the end.

  const parsed = tryParseLenient(jsonStr);
  if (!parsed || !hasStructuredKeys(parsed)) {
    // Try entire string for a trailing JSON
    const trailingJson = findTrailingJson(defenced);
    if (trailingJson) return trailingJson;
    return { cleaned: defenced, structured: null };
  }

  const structured = extractFields(parsed);
  const prose = defenced.slice(jsonEnd).trim();

  if (!prose) {
    // Entire content IS the JSON -> promote answer field
    let body = structured.answer || defenced;
    const nested = normalizeResponse(body, depth + 1);
    if (nested.structured) {
      body = nested.cleaned || nested.structured.answer || body;
      return { cleaned: body, structured: mergeStructured(structured, nested.structured) };
    }
    return { cleaned: body, structured };
  }

  // JSON at the beginning, prose after it (unusual) -> treat as body
  return { cleaned: prose, structured };
}

// ---------------------------------------------------------------------------
// Find trailing JSON block (last complete object in the string)
// ---------------------------------------------------------------------------

function findTrailingJson(content: string): NormalizedResponse | null {
  // Walk backward to find the last '}' that terminates a complete object
  let lastClose = content.lastIndexOf("}");
  if (lastClose < 0) return null;

  // Try to find the matching '{' by scanning backward with string-awareness
  while (lastClose >= 0) {
    const openBrace = findMatchingOpen(content, lastClose);
    if (openBrace >= 0) {
      const candidate = content.slice(openBrace, lastClose + 1);
      const parsed = tryParseLenient(candidate);
      if (parsed && hasStructuredKeys(parsed)) {
        const fields = extractFields(parsed);
        const prose = content.slice(0, openBrace).trim();
        const body = prose || fields.answer || content;
        return { cleaned: body, structured: fields };
      }
    }
    // Try the next '}' backward
    lastClose = content.lastIndexOf("}", lastClose - 1);
  }

  return null;
}

function findMatchingOpen(content: string, closeIndex: number): number {
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = closeIndex; i >= 0; i--) {
    const ch = content[i];
    // Walk backward through the string, tracking string boundaries
    // We need to be careful with backward scanning
  }

  // Simpler approach: count braces from the start
  inString = false;
  escape = false;
  depth = 0;
  let lastOpen = -1;

  for (let i = 0; i <= closeIndex; i++) {
    const ch = content[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (!inString) {
      if (ch === "{") { depth++; lastOpen = i; }
      else if (ch === "}") { depth--; }
    }
  }

  // If we closed at the right depth, the last open at depth=... 
  // Actually, let me just find the open that matches our close:
  inString = false;
  escape = false;
  depth = 0;

  for (let i = 0; i <= closeIndex; i++) {
    const ch = content[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (!inString) {
      if (ch === "{") {
        if (depth === 0) lastOpen = i;
        depth++;
      }
      else if (ch === "}") {
        depth--;
        if (depth === 0 && i === closeIndex) return lastOpen;
      }
    }
  }

  return -1;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mergeStructured(a: StructuredFields, b: StructuredFields): StructuredFields {
  // Outer fields take priority over inner (nested) fields.
  // The outer JSON is the LLM's intended output; the inner JSON is
  // a redundancy the LLM embedded inside the answer string.
  return {
    answer: a.answer || b.answer,
    summary: a.summary || b.summary,
    key_points: (a.key_points || b.key_points)?.length ? (a.key_points || b.key_points) : undefined,
    highlights: (a.highlights || b.highlights)?.length ? (a.highlights || b.highlights) : undefined,
    follow_up: a.follow_up || b.follow_up,
    followUp: a.followUp || b.followUp,
    keyPoints: (a.keyPoints || b.keyPoints)?.length ? (a.keyPoints || b.keyPoints) : undefined,
  };
}

/**
 * Normalize an answer string that may contain embedded trailing JSON.
 * This is a convenience wrapper for use in the frontend adapter.
 */
export function normalizeAnswer(raw: string): { cleaned: string; fields: StructuredFields } {
  const { cleaned, structured } = normalizeResponse(raw);
  return { cleaned: cleaned.trim(), fields: structured || {} };
}
