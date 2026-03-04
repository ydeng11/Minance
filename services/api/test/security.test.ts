import test from "node:test"
import assert from "node:assert/strict"

import { applyCors, applySecurityHeaders, checkRateLimit, resetRateLimitForTests } from "../src/security.ts"

function createMockResponse() {
  const headers = {}
  return {
    headers,
    setHeader(name, value) {
      headers[name] = value
    }
  }
}

test("applyCors allows trusted local origin and blocks unknown origin", () => {
  const allowedReq = { headers: { origin: "http://localhost:3000" } }
  const allowedRes = createMockResponse()
  assert.equal(applyCors(allowedReq, allowedRes), true)
  assert.equal(allowedRes.headers["Access-Control-Allow-Origin"], "http://localhost:3000")
  assert.equal(typeof allowedRes.headers["Access-Control-Allow-Methods"], "string")

  const blockedReq = { headers: { origin: "https://evil.example" } }
  const blockedRes = createMockResponse()
  assert.equal(applyCors(blockedReq, blockedRes), false)
})

test("applySecurityHeaders emits secure defaults and HSTS on TLS", () => {
  const req = {
    headers: {
      "x-forwarded-proto": "https"
    },
    socket: {
      encrypted: false
    }
  }
  const res = createMockResponse()
  applySecurityHeaders(req, res)

  assert.equal(res.headers["X-Content-Type-Options"], "nosniff")
  assert.equal(res.headers["X-Frame-Options"], "DENY")
  assert.equal(res.headers["Referrer-Policy"], "no-referrer")
  assert.equal(res.headers["Strict-Transport-Security"], "max-age=31536000; includeSubDomains")
})

test("auth endpoints use stricter rate limits", () => {
  resetRateLimitForTests()
  const req = {
    headers: {},
    socket: {
      remoteAddress: "203.0.113.10"
    }
  }

  const first = checkRateLimit(req, "/v1/auth/login", 1_000)
  for (let i = 1; i < first.limit; i += 1) {
    const next = checkRateLimit(req, "/v1/auth/login", 1_000)
    assert.equal(next.allowed, true)
  }

  const denied = checkRateLimit(req, "/v1/auth/login", 1_000)
  assert.equal(denied.allowed, false)
  assert.equal(denied.policy, "auth")
  assert.equal(denied.retryAfterSeconds > 0, true)
})

test("health probes bypass rate limits", () => {
  resetRateLimitForTests()
  const req = {
    headers: {},
    socket: {
      remoteAddress: "203.0.113.99"
    }
  }

  const health = checkRateLimit(req, "/healthz", 2_000)
  assert.equal(health.allowed, true)
  assert.equal(Number.isFinite(health.limit), false)
})
