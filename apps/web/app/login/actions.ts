'use server';
import { signIn } from '@/lib/auth';

// 허용 경로 패턴: /로 시작, 영문·숫자·하이픈·슬래시만 허용 (open redirect 방어)
const SAFE_PATH = /^\/[a-z0-9\-/]*$/i;

function sanitizeCallbackUrl(raw: string | undefined): string {
  if (raw && SAFE_PATH.test(raw)) return raw;
  return '/role-select';
}

export async function signInWithProvider(
  provider: 'google' | 'github' | 'kakao',
  callbackUrl: string | undefined
) {
  const redirectTo = sanitizeCallbackUrl(callbackUrl);
  await signIn(provider, { redirectTo });
}
