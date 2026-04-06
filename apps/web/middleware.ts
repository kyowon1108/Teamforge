import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

// 보호 대상 경로 (screen-flow.md Guard/Redirect 표 기반)
const PROTECTED_PATHS = [
  '/dashboard',
  '/team',
  '/survey',
  '/kickoff',
  '/meeting',
  '/changes',
  '/settings',
];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));

  if (isProtected && !req.auth) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
