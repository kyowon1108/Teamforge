import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function RootPage() {
  const session = await auth();

  // Not logged in → login
  if (!session) {
    redirect("/login");
  }

  // Logged in but no teamforge token → force re-auth
  if (!session.teamforgeToken) {
    redirect("/api/auth/signout?callbackUrl=/login");
  }

  // Check fresh state from API using /auth/me (M2 fix: don't re-call session-exchange)
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
    const res = await fetch(`${apiUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${session.teamforgeToken}` },
      cache: "no-store",
    });

    if (res.ok) {
      const me = (await res.json()) as {
        teamId: string | null;
        teamRole: string | null;
        surveyStatus: string | null;
      };

      if (me.teamId) {
        // Observer → team page (will show waiting screen)
        if (me.teamRole === "observer") {
          redirect(`/team/${me.teamId}`);
        }
        // Leader with completed survey → team dashboard
        if (me.teamRole === "leader" && me.surveyStatus === "completed") {
          redirect(`/team/${me.teamId}`);
        }
        // Survey completed (member) → personal result
        if (me.surveyStatus === "completed") {
          redirect("/result");
        }
        // Has team but survey not done → survey
        redirect("/survey");
      }
    }
  } catch {
    // API unreachable — fall through
  }

  // No team → onboarding
  redirect("/onboarding/role");
}
