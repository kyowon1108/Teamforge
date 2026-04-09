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
  '/dev-preview',
];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));

  // dev-preview 캡처용 화면은 인증 없이 접근 허용
  const devPreviewPublicScreens = [
    'login',
    'kickoff-topic-loading',
    'kickoff-topic-leader',
    'kickoff-topic-member',
    'kickoff-topic-voting',
    'result',
    'kickoff-dashboard-complete',
    'kickoff-dashboard-progress',
    'brainstorm-stage1',
    'brainstorm-stage2',
    'brainstorm-stage3',
    'dashboard-empty',
    'dashboard-teams',
    'survey',
    'team-create',
    'team-join',
    'result-leader',
    'result-member-confirmed',
  ];
  const isDevPreviewPublic =
    pathname === '/dev-preview' &&
    devPreviewPublicScreens.includes(req.nextUrl.searchParams.get('screen') ?? '');

  if (isProtected && !req.auth && !isDevPreviewPublic) {
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
