import { SignJWT } from 'jose';

const API_URL = process.env.TEST_API_URL ?? 'http://localhost:4000';
const SECRET = process.env.SESSION_EXCHANGE_SECRET ?? 'test-secret-for-e2e';

/**
 * 테스트용 exchange token 생성.
 * NextAuth를 우회하여 API에 직접 인증된 요청을 보낸다.
 */
async function makeToken(userId: string, email: string): Promise<string> {
  const secret = new TextEncoder().encode(SECRET);
  return new SignJWT({
    sub: userId,
    email,
    iss: 'teamforge-web',
    aud: 'teamforge-api',
    jti: crypto.randomUUID(),
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('4m')
    .sign(secret);
}

export interface TestApiClient {
  get(path: string): Promise<Response>;
  post(path: string, body?: unknown): Promise<Response>;
}

/**
 * 특정 유저로 인증된 API 클라이언트 생성.
 * 매 요청마다 새 JWT(unique jti)를 발급한다.
 */
export async function createApiClient(userId: string, email: string): Promise<TestApiClient> {
  async function headers() {
    const token = await makeToken(userId, email);
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }

  return {
    async get(path: string) {
      return fetch(`${API_URL}${path}`, {
        method: 'GET',
        headers: await headers(),
      });
    },
    async post(path: string, body?: unknown) {
      return fetch(`${API_URL}${path}`, {
        method: 'POST',
        headers: await headers(),
        body: body ? JSON.stringify(body) : undefined,
      });
    },
  };
}
