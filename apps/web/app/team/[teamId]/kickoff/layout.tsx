"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { KickoffCtx } from "./kickoff-context";

export default function KickoffLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const teamId = params.teamId as string;
  const { data: session, status } = useSession();

  const [viewerRole, setViewerRole] = useState<"leader" | "member" | "observer" | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;

    const token = session?.teamforgeToken ?? session?.user?.teamforgeToken;
    if (token) apiClient.setToken(token);

    apiClient
      .get<{ teamRole: string | null }>("/auth/me")
      .then((me) => {
        const role = me.teamRole ?? "member";
        setViewerRole(role as "leader" | "member" | "observer");
      })
      .catch(() => {
        setViewerRole("member");
      });
  }, [status, session?.teamforgeToken, session?.user?.teamforgeToken]);

  // Auth guard must come before viewerRole null check — otherwise unauthenticated
  // users get stuck on the loader forever (viewerRole stays null)
  if (status === "loading") {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[var(--tf-bg-layer-alt)]">
        <Loader2 className="w-8 h-8 text-[var(--tf-fg-brand)] animate-spin" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.replace("/login");
    return null;
  }

  if (viewerRole === null) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[var(--tf-bg-layer-alt)]">
        <Loader2 className="w-8 h-8 text-[var(--tf-fg-brand)] animate-spin" />
      </div>
    );
  }

  return (
    <KickoffCtx.Provider value={{ viewerRole, teamId }}>
      {children}
    </KickoffCtx.Provider>
  );
}
