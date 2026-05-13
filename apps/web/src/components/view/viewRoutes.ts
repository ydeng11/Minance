const VIEW_ROUTE_PATHS = ["/explorer", "/transactions"] as const;

function normalizePathname(pathname: string) {
  const trimmed = pathname.trim().replace(/\/+$/, "");
  return trimmed || "/";
}

export function isViewRoute(pathname: string) {
  const normalizedPathname = normalizePathname(pathname);
  return VIEW_ROUTE_PATHS.some((route) => normalizedPathname === route || normalizedPathname.startsWith(`${route}/`));
}
