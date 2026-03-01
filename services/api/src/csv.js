import { parse as parseCsvSync } from "csv-parse/sync";
import { CANONICAL_IMPORT_FIELDS } from "../../../packages/domain/src/constants.js";
import { clamp, parseDate, toDecimal, normalizeText } from "./utils.js";

const delimiters = [",", ";", "\t", "|"];

const MERCHANT_BLOCKLIST = /(account|member|status|\bid\b)/;

export function detectDelimiter(sampleLine = "") {
  let best = ",";
  let bestCount = -1;

  for (const delimiter of delimiters) {
    const count = sampleLine.split(delimiter).length;
    if (count > bestCount) {
      bestCount = count;
      best = delimiter;
    }
  }

  return best;
}

function normalizeCell(value) {
  return String(value ?? "").trim();
}

function looksLikeHeader(cells) {
  if (!cells.length) {
    return false;
  }

  let alphaCount = 0;
  let dataLikeCount = 0;

  for (const cell of cells) {
    const value = normalizeCell(cell);
    if (!value) {
      continue;
    }

    if (/^[a-zA-Z_\- .()]+$/.test(value)) {
      alphaCount += 1;
    }
    if (parseDate(value) || toDecimal(value) !== null) {
      dataLikeCount += 1;
    }
  }

  return alphaCount >= Math.max(1, Math.floor(cells.length / 2)) && dataLikeCount < Math.max(1, cells.length / 3);
}

export function parseCsv(csvText) {
  const normalized = String(csvText || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!normalized) {
    throw new Error("CSV content is empty");
  }

  const firstLine = normalized.split("\n").find((line) => line.trim().length > 0) || "";
  const delimiter = detectDelimiter(firstLine);

  let records = [];
  try {
    records = parseCsvSync(normalized, {
      delimiter,
      relax_column_count: true,
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true
    });
  } catch {
    throw new Error("CSV parsing failed");
  }

  if (records.length < 2) {
    throw new Error("CSV must include at least a header and one row");
  }

  const firstRecord = (records[0] || []).map(normalizeCell);
  const hasHeader = looksLikeHeader(firstRecord);
  const maxColumns = records.reduce((max, row) => Math.max(max, Array.isArray(row) ? row.length : 0), firstRecord.length);

  const headers = hasHeader
    ? Array.from({ length: maxColumns }, (_, idx) => normalizeCell(firstRecord[idx]) || `column_${idx + 1}`)
    : Array.from({ length: maxColumns }, (_, idx) => `column_${idx + 1}`);

  const dataRecords = hasHeader ? records.slice(1) : records;
  const rows = dataRecords.map((cells, rowIndex) => {
    const row = {};
    for (let i = 0; i < headers.length; i += 1) {
      row[headers[i]] = normalizeCell(cells?.[i]);
    }

    return {
      rowIndex,
      row
    };
  });

  return {
    delimiter,
    hasHeader,
    headers,
    rows
  };
}

function scoreHeaderForField(header, field) {
  const value = String(header || "").trim().toLowerCase();
  if (!value) {
    return 0;
  }

  const rules = {
    date: ["date", "posted", "transaction date", "post date", "clearing date", "trans. date"],
    merchant: ["merchant", "payee", "vendor", "counterparty", "name", "original description"],
    description: ["description", "details", "narrative", "memo", "notes"],
    amount: ["amount", "value", "total", "debit", "credit", "withdrawal", "deposit"],
    currency: ["currency", "curr", "iso"],
    account: ["account", "card", "source", "institution"],
    category_raw: ["category", "type", "class"],
    memo: ["memo", "note", "comment", "reference"]
  };

  const keywords = rules[field] || [];
  let best = 0;

  for (const keyword of keywords) {
    if (value === keyword) {
      best = Math.max(best, field === "merchant" && keyword === "name" ? 0.4 : 1);
    } else if (value.includes(keyword)) {
      best = Math.max(best, field === "merchant" && keyword === "name" ? 0.35 : 0.85);
    }
  }

  if (field === "amount") {
    if (value.includes("debit") || value.includes("withdraw")) {
      best = Math.max(best, 0.9);
    }
    if (value.includes("credit") || value.includes("deposit")) {
      best = Math.max(best, 0.9);
    }
  }

  if (field === "merchant") {
    if (MERCHANT_BLOCKLIST.test(value)) {
      best = Math.min(best, 0.25);
    }
    if (value.includes("description")) {
      best = Math.max(best, 0.62);
    }
  }

  return best;
}

