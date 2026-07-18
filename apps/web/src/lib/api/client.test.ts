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

test("api client retries with the refreshed token before React state rerenders", async () => {
  const renderTokens: Tokens = {
    accessToken: "access-stale",
    accessExpiresAt: "2026-01-01T00:00:00.000Z",
    refreshToken: "refresh-1",
    refreshExpiresAt: "2026-01-02T00:00:00.000Z"
  };
  let persistedTokens: Tokens | null = renderTokens;
  let authFailures = 0;
  const authorizationHeaders: Array<string | null> = [];

  const client = createApiClient({
    // React state remains render-scoped until setTokens schedules a rerender.
    getTokens: () => renderTokens,
    setTokens: (next) => {
      persistedTokens = next;
    },
    onAuthFailure: () => {
      authFailures += 1;
    }
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith("/v1/auth/refresh")) {
      return new Response(
        JSON.stringify({
          accessToken: "access-fresh",
          accessExpiresAt: "2026-01-01T01:00:00.000Z"
        }),
        { status: 200 }
      );
    }

    const authorization = init?.headers instanceof Headers ? init.headers.get("Authorization") : null;
    authorizationHeaders.push(authorization);
    if (authorization === "Bearer access-fresh") {
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
    return new Response(JSON.stringify({ error: { message: "Unauthorized" } }), { status: 401 });
  }) as typeof fetch;

  try {
    const result = await client.request<{ ok: boolean }>("/v1/data");

    assert.equal(result.ok, true);
    assert.equal(persistedTokens?.accessToken, "access-fresh");
    assert.equal(authFailures, 0);
    assert.deepEqual(authorizationHeaders, ["Bearer access-stale", "Bearer access-fresh"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("api client shares one refresh across concurrent expired requests", async () => {
  const renderTokens: Tokens = {
    accessToken: "access-stale",
    accessExpiresAt: "2026-01-01T00:00:00.000Z",
    refreshToken: "refresh-1",
    refreshExpiresAt: "2026-01-02T00:00:00.000Z"
  };
  let refreshCalls = 0;

  const client = createApiClient({
    getTokens: () => renderTokens,
    setTokens: () => {},
    onAuthFailure: () => {}
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith("/v1/auth/refresh")) {
      refreshCalls += 1;
      await new Promise((resolve) => setTimeout(resolve, 5));
      return new Response(
        JSON.stringify({
          accessToken: "access-fresh",
          accessExpiresAt: "2026-01-01T01:00:00.000Z"
        }),
        { status: 200 }
      );
    }

    const authorization = init?.headers instanceof Headers ? init.headers.get("Authorization") : null;
    if (authorization === "Bearer access-fresh") {
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
    return new Response(JSON.stringify({ error: { message: "Unauthorized" } }), { status: 401 });
  }) as typeof fetch;

  try {
    const results = await Promise.all([
      client.request<{ ok: boolean }>("/v1/data/one"),
      client.request<{ ok: boolean }>("/v1/data/two")
    ]);

    assert.deepEqual(results, [{ ok: true }, { ok: true }]);
    assert.equal(refreshCalls, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("api client clears auth state on 401 when refresh token is missing", async () => {
  let currentTokens: Tokens | null = {
    accessToken: "access-stale",
    accessExpiresAt: "2026-01-01T00:00:00.000Z"
  } as unknown as Tokens;

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
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("/v1/data")) {
      return new Response(JSON.stringify({ error: { message: "Unauthorized" } }), { status: 401 });
    }
    return new Response(JSON.stringify({ error: { message: "Unknown route" } }), { status: 404 });
  }) as typeof fetch;

  try {
    await assert.rejects(() => client.request("/v1/data"));
    assert.equal(currentTokens, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
