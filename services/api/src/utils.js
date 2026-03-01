import crypto from "node:crypto";

export function nowIso() {
  return new Date().toISOString();
}

export function createId(prefix = "id") {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function sendJson(res, statusCode, body) {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(payload);
}

export function sendNoContent(res) {
  res.writeHead(204);
  res.end();
}

export function sendError(res, statusCode, message, details = null) {
  sendJson(res, statusCode, {
    error: {
      message,
      ...(details ? { details } : {})
    }
  });
}

export function parseJsonBody(req, maxBytes = 25 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let raw = "";

    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > maxBytes) {
        reject(new Error("Request body too large"));
      }
    });

    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Invalid JSON request body"));
      }
    });

    req.on("error", (error) => {
      reject(error);
    });
  });
}

export function parseAuthToken(req) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    return null;
  }
  return header.slice("Bearer ".length).trim();
}

export function hashPassword(password, salt = null) {
  const normalizedSalt = salt || crypto.randomBytes(16).toString("hex");
  const passwordHash = crypto.scryptSync(password, normalizedSalt, 64).toString("hex");
  return { passwordHash, salt: normalizedSalt };
}

export function verifyPassword(password, passwordHash, salt) {
  const computed = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(computed, "hex"), Buffer.from(passwordHash, "hex"));
}

export function randomToken(length = 48) {
  return crypto.randomBytes(length).toString("base64url");
}

export function stableHash(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function maskKey(value) {
  if (!value || value.length < 8) {
    return "****";
  }
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export function normalizeText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function toDecimal(value) {
  if (value == null || value === "") {
    return null;
  }
  const cleaned = String(value).replace(/[$,\s]/g, "");
  const parsed = Number(cleaned);
  if (Number.isNaN(parsed)) {
    return null;
  }
  return Math.round(parsed * 100) / 100;
}

export function parseDate(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return localDateYmd(value);
  }

  const text = String(value).trim();
  if (!text) {
    return null;
  }

  const isoLike = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/);
  if (isoLike) {
    const normalized = `${isoLike[1]}-${isoLike[2]}-${isoLike[3]}`;
    const candidate = new Date(`${normalized}T12:00:00Z`);
    if (!Number.isNaN(candidate.getTime())) {
      return normalized;
    }
  }

  const slash = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if (slash) {
    const month = slash[1].padStart(2, "0");
    const day = slash[2].padStart(2, "0");
    const year = slash[3].length === 2 ? `20${slash[3]}` : slash[3];
    return `${year}-${month}-${day}`;
  }

  const fallback = new Date(text);
  if (!Number.isNaN(fallback.getTime())) {
    return localDateYmd(fallback);
  }

  return null;
}

export function monthKey(dateText) {
  const date = parseDate(dateText);
  if (!date) {
    return null;
  }
  return date.slice(0, 7);
}

export function startOfToday() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

function localDateYmd(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

export function computeDateRange(range = "90d", start = null, end = null) {
  if (start || end) {
    return {
      start: start ? parseDate(start) : null,
      end: end ? parseDate(end) : null
    };
  }

  const today = startOfToday();
  let startDate = new Date(today);

  if (range === "30d") {
    startDate.setDate(startDate.getDate() - 30);
  } else if (range === "90d") {
    startDate.setDate(startDate.getDate() - 90);
  } else if (range === "365d") {
    startDate.setDate(startDate.getDate() - 365);
  } else if (range === "all") {
    return {
      start: null,
      end: null
    };
  } else if (range === "ytd") {
    startDate = new Date(today.getFullYear(), 0, 1);
  } else {
    startDate.setDate(startDate.getDate() - 90);
  }

  return {
    start: localDateYmd(startDate),
    end: localDateYmd(today)
  };
}

export function inDateRange(dateText, start, end) {
  const normalized = parseDate(dateText);
  if (!normalized) {
    return false;
  }
  if (start && normalized < start) {
    return false;
  }
  if (end && normalized > end) {
    return false;
  }
  return true;
}

export function pick(obj, keys) {
  const out = {};
  for (const key of keys) {
    if (Object.hasOwn(obj, key)) {
      out[key] = obj[key];
    }
  }
  return out;
}

export function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
