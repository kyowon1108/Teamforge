import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';

// 서버 전용 내부 URL — 클라이언트 번들에 노출되지 않음
const API_BASE = process.env.INTERNAL_API_URL ?? 'http://localhost:3001';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    ...(process.env.KAKAO_CLIENT_ID
      ? [
          {
            id: 'kakao',
            name: 'Kakao',
            type: 'oauth' as const,
            authorization: 'https://kauth.kakao.com/oauth/authorize',
            token: 'https://kauth.kakao.com/oauth/token',
            userinfo: 'https://kapi.kakao.com/v2/user/me',
            clientId: process.env.KAKAO_CLIENT_ID,
            clientSecret: process.env.KAKAO_CLIENT_SECRET!,
            profile(profile: {
              id: number;
              kakao_account?: {
                email?: string;
                profile?: { nickname?: string; profile_image_url?: string };
              };
            }) {
              return {
                id: String(profile.id),
                name: profile.kakao_account?.profile?.nickname ?? '카카오 사용자',
                email:
                  profile.kakao_account?.email ??
                  `kakao_${profile.id}@teamforge.local`,
                image: profile.kakao_account?.profile?.profile_image_url,
              };
            },
          },
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // 최초 로그인 시: API DB에 유저 동기화 → DB userId 저장
      if (user?.email) {
        try {
          const res = await fetch(`${API_BASE}/api/auth/sync`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Sync-Secret': process.env.SYNC_INTERNAL_SECRET ?? '',
            },
            body: JSON.stringify({
              email: user.email,
              name: user.name ?? undefined,
              image: user.image ?? undefined,
            }),
          });
          if (res.ok) {
            const data = (await res.json()) as { userId: string };
            token.apiUserId = data.userId;
          }
        } catch (err) {
          // sync 실패 시 로그인은 계속 진행 (non-fatal)
          // apiUserId가 없으면 이후 API 호출이 401로 실패하므로 반드시 로깅
          // err 전체 대신 message만 출력 — 내부 URL/시크릿 노출 방지
          const msg = err instanceof Error ? err.message : String(err);
          console.error('[auth] sync 실패 — apiUserId 미설정:', msg);
        }
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      // DB userId를 session에 노출 (서버 컴포넌트에서 사용)
      if (token.apiUserId) {
        (session.user as typeof session.user & { apiId: string }).apiId =
          token.apiUserId as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
});
