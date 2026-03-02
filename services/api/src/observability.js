import crypto from "node:crypto"

import { STORE_BACKEND } from "./config.js"
import { nowIso } from "./utils.js"
import { getSqliteFoundationStatus } from "./sqlite-foundation.js"

const STATUS_CLASS_KEYS = ["1xx", "2xx", "3xx", "4xx", "5xx", "other"]
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/
const SERVICE_NAME = "minance-api"

const state = createDefaultState()

function createDefaultState(startedAtMs = Date.now()) {
  return {
    startedAtMs,
    http: {
      requestsTotal: 0,
      inFlight: 0,
      byMethod: {},
      byRoute: {},
      byStatusClass: Object.fromEntries(STATUS_CLASS_KEYS.map((key) => [key, 0])),
      durationMs: {
        total: 0,
        max: 0
      },
      lastRequestAt: null
    }
  }
}

function incrementCounter(counter, key, amount = 1) {
  counter[key] = (counter[key] || 0) + amount
}

function copyCounter(counter) {
  return Object.fromEntries(
    Object.entries(counter)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => [key, Number(value) || 0])
  )
}

function classifyStatus(statusCode) {
  const normalized = Number(statusCode)
  if (!Number.isFinite(normalized) || normalized < 100 || normalized >= 600) {
    return "other"
  }
  return `${Math.floor(normalized / 100)}xx`
}

export function createRequestId(headerValue) {
  const rawValue = Array.isArray(headerValue) ? headerValue[0] : headerValue
  const candidate = rawValue == null ? "" : String(rawValue).trim()
  if (REQUEST_ID_PATTERN.test(candidate)) {
    return candidate
  }
  return crypto.randomUUID()
}

export function beginHttpObservation(req, routeLabel = null, startedAtMs = Date.now()) {
  const method = String(req?.method || "UNKNOWN").toUpperCase()
  const route = routeLabel ? String(routeLabel) : "unmatched"
  state.http.requestsTotal += 1
  state.http.inFlight += 1
  incrementCounter(state.http.byMethod, method)
  incrementCounter(state.http.byRoute, route)
  return {
    startedAtMs,
    method,
    route
  }
}

export function endHttpObservation(observation, statusCode, finishedAtMs = Date.now()) {
  const startedAtMs = Number(observation?.startedAtMs) || finishedAtMs
  const durationMs = Math.max(0, Number(finishedAtMs) - startedAtMs)
  state.http.inFlight = Math.max(0, state.http.inFlight - 1)
  incrementCounter(state.http.byStatusClass, classifyStatus(statusCode))
  state.http.durationMs.total += durationMs
  state.http.durationMs.max = Math.max(state.http.durationMs.max, durationMs)
  state.http.lastRequestAt = nowIso()
  return durationMs
}

export function getHealthStatus(nowMs = Date.now()) {
  return {
    service: SERVICE_NAME,
    status: "ok",
    timestamp: nowIso(),
    uptimeSeconds: Math.max(0, Math.floor((Number(nowMs) - state.startedAtMs) / 1000))
  }
}

export function getReadinessStatus() {
  const sqlite = getSqliteFoundationStatus()
  const checks = []

  if (STORE_BACKEND === "sqlite") {
    checks.push({
      name: "sqlite.foundation",
      ok: Boolean(sqlite.ready),
      detail: sqlite.ready
        ? `${sqlite.migrationsApplied} migration entries`
        : sqlite.lastError || "SQLite foundation not ready"
    })
  } else {
    checks.push({
      name: "json.store",
      ok: true,
      detail: "JSON store backend active"
    })
  }

  const ready = checks.every((check) => check.ok)

  return {
    service: SERVICE_NAME,
    status: ready ? "ready" : "not_ready",
    ready,
    timestamp: nowIso(),
    storage: {
      backend: STORE_BACKEND,
      sqlite
    },
    checks
  }
}

export function getMetricsSnapshot(nowMs = Date.now()) {
  return {
    service: SERVICE_NAME,
    timestamp: nowIso(),
    uptimeSeconds: Math.max(0, Math.floor((Number(nowMs) - state.startedAtMs) / 1000)),
    http: {
      requestsTotal: state.http.requestsTotal,
      inFlight: state.http.inFlight,
      byMethod: copyCounter(state.http.byMethod),
      byRoute: copyCounter(state.http.byRoute),
      byStatusClass: copyCounter(state.http.byStatusClass),
      durationMs: {
        total: state.http.durationMs.total,
        max: state.http.durationMs.max,
        average:
          state.http.requestsTotal > 0
            ? Math.round((state.http.durationMs.total / state.http.requestsTotal) * 100) / 100
            : 0
      },
      lastRequestAt: state.http.lastRequestAt
    }
  }
}

export function logStructuredEvent(level, event, fields = {}) {
  const payload = {
    timestamp: nowIso(),
    level,
    event,
    ...fields
  }
  const line = JSON.stringify(payload)
  if (level === "error") {
    console.error(line)
    return
  }
  if (level === "warn") {
    console.warn(line)
    return
  }
  console.log(line)
}

export function resetObservabilityForTests(startedAtMs = Date.now()) {
  const next = createDefaultState(startedAtMs)
  state.startedAtMs = next.startedAtMs
  state.http.requestsTotal = next.http.requestsTotal
  state.http.inFlight = next.http.inFlight
  state.http.byMethod = next.http.byMethod
  state.http.byRoute = next.http.byRoute
  state.http.byStatusClass = next.http.byStatusClass
  state.http.durationMs = next.http.durationMs
  state.http.lastRequestAt = next.http.lastRequestAt
}
