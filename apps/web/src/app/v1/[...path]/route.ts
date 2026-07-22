import { proxyApiRequest } from "@/lib/apiProxy";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

async function handleApiRequest(request: Request, context: RouteContext) {
  const { path } = await context.params;
  return proxyApiRequest(request, path);
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const GET = handleApiRequest;
export const POST = handleApiRequest;
export const PUT = handleApiRequest;
export const PATCH = handleApiRequest;
export const DELETE = handleApiRequest;
export const OPTIONS = handleApiRequest;
