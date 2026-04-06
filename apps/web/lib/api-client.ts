import { auth } from '@/lib/auth';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export async function apiFetch(
  path: string,
  init?: RequestInit
): Promise<Response> {
  // 서버 사이드 실행 시 세션 토큰 첨부
  let authHeader: Record<string, string> = {};

  try {
    const session = await auth();
    const token = (session as { teamforgeToken?: string } | null)?.teamforgeToken;
    if (token) {
      authHeader = { Authorization: `Bearer ${token}` };
    }
  } catch {
    // 클라이언트 사이드에서는 auth() 호출 불가 — 헤더 없이 진행
  }

  const response = await fetch(new URL(path, API_BASE_URL), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
      ...(init?.headers ?? {}),
    },
  });

  return response;
}
