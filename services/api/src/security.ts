import {
  AUTH_RATE_LIMIT_MAX_REQUESTS,
  CORS_ALLOW_CREDENTIALS,
  DEFAULT_RATE_LIMIT_MAX_REQUESTS,
  HAS_EXPLICIT_ALLOWED_ORIGINS,
  RATE_LIMIT_WINDOW_MS,
  SECURITY_ALLOWED_ORIGINS
} from "./config.ts"

const HOP_BY_HOP_HEADERS = "Content-Type, Authorization, X-Request-Id"
const ALLOWED_METHODS = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1", "[::1]"])
const SECURE_HEADERS = {
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Cross-Origin-Opener-Policy": "same-origin"
}

const rateLimitBuckets = new Map()

function getHeaderValue(value) {
  return Array.isArray(value) ? value[0] : value
}

function originAllowAll() {
  return SECURITY_ALLOWED_ORIGINS.includes("*")
}

function allowDevelopmentLoopbackOrigin(origin) {
  if (HAS_EXPLICIT_ALLOWED_ORIGINS || process.env.NODE_ENV !== "development") {
    return false
  }

  try {
    const parsedOrigin = new URL(origin)
    return parsedOrigin.protocol === "http:" && LOOPBACK_HOSTNAMES.has(parsedOrigin.hostname)
  } catch {
    return false
  }
}

export function isOriginAllowed(origin) {
  if (!origin) {
    return true
  }
  if (originAllowAll()) {
    return true
  }
  if (SECURITY_ALLOWED_ORIGINS.includes(origin)) {
    return true
  }
  return allowDevelopmentLoopbackOrigin(origin)
}

export function applyCors(req, res) {
  const origin = getHeaderValue(req.headers.origin)
  if (origin && !isOriginAllowed(origin)) {
    return false
  }

  if (originAllowAll()) {
    res.setHeader("Access-Control-Allow-Origin", "*")
  } else if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin)
    res.setHeader("Vary", "Origin")
  }

  res.setHeader("Access-Control-Allow-Headers", HOP_BY_HOP_HEADERS)
  res.setHeader("Access-Control-Allow-Methods", ALLOWED_METHODS)
  if (CORS_ALLOW_CREDENTIALS) {
    res.setHeader("Access-Control-Allow-Credentials", "true")
  }
  return true
}

function getForwardedProto(req) {
  const value = getHeaderValue(req.headers["x-forwarded-proto"])
  return value ? String(value).toLowerCase() : ""
}

export function applySecurityHeaders(req, res) {
  for (const [name, value] of Object.entries(SECURE_HEADERS)) {
    res.setHeader(name, value)
  }

  const isTls =
    req.socket?.encrypted === true || getForwardedProto(req).split(",")[0].trim() === "https"
  if (isTls) {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
  }
}

function getClientIp(req) {
  const forwardedFor = getHeaderValue(req.headers["x-forwarded-for"])
  if (forwardedFor) {
    const parsed = String(forwardedFor)
      .split(",")[0]
      .trim()
    if (parsed) {
      return parsed
    }
  }
  return req.socket?.remoteAddress || "unknown"
}

function resolveRatePolicy(pathname) {
  if (pathname.startsWith("/v1/auth/")) {
    return {
      name: "auth",
      maxRequests: AUTH_RATE_LIMIT_MAX_REQUESTS
    }
  }
  return {
    name: "default",
    maxRequests: DEFAULT_RATE_LIMIT_MAX_REQUESTS
  }
}

function getBucketWindow(nowMs) {
  return Math.floor(Number(nowMs) / RATE_LIMIT_WINDOW_MS)
}

function cleanupRateBuckets(currentWindow) {
  for (const key of rateLimitBuckets.keys()) {
    const [, windowText] = key.split(":window:")
    const window = Number(windowText)
    if (!Number.isFinite(window) || window < currentWindow - 2) {
      rateLimitBuckets.delete(key)
    }
  }
}

export function checkRateLimit(req, pathname, nowMs = Date.now()) {
  if (pathname === "/healthz" || pathname === "/readyz") {
    return {
      allowed: true,
      policy: "health",
      limit: Number.POSITIVE_INFINITY,
      remaining: Number.POSITIVE_INFINITY,
      retryAfterSeconds: 0,
      resetAt: new Date(nowMs + RATE_LIMIT_WINDOW_MS).toISOString()
    }
  }

  const policy = resolveRatePolicy(pathname)
  const window = getBucketWindow(nowMs)
  cleanupRateBuckets(window)

  const clientIp = getClientIp(req)
  const key = `${policy.name}:${clientIp}:window:${window}`
  const current = (rateLimitBuckets.get(key) || 0) + 1
  rateLimitBuckets.set(key, current)

  const allowed = current <= policy.maxRequests
  const remaining = Math.max(0, policy.maxRequests - current)
  const resetAtMs = (window + 1) * RATE_LIMIT_WINDOW_MS
  return {
    allowed,
    policy: policy.name,
    limit: policy.maxRequests,
    remaining,
    retryAfterSeconds: allowed ? 0 : Math.max(1, Math.ceil((resetAtMs - nowMs) / 1000)),
    resetAt: new Date(resetAtMs).toISOString()
  }
}

export function resetRateLimitForTests() {
  rateLimitBuckets.clear()
}
