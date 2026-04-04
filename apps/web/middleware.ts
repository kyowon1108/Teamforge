import { auth } from "./auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default auth((req: NextRequest & { auth: { user?: { teamId?: string | null }; teamforgeToken?: string } | null }) => {
  const { nextUrl } = req;
  const session = req.auth;
  const path = nextUrl.pathname;

  const isLoggedIn = !!session;
  // Only consider fully authenticated if we have the teamforge API token
  const hasApiToken = !!(session as { teamforgeToken?: string } | null)?.teamforgeToken;

  // Public paths that don't need auth
  const isPublicPath = path === "/login" || path.startsWith("/team/join/");
  const isApiPath = path.startsWith("/api/");

  if (isApiPath) return NextResponse.next();

  // Already logged in with API token → redirect away from login
  if (isLoggedIn && hasApiToken && path === "/login") {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  // Not logged in → redirect to login (except public paths)
  if (!isLoggedIn && !isPublicPath) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
