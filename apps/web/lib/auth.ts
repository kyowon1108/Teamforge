import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';

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
    // Kakao는 KAKAO_CLIENT_ID 있을 때만 활성화 (feature-flags.ts 참고)
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
                profile?: {
                  nickname?: string;
                  profile_image_url?: string;
                };
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
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
    jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
  },
  pages: {
    signIn: '/login',
  },
});
