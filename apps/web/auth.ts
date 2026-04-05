import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Kakao from "next-auth/providers/kakao";

declare module "next-auth" {
  interface Session {
    teamforgeToken?: string;
    refreshToken?: string;
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      isNewUser?: boolean;
      teamId?: string | null;
      teamRole?: string | null;
      teamforgeToken?: string;
    };
  }
}

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
          Kakao({
            clientId: process.env.KAKAO_CLIENT_ID,
            clientSecret: process.env.KAKAO_CLIENT_SECRET!,
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Kakao may not provide email without biz app approval — derive one from the account ID
      if (!user.email && account?.provider === "kakao" && account.providerAccountId) {
        user.email = `kakao_${account.providerAccountId}@kakao.teamforge.dev`;
      }
      if (!user.email) return false;

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
        const res = await fetch(`${apiUrl}/auth/session-exchange`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            secret: process.env.SESSION_EXCHANGE_SECRET,
            user: {
              email: user.email,
              name: user.name ?? user.email,
              image: user.image,
              provider: account?.provider,
              providerAccountId: account?.providerAccountId,
            },
          }),
        });

        if (!res.ok) {
          console.error("Session exchange failed:", res.status, await res.text());
          return false;
        }

        const data = await res.json() as {
          accessToken: string;
          refreshToken: string;
          user: {
            id: string;
            isNewUser: boolean;
            teamId: string | null;
            teamRole: string | null;
          };
        };

        // Attach to user object for jwt callback
        (user as Record<string, unknown>).teamforgeToken = data.accessToken;
        (user as Record<string, unknown>).refreshToken = data.refreshToken;
        (user as Record<string, unknown>).apiId = data.user.id;
        (user as Record<string, unknown>).isNewUser = data.user.isNewUser;
        (user as Record<string, unknown>).teamId = data.user.teamId;
        (user as Record<string, unknown>).teamRole = data.user.teamRole;

        return true;
      } catch (err) {
        console.error("Session exchange error:", err);
        return false;
      }
    },

    async jwt({ token, user }) {
      if (user) {
        const u = user as Record<string, unknown>;
        const t = token as Record<string, unknown>;
        t.teamforgeToken = u.teamforgeToken;
        t.refreshToken = u.refreshToken;
        t.apiId = u.apiId;
        t.isNewUser = u.isNewUser;
        t.teamId = u.teamId;
        t.teamRole = u.teamRole;
      }
      return token;
    },

    async session({ session, token }) {
      const t = token as Record<string, unknown>;
      session.teamforgeToken = t.teamforgeToken as string | undefined;
      session.refreshToken = t.refreshToken as string | undefined;
      session.user.id = (t.apiId as string) ?? (t.sub as string) ?? "";
      session.user.isNewUser = t.isNewUser as boolean | undefined;
      session.user.teamId = t.teamId as string | null | undefined;
      session.user.teamRole = t.teamRole as string | null | undefined;
      session.user.teamforgeToken = t.teamforgeToken as string | undefined;
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});