function scoreRowsForField(rows, header, field) {
  const sample = rows.slice(0, 40).map((entry) => normalizeCell(entry.row[header]));
  if (!sample.length) {
    return 0;
  }

  let matched = 0;
  for (const value of sample) {
    if (!value) {
      continue;
    }

    if (field === "date" && parseDate(value)) {
      matched += 1;
      continue;
    }
    if (field === "amount" && toDecimal(value) !== null) {
      matched += 1;
      continue;
    }
    if (field === "merchant") {
      if (value.length >= 3 && /[a-zA-Z]/.test(value)) {
        matched += 1;
      }
      continue;
    }
    if (field === "description") {
      if (value.length >= 4 && /[a-zA-Z]/.test(value) && toDecimal(value) === null) {
        matched += 1;
      }
      continue;
    }
    if (field === "currency" && /^[A-Za-z]{3}$/.test(value)) {
      matched += 1;
      continue;
    }
    if (field === "category_raw" && value.length >= 2) {
      matched += 1;
      continue;
    }
    if (field === "memo" && value.length >= 2) {
      matched += 1;
      continue;
    }
    if (field === "account" && value.length >= 2) {
      matched += 1;
      continue;
    }
  }

  return matched / sample.length;
}

function scoreTextCardinality(rows, header, field) {
  if (!header || !["merchant", "description"].includes(field)) {
    return 0;
  }

  const sample = rows
    .slice(0, 80)
    .map((entry) => normalizeCell(entry.row[header]))
    .filter(Boolean);

  if (!sample.length) {
    return 0;
  }

  const normalizedValues = sample.map((value) => normalizeText(value));
  const uniqueRatio = new Set(normalizedValues).size / sample.length;
  const averageLength = sample.reduce((sum, value) => sum + value.length, 0) / sample.length;
  const alphaRatio = sample.filter((value) => /[a-zA-Z]/.test(value)).length / sample.length;
  const numericRatio = sample.filter((value) => toDecimal(value) !== null).length / sample.length;
  const headerNormalized = String(header).toLowerCase();

  let score = clamp(uniqueRatio, 0, 1);
  if (averageLength < 4) {
    score *= 0.4;
  }

  if (field === "merchant" && MERCHANT_BLOCKLIST.test(headerNormalized)) {
    score *= 0.08;
  }

  if (field === "merchant" && uniqueRatio < 0.2) {
    score *= 0.25;
  }

  if (field === "merchant" && numericRatio > 0.5) {
    score *= 0.2;
  }

  if (field === "description") {
    if (alphaRatio < 0.45) {
      score *= 0.15;
    }
    if (numericRatio > 0.55) {
      score *= 0.1;
    }
  }

  return clamp(score, 0, 1);
}

