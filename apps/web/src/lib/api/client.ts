import type { Tokens, ApiErrorPayload } from "@/lib/api/types";

export class ApiError extends Error {
  status: number;
  payload: ApiErrorPayload | null;

  constructor(message: string, status: number, payload: ApiErrorPayload | null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

export interface ApiClientContext {
  getTokens: () => Tokens | null;
  setTokens: (tokens: Tokens | null) => void;
  onAuthFailure: () => void;
}

export interface RequestOptions extends Omit<RequestInit, "body"> {
  auth?: boolean;
  retry?: boolean;
  body?: BodyInit | Record<string, unknown> | null;
}

function parseErrorMessage(status: number, payload: ApiErrorPayload | null) {
  const base = payload?.error?.message || `Request failed (${status})`;
  const remediation = payload?.error?.details?.remediation;
  return remediation ? `${base}: ${remediation}` : base;
}

async function parsePayload<T>(response: Response): Promise<T | null> {
  if (response.status === 204) {
    return null;
  }
  return (await response.json().catch(() => null)) as T | null;
}

function buildBody(body: RequestOptions["body"]) {
  if (!body) {
    return undefined;
  }
  if (typeof FormData !== "undefined" && body instanceof FormData) {
    return body;
  }
  if (typeof body === "string" || body instanceof Blob || body instanceof URLSearchParams || body instanceof ArrayBuffer) {
    return body;
  }
  return JSON.stringify(body);
}

export function createApiClient(context: ApiClientContext) {
  async function refreshAccessToken(tokens: Tokens): Promise<boolean> {
    if (!tokens.refreshToken) {
      return false;
    }

    const response = await fetch("/v1/auth/refresh", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ refreshToken: tokens.refreshToken })
    });

    if (!response.ok) {
      return false;
    }

    const payload = (await parsePayload<{ accessToken: string; accessExpiresAt: string }>(response)) || null;
    if (!payload?.accessToken || !payload.accessExpiresAt) {
      return false;
    }

    context.setTokens({
      ...tokens,
      accessToken: payload.accessToken,
      accessExpiresAt: payload.accessExpiresAt
    });

    return true;
  }

  async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { auth = true, retry = true, body, headers, ...rest } = options;
    const tokens = context.getTokens();

    const requestHeaders = new Headers(headers || {});
    const requestBody = buildBody(body);

    if (requestBody && !(requestBody instanceof FormData)) {
      requestHeaders.set("Content-Type", "application/json");
    }
    if (auth && tokens?.accessToken) {
      requestHeaders.set("Authorization", `Bearer ${tokens.accessToken}`);
    }

    const response = await fetch(path, {
      ...rest,
      headers: requestHeaders,
      body: requestBody
    });

    if (response.status === 401 && auth && retry && tokens?.refreshToken) {
      const refreshed = await refreshAccessToken(tokens);
      if (refreshed) {
        return request<T>(path, { ...options, retry: false });
      }
      context.setTokens(null);
      context.onAuthFailure();
    }

    const payload = await parsePayload<T & ApiErrorPayload>(response);

    if (!response.ok) {
      throw new ApiError(parseErrorMessage(response.status, payload as ApiErrorPayload | null), response.status, payload as ApiErrorPayload | null);
    }

    return payload as T;
  }

  return {
    request
  };
}
