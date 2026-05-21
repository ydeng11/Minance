const WIDE_CONTENT_ROUTES = ["/explorer", "/import", "/transactions"];

export function getShellContentWidthClass(pathname: string | null) {
  return WIDE_CONTENT_ROUTES.some((route) => pathname?.startsWith(route)) ? "max-w-[96rem]" : "max-w-6xl";
}
