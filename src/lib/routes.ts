/** Shared route helpers for middleware + client shell */
export const AUTH_PAGES = ["/login", "/register"] as const;

export function isPublicPath(pathname: string): boolean {
  if (pathname === "/sitemap.xml" || pathname === "/robots.txt") return true;
  if (pathname === "/" || pathname === "/about") return true;
  if (AUTH_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return true;
  if (pathname === "/blog") return true;
  if (pathname.startsWith("/blog/") && !pathname.startsWith("/blog/admin")) return true;
  return false;
}

export function isMarketingPage(pathname: string): boolean {
  if (pathname === "/" || pathname === "/about") return true;
  if (pathname === "/blog") return true;
  if (pathname.startsWith("/blog/") && !pathname.startsWith("/blog/admin")) return true;
  return false;
}