function inferAuxiliaryColumns(headers, rows) {
  const lowerHeaders = headers.map((header) => ({
    header,
    normalized: String(header || "").toLowerCase()
  }));

  function pickBest(scoreFn) {
    let best = null;
    let bestScore = 0;
    for (const entry of lowerHeaders) {
      const score = scoreFn(entry.normalized);
      if (score > bestScore) {
        bestScore = score;
        best = entry.header;
      }
    }
    return bestScore >= 0.55 ? best : null;
  }

  const debit = pickBest((value) => {
    if (value === "debit") {
      return 1;
    }
    if (value.includes("debit") || value.includes("withdraw") || value.includes("charge")) {
      return 0.9;
    }
    return 0;
  });

  const credit = pickBest((value) => {
    if (value === "credit") {
      return 1;
    }
    if (value.includes("credit") || value.includes("deposit") || value.includes("refund")) {
      return 0.9;
    }
    return 0;
  });

  const type = pickBest((value) => {
    if (value === "type" || value === "transaction type") {
      return 1;
    }
    if (value.includes("type")) {
      return 0.85;
    }
    return 0;
  });

  const status = pickBest((value) => {
    if (value === "status") {
      return 1;
    }
    if (value.includes("status")) {
      return 0.85;
    }
    return 0;
  });

  const direction = pickBest((value) => {
    if (value === "direction") {
      return 1;
    }
    if (value.includes("direction")) {
      return 0.9;
    }
    return 0;
  });

  const out = {
    debit,
    credit,
    type,
    status,
    direction
  };

  if (debit) {
    const debitNumericRatio = rows.slice(0, 50).filter((entry) => toDecimal(entry.row[debit]) !== null).length / Math.max(1, Math.min(50, rows.length));
    if (debitNumericRatio < 0.2) {
      out.debit = null;
    }
  }

  if (credit) {
    const creditNumericRatio = rows.slice(0, 50).filter((entry) => toDecimal(entry.row[credit]) !== null).length / Math.max(1, Math.min(50, rows.length));
    if (creditNumericRatio < 0.2) {
      out.credit = null;
    }
  }

  return out;
}

export function inferMapping(parsedCsv, aiBoost = false) {
  const { headers, rows } = parsedCsv;
  const mapping = {};
  const confidenceByField = {};
  const warnings = [];
  const usedHeaders = new Set();

  for (const field of CANONICAL_IMPORT_FIELDS) {
    let bestHeader = null;
    let bestScore = 0;

    for (const header of headers) {
      if (usedHeaders.has(header)) {
        continue;
      }

      const headerNormalized = String(header || "").toLowerCase();
      if (field === "description" && /(amount|debit|credit|value|total)/.test(headerNormalized)) {
        continue;
      }

      const headerScore = scoreHeaderForField(header, field);
      const rowScore = scoreRowsForField(rows, header, field);
      const cardinalityScore = scoreTextCardinality(rows, header, field);

      const composite = ["merchant", "description"].includes(field)
        ? clamp((headerScore * 0.45) + (rowScore * 0.25) + (cardinalityScore * 0.3), 0, 1)
        : clamp((headerScore * 0.65) + (rowScore * 0.35), 0, 1);

      if (composite > bestScore) {
        bestScore = composite;
        bestHeader = header;
      }
    }

    if (bestHeader && bestScore >= 0.4) {
      mapping[field] = bestHeader;
      confidenceByField[field] = clamp(bestScore + (aiBoost ? 0.05 : 0), 0, 1);
      usedHeaders.add(bestHeader);
    } else {
      mapping[field] = null;
      confidenceByField[field] = 0;
    }
  }

  const merchantHeader = mapping.merchant;
  const descriptionHeader = mapping.description;
  const merchantConfidence = confidenceByField.merchant || 0;
  const descriptionConfidence = confidenceByField.description || 0;

  if (merchantHeader && MERCHANT_BLOCKLIST.test(String(merchantHeader).toLowerCase()) && descriptionHeader) {
    mapping.merchant = descriptionHeader;
    confidenceByField.merchant = clamp(Math.max(0.5, descriptionConfidence * 0.9), 0, 1);
    warnings.push(`Merchant mapping adjusted from ${merchantHeader} to ${descriptionHeader}`);
  } else if (!merchantHeader && descriptionHeader) {
    mapping.merchant = descriptionHeader;
    confidenceByField.merchant = clamp(Math.max(0.45, descriptionConfidence * 0.8), 0, 1);
    warnings.push("Merchant mapped to description as fallback");
  }

  const requiredFields = ["date", "merchant", "amount"];
  for (const field of requiredFields) {
    if (!mapping[field]) {
      warnings.push(`Missing required mapping for ${field}`);
    }
  }

  const confidenceValues = Object.values(confidenceByField);
  const avgConfidence = confidenceValues.length
    ? confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length
    : 0;

  if (avgConfidence < 0.6) {
    warnings.push("Low confidence mapping. Please review before commit.");
  }

  return {
    mapping,
    confidenceByField,
    averageConfidence: clamp(avgConfidence, 0, 1),
    warnings,
    auxiliary: inferAuxiliaryColumns(headers, rows)
  };
}
