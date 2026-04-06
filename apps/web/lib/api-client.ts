import { SignJWT } from 'jose';
import { auth } from '@/lib/auth';

// 서버 전용 내부 URL — 클라이언트 번들에 노출되지 않음
const API_BASE_URL =
  process.env.INTERNAL_API_URL ?? 'http://localhost:3001';

/**
 * 서버 전용 exchange token 생성 (BFF 패턴)
 * - 브라우저에 절대 노출되지 않음
 * - TTL 240s (NestJS 300s 상한선 이내)
 */
async function makeExchangeToken(userId: string, email: string): Promise<string> {
  const secret = new TextEncoder().encode(
    process.env.SESSION_EXCHANGE_SECRET!
  );
  return new SignJWT({
    sub: userId,
    email,
    iss: 'teamforge-web',
    aud: 'teamforge-api',
    jti: crypto.randomUUID(),
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('4m') // 240s < 300s 상한
    .sign(secret);
}

/**
 * Server-only API fetch — Server Component, Server Action에서 사용
 * auth() 세션에서 apiId를 읽어 exchange token을 인라인 생성 후 첨부
 */
export async function apiFetch(
  path: string,
  init?: RequestInit
): Promise<Response> {
  let authHeader: Record<string, string> = {};

  try {
    const session = await auth();
    const apiId = (session?.user as { apiId?: string } | undefined)?.apiId;
    const email = session?.user?.email;

    if (apiId && email) {
      const token = await makeExchangeToken(apiId, email);
      authHeader = { Authorization: `Bearer ${token}` };
    }
  } catch {
    // 클라이언트 사이드에서 호출된 경우 — 헤더 없이 진행
  }

  return fetch(new URL(path, API_BASE_URL), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
      ...(init?.headers ?? {}),
    },
  });
}
