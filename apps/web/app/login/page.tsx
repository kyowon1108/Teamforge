import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { Globe, GitBranch } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { signInWithProvider } from './actions';

interface LoginPageProps {
  searchParams: Promise<{ callbackUrl?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();
  if (session) {
    redirect('/role-select');
  }

  const { callbackUrl } = await searchParams;
  const redirectTo = callbackUrl ?? '/role-select';

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
                className="w-full flex items-center justify-center gap-3 h-11 rounded-md border font-medium text-sm transition-colors"
                style={{
                  minHeight: '44px',
                  borderColor: 'var(--tf-border-subtle)',
                  background: 'var(--tf-surface-card)',
                  color: 'var(--tf-text-primary)',
                }}
              >
                <Globe size={18} />
                Google로 계속하기
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
                className="w-full flex items-center justify-center gap-3 h-11 rounded-md border font-medium text-sm transition-colors"
                style={{
                  minHeight: '44px',
                  borderColor: 'var(--tf-border-subtle)',
                  background: 'var(--tf-surface-card)',
                  color: 'var(--tf-text-primary)',
                }}
              >
                <GitBranch size={18} />
                GitHub으로 계속하기
              </button>
            </form>

            {/* Kakao 로그인 — KAKAO_CLIENT_ID 있을 때만 표시 */}
            {kakaoEnabled ? (
              <form
                action={async () => {
                  'use server';
                  await signInWithProvider('kakao', redirectTo);
                }}
              >
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-3 h-11 rounded-md font-medium text-sm transition-colors"
                  style={{
                    minHeight: '44px',
                    background: 'var(--tf-kakao-yellow)',
                    color: 'var(--tf-kakao-text)',
                    border: 'none',
                  }}
                >
                  {/* 카카오 로고 SVG (Lucide 없음 — 브랜드 필수 SVG 사용) */}
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M12 3C6.477 3 2 6.477 2 10.8c0 2.695 1.593 5.065 4.01 6.515l-1.02 3.795a.375.375 0 0 0 .547.42l4.428-2.94A11.76 11.76 0 0 0 12 18.6c5.523 0 10-3.477 10-7.8S17.523 3 12 3z" />
                  </svg>
                  카카오로 계속하기
                </button>
              </form>
            ) : (
              <div
                className="w-full flex items-center justify-center gap-3 h-11 rounded-md font-medium text-sm opacity-50 cursor-not-allowed"
                style={{
                  minHeight: '44px',
                  background: 'var(--tf-kakao-yellow)',
                  color: 'var(--tf-kakao-text)',
                  border: 'none',
                }}
                aria-disabled="true"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12 3C6.477 3 2 6.477 2 10.8c0 2.695 1.593 5.065 4.01 6.515l-1.02 3.795a.375.375 0 0 0 .547.42l4.428-2.94A11.76 11.76 0 0 0 12 18.6c5.523 0 10-3.477 10-7.8S17.523 3 12 3z" />
                </svg>
                카카오로 계속하기
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
