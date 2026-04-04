"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function TeamJoinWithCodePage() {
  const router = useRouter();
  const params = useParams();
  const code = params.code as string;
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      // Save invite code, redirect to login
      localStorage.setItem("teamforge_invite_code", code);
      router.push(`/login?callbackUrl=/team/join/${code}`);
      return;
    }

    // Logged in — try to join
    const join = async () => {
      try {
        const selectedRole = localStorage.getItem("teamforge_role") ?? "member";
        const res = await apiClient.post<{ team: { id: string }; role: string }>("/teams/join", {
          inviteCode: code,
          role: selectedRole === "observer" ? "observer" : "member",
        });
        localStorage.setItem("teamforge_team_id", res.team.id);
        toast.success("팀에 합류했습니다!");
        if (res.role === "observer") {
          router.push(`/team/${res.team.id}`);
        } else {
          router.push("/survey");
        }
      } catch (err: unknown) {
        const e = err as { code?: string };
        if (e.code === "ALREADY_TEAM_MEMBER") {
          toast.info("이미 팀에 합류해 있어요");
          router.push("/survey");
        } else {
          toast.error("합류에 실패했어요");
          router.push("/team/join");
        }
      }
    };

    join();
  }, [session, status, code, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--tf-bg-layer-alt)]">
      <div className="text-center space-y-4">
        <Loader2 className="w-8 h-8 text-[var(--tf-fg-brand)] animate-spin mx-auto" />
        <p className="text-[14px] text-[var(--tf-fg-muted)]">팀에 합류하는 중...</p>
      </div>
    </div>
  );
}
