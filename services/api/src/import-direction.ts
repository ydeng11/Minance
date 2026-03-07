import { clamp, normalizeText, toDecimal } from "./utils.ts";

const INFLOW_SIGNAL_KEYWORDS = [
  "payment",
  "autopay",
  "deposit",
  "refund",
  "reversal",
  "statement credit",
  "salary",
  "payroll",
  "interest",
  "reward"
];

const OUTFLOW_SIGNAL_KEYWORDS = [
  "purchase",
  "sale",
  "card charged",
  "debit",
  "withdraw",
  "fee",
  "bill",
  "payment sent",
  "preapproved payment"
];

export function getDefaultDirectionInference() {
  return {
    amountMode: "single_amount",
    signConvention: "negative_is_outflow",
    strategy: "default",
    confidence: 0.5,
    warnings: [],
    auxiliaryColumns: {
      outflow: null,
      inflow: null,
      type: null,
      status: null,
      direction: null
    }
  };
}

export function parseSignedAmount(raw) {
  if (raw == null || raw === "") {
    return null;
  }

  let text = String(raw).trim();
  let sign = 1;
  if (/^\(.+\)$/.test(text)) {
    sign = -1;
    text = text.slice(1, -1);
  }

  const numeric = toDecimal(text);
  if (numeric === null) {
    return null;
  }

  return Math.round(numeric * sign * 100) / 100;
}

function isSignalMatch(text, keywords = []) {
  if (!text) {
    return false;
  }
  return keywords.some((keyword) => text.includes(keyword));
}

function predictedDirectionForConvention(signedAmount, signConvention) {
  if (signedAmount == null) {
    return null;
  }
  if (signedAmount === 0) {
    return "outflow";
  }
  if (signConvention === "positive_is_outflow") {
    return signedAmount > 0 ? "outflow" : "inflow";
  }
  return signedAmount < 0 ? "outflow" : "inflow";
}

function amountFromMappedColumn(row, mapping) {
  const header = mapping?.amount;
  if (!header) {
    return { rawAmount: "", signedAmount: null, directionFromColumns: null };
  }

  const raw = row?.[header] ?? "";
  return {
    rawAmount: String(raw ?? ""),
    signedAmount: parseSignedAmount(raw),
    directionFromColumns: null
  };
}

function normalizeAuxiliary(auxiliary = {}) {
  return {
    outflow: auxiliary?.outflow || auxiliary?.debit || null,
    inflow: auxiliary?.inflow || auxiliary?.credit || null,
    type: auxiliary?.type || null,
    status: auxiliary?.status || null,
    direction: auxiliary?.direction || null
  };
}

function detectSplitColumnMode(rows, auxiliaryColumns) {
  const outflowHeader = auxiliaryColumns?.outflow;
  const inflowHeader = auxiliaryColumns?.inflow;
  if (!outflowHeader || !inflowHeader || outflowHeader === inflowHeader) {
    return {
      amountMode: "single_amount",
      confidence: 0,
      consideredRows: 0,
      mutuallyExclusiveRatio: 0
    };
  }

  let consideredRows = 0;
  let mutuallyExclusiveRows = 0;

  for (const entry of rows.slice(0, 250)) {
    const outflowAmount = parseSignedAmount(entry.row?.[outflowHeader]);
    const inflowAmount = parseSignedAmount(entry.row?.[inflowHeader]);
    const hasOutflow = outflowAmount != null;
    const hasInflow = inflowAmount != null;

    if (!hasOutflow && !hasInflow) {
      continue;
    }

    consideredRows += 1;
    if ((hasOutflow && !hasInflow) || (!hasOutflow && hasInflow)) {
      mutuallyExclusiveRows += 1;
    }
  }

  const mutuallyExclusiveRatio = consideredRows ? mutuallyExclusiveRows / consideredRows : 0;
  const isSplit = consideredRows >= 3 && mutuallyExclusiveRatio >= 0.85;

  return {
    amountMode: isSplit ? "split_outflow_inflow" : "single_amount",
    confidence: isSplit ? clamp(mutuallyExclusiveRatio, 0, 1) : 0,
    consideredRows,
    mutuallyExclusiveRatio
  };
}

