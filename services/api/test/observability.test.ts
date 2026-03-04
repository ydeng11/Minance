import test from "node:test"
import assert from "node:assert/strict"

import {
  beginHttpObservation,
  createRequestId,
  endHttpObservation,
  getHealthStatus,
  getMetricsSnapshot,
  getReadinessStatus,
  resetObservabilityForTests
} from "../src/observability.ts"

test("observability tracks request counters and timing", () => {
  resetObservabilityForTests(1_000)
  const observation = beginHttpObservation({ method: "get" }, "/v1/system/storage", 1_250)
  const durationMs = endHttpObservation(observation, 200, 1_290)

  assert.equal(durationMs, 40)

  const metrics = getMetricsSnapshot(2_000)
  assert.equal(metrics.uptimeSeconds, 1)
  assert.equal(metrics.http.requestsTotal, 1)
  assert.equal(metrics.http.inFlight, 0)
  assert.equal(metrics.http.byMethod.GET, 1)
  assert.equal(metrics.http.byRoute["/v1/system/storage"], 1)
  assert.equal(metrics.http.byStatusClass["2xx"], 1)
  assert.equal(metrics.http.durationMs.total, 40)
  assert.equal(metrics.http.durationMs.max, 40)
  assert.equal(metrics.http.durationMs.average, 40)
  assert.equal(typeof metrics.http.lastRequestAt, "string")
})

test("observability classifies status classes and request-id fallback", () => {
  resetObservabilityForTests(0)
  const one = beginHttpObservation({ method: "post" }, "/v1/transactions", 10)
  endHttpObservation(one, 429, 20)
  const two = beginHttpObservation({ method: "post" }, "/v1/transactions", 30)
  endHttpObservation(two, 503, 60)

  const metrics = getMetricsSnapshot(61)
  assert.equal(metrics.http.byStatusClass["4xx"], 1)
  assert.equal(metrics.http.byStatusClass["5xx"], 1)

  assert.equal(createRequestId("req-12345678"), "req-12345678")
  const generated = createRequestId("bad")
  assert.equal(typeof generated, "string")
  assert.equal(/^[0-9a-f-]{36}$/.test(generated), true)
})

test("health and readiness payloads expose expected shape", () => {
  resetObservabilityForTests(0)
  const health = getHealthStatus(3_000)
  assert.equal(health.service, "minance-api")
  assert.equal(health.status, "ok")
  assert.equal(health.uptimeSeconds, 3)
  assert.equal(typeof health.timestamp, "string")

  const readiness = getReadinessStatus()
  assert.equal(readiness.service, "minance-api")
  assert.equal(typeof readiness.ready, "boolean")
  assert.equal(typeof readiness.timestamp, "string")
  assert.equal(Array.isArray(readiness.checks), true)
  assert.equal(typeof readiness.storage.backend, "string")
})
