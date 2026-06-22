import { NextResponse, type NextRequest } from "next/server";

const COOKIE = process.env.SESSION_COOKIE_NAME || "gyftr_b2b_session";

// Routes that require an authenticated session.
const PROTECTED = [
  "/dashboard",
  "/brands",
  "/cart",
  "/checkout",
  "/orders",
  "/wallet",
  "/settings",
  "/users",
  "/support",
  "/admin",
];

const AUTH_PAGES = ["/login"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = Boolean(req.cookies.get(COOKIE)?.value);

  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const isAuthPage = AUTH_PAGES.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (isProtected && !hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthPage && hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/brands/:path*",
    "/cart",
    "/checkout/:path*",
    "/orders/:path*",
    "/wallet",
    "/settings",
    "/users",
    "/support",
    "/admin/:path*",
    "/login",
  ],
};
