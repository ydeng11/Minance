import test from "node:test";
import assert from "node:assert/strict";
import { createApiClient } from "./client";
import type { Tokens } from "./types";

test("api client refreshes token on 401 and retries request", async () => {
  const calls: string[] = [];

  let currentTokens: Tokens | null = {
    accessToken: "access-1",
    accessExpiresAt: "2026-01-01T00:00:00.000Z",
    refreshToken: "refresh-1",
    refreshExpiresAt: "2026-01-02T00:00:00.000Z"
  };

  const client = createApiClient({
    getTokens: () => currentTokens,
    setTokens: (next) => {
      currentTokens = next;
    },
    onAuthFailure: () => {
      currentTokens = null;
    }
  });

  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push(`${init?.method || "GET"} ${url}`);

    if (url.endsWith("/v1/data")) {
      const auth = init?.headers instanceof Headers ? init.headers.get("Authorization") : null;
      if (auth === "Bearer access-1") {
        return new Response(JSON.stringify({ error: { message: "Unauthorized" } }), { status: 401 });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    if (url.endsWith("/v1/auth/refresh")) {
      return new Response(
        JSON.stringify({
          accessToken: "access-2",
          accessExpiresAt: "2026-01-01T01:00:00.000Z"
        }),
        { status: 200 }
      );
    }

    return new Response(JSON.stringify({ error: { message: "Unknown route" } }), { status: 404 });
  }) as typeof fetch;

  try {
    const result = await client.request<{ ok: boolean }>("/v1/data");
    assert.equal(result.ok, true);
    assert.equal(currentTokens?.accessToken, "access-2");
    assert.deepEqual(calls, ["GET /v1/data", "POST /v1/auth/refresh", "GET /v1/data"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