function extractSignalText(row, mapping, auxiliaryColumns) {
  const headers = [
    mapping?.merchant,
    mapping?.description,
    mapping?.memo,
    mapping?.category_raw,
    auxiliaryColumns?.type,
    auxiliaryColumns?.status
  ].filter(Boolean);

  const parts = headers.map((header) => String(row?.[header] || "")).filter(Boolean);
  return normalizeText(parts.join(" "));
}

function buildSignScores(rows, mapping, auxiliaryColumns) {
  const scoreMap = {
    negative_is_outflow: {
      signalRows: 0,
      matchedSignalRows: 0,
      amountRows: 0,
      predictedOutflowRows: 0,
      keywordAgreement: 0.5,
      expensePriorScore: 0,
      totalScore: 0
    },
    positive_is_outflow: {
      signalRows: 0,
      matchedSignalRows: 0,
      amountRows: 0,
      predictedOutflowRows: 0,
      keywordAgreement: 0.5,
      expensePriorScore: 0,
      totalScore: 0
    }
  };

  for (const entry of rows.slice(0, 600)) {
    const extraction = amountFromMappedColumn(entry.row, mapping);
    if (extraction.signedAmount == null) {
      continue;
    }

    const text = extractSignalText(entry.row, mapping, auxiliaryColumns);
    const hasInflowSignal = isSignalMatch(text, INFLOW_SIGNAL_KEYWORDS);
    const hasOutflowSignal = isSignalMatch(text, OUTFLOW_SIGNAL_KEYWORDS);
    const hasExclusiveSignal = hasInflowSignal !== hasOutflowSignal;

    for (const signConvention of Object.keys(scoreMap)) {
      const bucket = scoreMap[signConvention];
      const predictedDirection = predictedDirectionForConvention(extraction.signedAmount, signConvention);

      bucket.amountRows += 1;
      if (predictedDirection === "outflow") {
        bucket.predictedOutflowRows += 1;
      }

      if (hasExclusiveSignal) {
        bucket.signalRows += 1;
        if ((hasInflowSignal && predictedDirection === "inflow") || (hasOutflowSignal && predictedDirection === "outflow")) {
          bucket.matchedSignalRows += 1;
        }
      }
    }
  }

  for (const signConvention of Object.keys(scoreMap)) {
    const bucket = scoreMap[signConvention];
    const outflowRatio = bucket.amountRows ? bucket.predictedOutflowRows / bucket.amountRows : 0;
    bucket.keywordAgreement = bucket.signalRows ? bucket.matchedSignalRows / bucket.signalRows : 0.5;
    bucket.expensePriorScore = clamp(1 - Math.abs(outflowRatio - 0.8) / 0.5, 0, 1);
    bucket.totalScore = (0.7 * bucket.keywordAgreement) + (0.3 * bucket.expensePriorScore);
  }

  return scoreMap;
}

