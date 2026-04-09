import Image from 'next/image';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { signInWithProvider } from './actions';

interface LoginPageProps {
  searchParams: Promise<{ callbackUrl?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();
  if (session) {
    redirect('/dashboard');
  }

  const { callbackUrl } = await searchParams;
  const redirectTo = callbackUrl ?? '/dashboard';

  const kakaoEnabled = Boolean(process.env.KAKAO_CLIENT_ID);

  return (
    <main
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--tf-surface-background)' }}
    >
      <div className="w-full max-w-md">
        {/* 로고 + 슬로건 */}
        <div className="text-center mb-8">
          <h1
            className="text-3xl font-bold tracking-tight mb-2"
            style={{ color: 'var(--tf-text-primary)' }}
          >
            TeamForge
          </h1>
          <p className="text-sm" style={{ color: 'var(--tf-text-muted)' }}>
            팀의 방향을 함께 만드는 킥오프 플랫폼
          </p>
        </div>

        <Card style={{ borderColor: 'var(--tf-border-subtle)' }}>
          <CardHeader className="pb-4">
            <CardTitle className="text-xl text-center">로그인</CardTitle>
            <CardDescription className="text-center">
              소셜 계정으로 간편하게 시작하세요
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {/* Google 로그인 */}
            <form
              action={async () => {
                'use server';
                await signInWithProvider('google', redirectTo);
              }}
            >
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-3 font-medium text-sm transition-opacity hover:opacity-90"
                style={{
                  minHeight: '44px',
                  height: '44px',
                  background: 'var(--tf-oauth-google-bg)',
                  color: 'var(--tf-oauth-google-text)',
                  border: '1px solid var(--tf-oauth-google-border)',
                  borderRadius: '6px',
                }}
              >
                <Image
                  src="/oauth-logos/google.svg"
                  alt=""
                  width={18}
                  height={18}
                  aria-hidden="true"
                />
                Google 계정으로 로그인
              </button>
            </form>

            {/* GitHub 로그인 */}
            <form
              action={async () => {
                'use server';
                await signInWithProvider('github', redirectTo);
              }}
            >
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-3 font-medium text-sm transition-opacity hover:opacity-90"
                style={{
                  minHeight: '44px',
                  height: '44px',
                  background: 'var(--tf-oauth-github-bg)',
                  color: 'var(--tf-oauth-github-text)',
                  border: 'none',
                  borderRadius: '6px',
                }}
              >
                <Image
                  src="/oauth-logos/github.svg"
                  alt=""
                  width={18}
                  height={18}
                  aria-hidden="true"
                  style={{ filter: 'invert(1)' }}
                />
                GitHub 계정으로 로그인
              </button>
            </form>

            {/* Kakao 로그인 — KAKAO_CLIENT_ID 있을 때만 활성 */}
            {kakaoEnabled ? (
              <form
                action={async () => {
                  'use server';
                  await signInWithProvider('kakao', redirectTo);
                }}
              >
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-3 font-medium text-sm transition-opacity hover:opacity-90"
                  style={{
                    minHeight: '44px',
                    height: '44px',
                    background: 'var(--tf-oauth-kakao-bg)',
                    color: 'var(--tf-oauth-kakao-text)',
                    border: 'none',
                    borderRadius: '6px',
                  }}
                >
                  <Image
                    src="/oauth-logos/kakao.svg"
                    alt=""
                    width={18}
                    height={18}
                    aria-hidden="true"
                  />
                  카카오 로그인
                </button>
              </form>
            ) : (
              <div
                className="w-full flex items-center justify-center gap-3 font-medium text-sm opacity-50 cursor-not-allowed"
                style={{
                  minHeight: '44px',
                  height: '44px',
                  background: 'var(--tf-oauth-kakao-bg)',
                  color: 'var(--tf-oauth-kakao-text)',
                  border: 'none',
                  borderRadius: '6px',
                }}
                aria-disabled="true"
              >
                <Image
                  src="/oauth-logos/kakao.svg"
                  alt=""
                  width={18}
                  height={18}
                  aria-hidden="true"
                />
                카카오 로그인
                <Badge variant="secondary" className="ml-1 text-xs">
                  준비 중
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs mt-6" style={{ color: 'var(--tf-text-muted)' }}>
          로그인하면 서비스 이용약관 및 개인정보처리방침에 동의하게 됩니다
        </p>
      </div>
    </main>
  );
}
