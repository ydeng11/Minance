import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { buildApiTargetUrl, proxyApiRequest } from "./apiProxy";

test("buildApiTargetUrl defaults the self-host proxy to the same-container API", () => {
  assert.equal(
    buildApiTargetUrl("http://10.0.0.20:6001/v1/auth/login?source=selfhost", ["auth", "login"]),
    "http://127.0.0.1:3001/v1/auth/login?source=selfhost"
  );
});

test("buildApiTargetUrl honors a runtime API origin without retaining a build-time service name", () => {
  assert.equal(
    buildApiTargetUrl(
      "http://10.0.0.20:6001/v1/analytics/insights?range=3m",
      ["analytics", "insights"],
      "http://api-service:4100"
    ),
    "http://api-service:4100/v1/analytics/insights?range=3m"
  );
});

test("proxyApiRequest forwards method, body, and auth headers at request time", async () => {
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;
  const request = new Request("http://10.0.0.20:6001/v1/auth/login", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: "session=abc",
      host: "10.0.0.20:6001",
      origin: "http://10.0.0.20:6001"
    },
    body: JSON.stringify({ email: "user@example.com" })
  });

  const response = await proxyApiRequest(
    request,
    ["auth", "login"],
    async (url, init) => {
      capturedUrl = String(url);
      capturedInit = init;
      return new Response(JSON.stringify({ ok: true }), {
        status: 201,
        headers: { "content-type": "application/json", "set-cookie": "session=new; Path=/" }
      });
    },
    "http://127.0.0.1:3001"
  );

  assert.equal(capturedUrl, "http://127.0.0.1:3001/v1/auth/login");
  assert.equal(capturedInit?.method, "POST");
  assert.equal(new Headers(capturedInit?.headers).get("cookie"), "session=abc");
  assert.equal(new Headers(capturedInit?.headers).has("host"), false);
  assert.equal(new Headers(capturedInit?.headers).has("origin"), false);
  assert.equal(new TextDecoder().decode(capturedInit?.body as ArrayBuffer), '{"email":"user@example.com"}');
  assert.equal(response.status, 201);
  assert.match(response.headers.get("set-cookie") || "", /session=new/);
});

test("proxyApiRequest rejects a cross-origin browser request before forwarding credentials", async () => {
  let called = false;
  const response = await proxyApiRequest(
    new Request("http://10.0.0.20:6001/v1/auth/login", {
      method: "POST",
      headers: { origin: "http://malicious.example" }
    }),
    ["auth", "login"],
    async () => {
      called = true;
      return new Response();
    }
  );

  assert.equal(called, false);
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), {
    error: "Origin is not allowed.",
    code: "API_PROXY_ORIGIN_DENIED"
  });
});

test("proxyApiRequest returns a useful 502 when the internal API cannot resolve", async () => {
  const response = await proxyApiRequest(
    new Request("http://10.0.0.20:6001/v1/auth/login"),
    ["auth", "login"],
    async () => {
      throw Object.assign(new Error("getaddrinfo ENOTFOUND api"), { code: "ENOTFOUND" });
    },
    "http://api:3001",
    () => {}
  );

  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), {
    error: "Internal API is unavailable.",
    code: "API_PROXY_UNAVAILABLE"
  });
});

test("self-host compose passes runtime security settings into the combined container", () => {
  const compose = readFileSync(resolve(process.cwd(), "../../docker-compose.selfhost.yml"), "utf8");
  const webDockerfile = readFileSync(resolve(process.cwd(), "../../deploy/docker/Dockerfile.web"), "utf8");
  const combinedDockerfile = readFileSync(resolve(process.cwd(), "../../deploy/docker/Dockerfile.combined"), "utf8");
  assert.match(compose, /env_file:\s*\n\s*- \.env\.selfhost/);
  assert.match(compose, /extra_hosts:\s*\n\s*- "api:127\.0\.0\.1"/);
  assert.match(compose, /MINANCE_API_ORIGIN: http:\/\/127\.0\.0\.1:3001/);
  assert.doesNotMatch(webDockerfile, /ARG MINANCE_API_ORIGIN/);
  assert.doesNotMatch(combinedDockerfile, /ARG MINANCE_API_ORIGIN/);
});
