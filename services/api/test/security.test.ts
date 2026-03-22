import test from "node:test"
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

import { applyCors, applySecurityHeaders, checkRateLimit, resetRateLimitForTests } from "../src/security.ts"

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url))
const SECURITY_MODULE_URL = pathToFileURL(path.join(TEST_DIR, "../src/security.ts")).href

function createMockResponse() {
  const headers = {}
  return {
    headers,
    setHeader(name, value) {
      headers[name] = value
    }
  }
}

function runApplyCorsInChild({ origin, env }) {
  const childEnv = {
    ...process.env,
    ...env
  }
  for (const [key, value] of Object.entries(env)) {
    if (value == null) {
      delete childEnv[key]
    }
  }

  const req = origin ? { headers: { origin } } : { headers: {} }
  const stdout = execFileSync(
    process.execPath,
    [
      "--input-type=module",
      "--eval",
      `
        import { applyCors } from ${JSON.stringify(SECURITY_MODULE_URL)};

        const headers = {};
        const res = {
          setHeader(name, value) {
            headers[name] = value;
          }
        };

        console.log(JSON.stringify({
          allowed: applyCors(${JSON.stringify(req)}, res),
          headers
        }));
      `
    ],
    {
      encoding: "utf8",
      env: childEnv
    }
  )

  return JSON.parse(stdout)
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

test("applyCors allows localhost origins on arbitrary ports in development without an explicit override", () => {
  const result = runApplyCorsInChild({
    origin: "http://localhost:4317",
    env: {
      NODE_ENV: "development",
      MINANCE_ALLOWED_ORIGINS: null
    }
  })

  assert.equal(result.allowed, true)
  assert.equal(result.headers["Access-Control-Allow-Origin"], "http://localhost:4317")
})

test("applyCors keeps explicit allowed origins authoritative in development", () => {
  const result = runApplyCorsInChild({
    origin: "http://localhost:4317",
    env: {
      NODE_ENV: "development",
      MINANCE_ALLOWED_ORIGINS: "http://localhost:3000"
    }
  })

  assert.equal(result.allowed, false)
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
