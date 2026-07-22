const DEFAULT_API_ORIGIN = "http://127.0.0.1:3001";
const REQUEST_HEADERS_TO_REMOVE = new Set([
  "connection",
  "content-length",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade"
]);
const RESPONSE_HEADERS_TO_REMOVE = new Set([
  "connection",
  "content-encoding",
  "content-length",
  "keep-alive",
  "transfer-encoding"
]);

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

function resolveApiOrigin(configuredOrigin?: string) {
  const rawOrigin = String(configuredOrigin || DEFAULT_API_ORIGIN).trim();
  const parsed = new URL(rawOrigin);
  if (!new Set(["http:", "https:"]).has(parsed.protocol) || parsed.username || parsed.password) {
    throw new Error("MINANCE_API_ORIGIN must be an HTTP(S) origin without credentials");
  }
  return parsed.origin;
}

export function buildApiTargetUrl(requestUrl: string, pathSegments: string[], configuredOrigin?: string) {
  const request = new URL(requestUrl);
  const encodedPath = pathSegments.map((segment) => encodeURIComponent(segment)).join("/");
  const target = new URL(`/v1/${encodedPath}`, resolveApiOrigin(configuredOrigin));
  target.search = request.search;
  return target.toString();
}

function buildForwardHeaders(request: Request) {
  const headers = new Headers(request.headers);
  for (const header of REQUEST_HEADERS_TO_REMOVE) headers.delete(header);
  headers.delete("origin");
  const requestUrl = new URL(request.url);
  headers.set("x-forwarded-host", requestUrl.host);
  headers.set("x-forwarded-proto", requestUrl.protocol.slice(0, -1));
  return headers;
}

function getAcceptedRequestOrigins(request: Request) {
  const requestUrl = new URL(request.url);
  const origins = new Set([requestUrl.origin]);
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0].trim();
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0].trim();
  if (forwardedHost && (forwardedProto === "http" || forwardedProto === "https")) {
    origins.add(`${forwardedProto}://${forwardedHost}`);
  }
  return origins;
}

function buildResponseHeaders(upstream: Response) {
  const headers = new Headers(upstream.headers);
  for (const header of RESPONSE_HEADERS_TO_REMOVE) headers.delete(header);
  return headers;
}

export async function proxyApiRequest(
  request: Request,
  pathSegments: string[],
  fetchImpl: FetchLike = fetch,
  configuredOrigin = process.env.MINANCE_API_ORIGIN,
  onError: (message: string, error: unknown) => void = console.error
) {
  try {
    const browserOrigin = request.headers.get("origin");
    if (browserOrigin && !getAcceptedRequestOrigins(request).has(browserOrigin)) {
      return Response.json(
        { error: "Origin is not allowed.", code: "API_PROXY_ORIGIN_DENIED" },
        { status: 403 }
      );
    }
    const targetUrl = buildApiTargetUrl(request.url, pathSegments, configuredOrigin);
    if (new URL(targetUrl).origin === new URL(request.url).origin) {
      throw new Error("MINANCE_API_ORIGIN points back to the web server");
    }
    const hasBody = request.method !== "GET" && request.method !== "HEAD";
    const upstream = await fetchImpl(targetUrl, {
      method: request.method,
      headers: buildForwardHeaders(request),
      body: hasBody ? await request.arrayBuffer() : undefined,
      redirect: "manual",
      signal: request.signal
    });
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: buildResponseHeaders(upstream)
    });
  } catch (error) {
    onError("Minance API proxy failed", error);
    return Response.json(
      { error: "Internal API is unavailable.", code: "API_PROXY_UNAVAILABLE" },
      { status: 502 }
    );
  }
}
