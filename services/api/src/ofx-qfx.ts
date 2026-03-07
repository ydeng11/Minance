import path from "node:path";

const OFX_QFX_EXTENSIONS = new Set([".ofx", ".qfx"]);

function decodeEntities(value) {
  return String(value || "")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/g, "'");
}

function normalizeTextValue(value) {
  return decodeEntities(String(value || "").replace(/\s+/g, " ").trim());
}

function extractTagValue(block, tag) {
  const pattern = new RegExp(`<${tag}>([^<\\r\\n]+)`, "i");
  const match = pattern.exec(block);
  return match ? normalizeTextValue(match[1]) : "";
}

function parseOfxDate(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length < 8) {
    return null;
  }
  const yyyy = digits.slice(0, 4);
  const mm = digits.slice(4, 6);
  const dd = digits.slice(6, 8);
  return `${yyyy}-${mm}-${dd}`;
}

function normalizeAmount(value) {
  const numeric = Number(String(value || "").replace(/,/g, ""));
  if (!Number.isFinite(numeric)) {
    return null;
  }
  return Math.round(numeric * 100) / 100;
}

function inferDirection(amount, transactionType) {
  if (amount < 0) {
    return "outflow";
  }
  if (amount > 0) {
    return "inflow";
  }
  const normalizedType = String(transactionType || "").trim().toUpperCase();
  if (["DEBIT", "CHECK", "PAYMENT", "ATM", "POS", "FEE"].includes(normalizedType)) {
    return "outflow";
  }
  return "inflow";
}

export function isOfxQfxFile(fileName = "") {
  const extension = path.extname(String(fileName || "").trim()).toLowerCase();
  return OFX_QFX_EXTENSIONS.has(extension);
}

export function parseOfxQfx(text, options = {}) {
  const content = String(text || "");
  if (!/<OFX>/i.test(content)) {
    throw new Error("Invalid OFX/QFX payload");
  }

  const currency = extractTagValue(content, "CURDEF") || "USD";
  const accountId = extractTagValue(content, "ACCTID");
  const accountType = extractTagValue(content, "ACCTTYPE");
  const accountName = [accountType, accountId].filter(Boolean).join(" ").trim() || "Imported Account";

  const transactionBlocks = [...content.matchAll(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi)];
  if (transactionBlocks.length === 0) {
    throw new Error("No STMTTRN entries found in OFX/QFX payload");
  }

  const rows = [];
  const warnings = [];

  transactionBlocks.forEach((match, index) => {
    const block = match[1] || "";
    const transactionDate = parseOfxDate(
      extractTagValue(block, "DTPOSTED")
      || extractTagValue(block, "DTUSER")
      || extractTagValue(block, "DTAVAIL")
    );
    const amount = normalizeAmount(extractTagValue(block, "TRNAMT"));
    const transactionType = extractTagValue(block, "TRNTYPE");
    const merchant = extractTagValue(block, "NAME") || extractTagValue(block, "PAYEE") || "Unknown Merchant";
    const memo = extractTagValue(block, "MEMO");
    const reference = extractTagValue(block, "FITID") || extractTagValue(block, "CHECKNUM");

    if (!transactionDate) {
      warnings.push(`Row ${index + 1}: missing or invalid DTPOSTED date`);
    }
    if (amount == null) {
      warnings.push(`Row ${index + 1}: missing or invalid TRNAMT amount`);
    }

    const safeAmount = amount == null ? 0 : amount;
    const direction = inferDirection(safeAmount, transactionType);
    const signedAmount = direction === "outflow" ? -Math.abs(safeAmount) : Math.abs(safeAmount);

    rows.push({
      rowIndex: index + 1,
      row: {
        date: transactionDate || "",
        merchant,
        description: memo || merchant,
        amount: signedAmount.toFixed(2),
        direction,
        currency,
        account: accountName,
        memo: memo || "",
        reference: reference || ""
      }
    });
  });

  const fileName = String(options.fileName || "").trim();
  if (fileName && !isOfxQfxFile(fileName)) {
    warnings.push("Parsed OFX/QFX content from a non-standard file extension.");
  }

  return {
    delimiter: ",",
    hasHeader: true,
    headers: ["date", "merchant", "description", "amount", "direction", "currency", "account", "memo", "reference"],
    rows,
    warnings
  };
}
