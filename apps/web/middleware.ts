import { auth } from "./auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default auth((req: NextRequest & { auth: { user?: { teamId?: string | null }; teamforgeToken?: string } | null }) => {
  const { nextUrl } = req;
  const session = req.auth;
  const path = nextUrl.pathname;

  const isLoggedIn = !!session;
  // Accept token from either location (top-level preferred, user sub-claim as fallback)
  const hasApiToken = !!(
    (session as { teamforgeToken?: string } | null)?.teamforgeToken ??
    (session as { user?: { teamforgeToken?: string } } | null)?.user?.teamforgeToken
  );

  // Public paths that don't need auth
  const isPublicPath = path === "/login" || path.startsWith("/team/join/");
  const isApiPath = path.startsWith("/api/");

  if (isApiPath) return NextResponse.next();

  // Already logged in with API token → redirect away from login
  // Honour callbackUrl so invite-link flows (/team/join/[code]) are not lost
  if (isLoggedIn && hasApiToken && path === "/login") {
    const rawCallback = nextUrl.searchParams.get("callbackUrl");
    const safeCallback =
      rawCallback && rawCallback.startsWith("/") && !rawCallback.startsWith("//")
        ? rawCallback
        : "/dashboard";
    return NextResponse.redirect(new URL(safeCallback, nextUrl));
  }

  // Not logged in → redirect to login (except public paths)
  if (!isLoggedIn && !isPublicPath) {
    const loginUrl = new URL("/login", nextUrl);
    // Only allow same-origin relative paths as callbackUrl (prevent open redirect)
    if (path.startsWith("/") && !path.startsWith("//")) {
      loginUrl.searchParams.set("callbackUrl", path);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
