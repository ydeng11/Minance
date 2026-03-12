export function getShellContentWidthClass(pathname: string | null) {
  return pathname?.startsWith("/transactions") ? "max-w-[96rem]" : "max-w-6xl";
}