export function inferImportDirectionDeterministic({ parsedCsv, mapping, auxiliaryColumns = null }) {
  const fallback = getDefaultDirectionInference();
  const normalizedAuxiliary = normalizeAuxiliary(auxiliaryColumns);

  if (!parsedCsv?.rows?.length) {
    return {
      ...fallback,
      strategy: "deterministic",
      warnings: ["No data rows for direction inference"],
      auxiliaryColumns: normalizedAuxiliary
    };
  }

  const splitMode = detectSplitColumnMode(parsedCsv.rows, normalizedAuxiliary);
  if (splitMode.amountMode === "split_outflow_inflow") {
    return {
      amountMode: "split_outflow_inflow",
      signConvention: "split_columns",
      strategy: "deterministic",
      confidence: clamp(0.85 + (0.15 * splitMode.confidence), 0, 1),
      warnings: [],
      auxiliaryColumns: normalizedAuxiliary,
      scoreByConvention: null
    };
  }

  const scoreByConvention = buildSignScores(parsedCsv.rows, mapping, normalizedAuxiliary);
  const negativeScore = scoreByConvention.negative_is_outflow.totalScore;
  const positiveScore = scoreByConvention.positive_is_outflow.totalScore;
  const delta = Math.abs(negativeScore - positiveScore);
  const ambiguous = delta < 0.12;

  const bestConvention = negativeScore >= positiveScore ? "negative_is_outflow" : "positive_is_outflow";
  const bestScore = Math.max(negativeScore, positiveScore);

  const warnings = [];
  if (ambiguous) {
    warnings.push("Direction convention ambiguous from deterministic signals");
  }

  return {
    amountMode: "single_amount",
    signConvention: bestConvention,
    strategy: "deterministic",
    confidence: clamp(ambiguous ? bestScore * 0.85 : bestScore, 0, 1),
    warnings,
    auxiliaryColumns: normalizedAuxiliary,
    ambiguous,
    scoreByConvention
  };
}

export function buildDirectionInferenceSample({ parsedCsv, mapping, directionInference }) {
  const rows = parsedCsv?.rows || [];
  const amountHeader = mapping?.amount || null;

  const amountSigns = {
    positive: 0,
    negative: 0,
    zero: 0,
    null: 0
  };

  for (const entry of rows.slice(0, 400)) {
    const signed = parseSignedAmount(amountHeader ? entry.row?.[amountHeader] : null);
    if (signed == null) {
      amountSigns.null += 1;
      continue;
    }
    if (signed > 0) {
      amountSigns.positive += 1;
    } else if (signed < 0) {
      amountSigns.negative += 1;
    } else {
      amountSigns.zero += 1;
    }
  }

  return {
    row_count: rows.length,
    headers: parsedCsv?.headers || [],
    mapping,
    auxiliary_columns: directionInference?.auxiliaryColumns || null,
    amount_signs_in_sample: amountSigns,
    deterministic_score: directionInference?.scoreByConvention || null,
    sample_rows: rows.slice(0, 12).map((entry) => entry.row)
  };
}

export function extractRowAmountAndDirection({ row, mapping, directionInference }) {
  const inference = directionInference || getDefaultDirectionInference();
  const auxiliaryColumns = normalizeAuxiliary(inference.auxiliaryColumns);

  if ((inference.amountMode === "split_outflow_inflow" || inference.amountMode === "split_debit_credit") && auxiliaryColumns.outflow && auxiliaryColumns.inflow) {
    const rawOutflow = row?.[auxiliaryColumns.outflow] ?? "";
    const rawInflow = row?.[auxiliaryColumns.inflow] ?? "";
    const outflowAmount = parseSignedAmount(rawOutflow);
    const inflowAmount = parseSignedAmount(rawInflow);

    if (outflowAmount != null && inflowAmount == null) {
      return {
        rawAmount: String(rawOutflow),
        signedAmount: -Math.abs(outflowAmount),
        directionFromColumns: "outflow"
      };
    }

    if (inflowAmount != null && outflowAmount == null) {
      return {
        rawAmount: String(rawInflow),
        signedAmount: Math.abs(inflowAmount),
        directionFromColumns: "inflow"
      };
    }

    if (outflowAmount != null && inflowAmount != null) {
      if (Math.abs(outflowAmount) >= Math.abs(inflowAmount)) {
        return {
          rawAmount: String(rawOutflow),
          signedAmount: -Math.abs(outflowAmount),
          directionFromColumns: "outflow"
        };
      }
      return {
        rawAmount: String(rawInflow),
        signedAmount: Math.abs(inflowAmount),
        directionFromColumns: "inflow"
      };
    }
  }

  return amountFromMappedColumn(row, mapping);
}

export function inferDirectionFromSignedAmount(signedAmount, signConvention) {
  return predictedDirectionForConvention(signedAmount, signConvention || "negative_is_outflow") || "outflow";
}
