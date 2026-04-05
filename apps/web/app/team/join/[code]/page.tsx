"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { UserCheck, Eye, ArrowRight, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

type JoinRole = "member" | "observer";

export default function TeamJoinWithCodePage() {
  const router = useRouter();
  const params = useParams();
  const code = params.code as string;
  const { data: session, status } = useSession();

  const [selectedRole, setSelectedRole] = useState<JoinRole>("member");
  const [joining, setJoining] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      localStorage.setItem("teamforge_invite_code", code);
      router.push(`/login?callbackUrl=/team/join/${code}`);
      return;
    }

    const token = session?.teamforgeToken ?? (session?.user as Record<string, unknown>)?.teamforgeToken;
    if (token) apiClient.setToken(token as string);

    setReady(true);
  }, [session, status, code, router]);

  const handleJoin = async () => {
    setJoining(true);
    try {
      const res = await apiClient.post<{ team: { id: string }; role: string }>("/teams/join", {
        inviteCode: code,
        role: selectedRole,
      });
      localStorage.setItem("teamforge_team_id", res.team.id);
      toast.success("팀에 합류했습니다!");
      if (res.role === "observer") {
        router.push(`/team/${res.team.id}`);
      } else {
        router.push("/survey");
      }
    } catch (err: unknown) {
      const e = err as { code?: string; teamId?: string };
      if (e.code === "ALREADY_TEAM_MEMBER") {
        toast.info("이미 팀에 합류해 있어요");
        try {
          const me = await apiClient.get<{ teamId: string | null; surveyStatus: string | null; teamRole: string | null }>("/auth/me");
          if (me.teamId) localStorage.setItem("teamforge_team_id", me.teamId);
          if (me.teamRole === "observer") {
            router.push(`/team/${me.teamId}`);
          } else if (me.surveyStatus === "completed") {
            router.push("/result");
          } else {
            router.push("/survey");
          }
        } catch {
          router.push("/dashboard");
        }
      } else {
        const messages: Record<string, string> = {
          INVITE_CODE_NOT_FOUND: "존재하지 않는 초대 코드예요",
          INVITE_CODE_EXPIRED: "만료된 초대 코드예요",
          TEAM_FULL: "팀 인원이 이미 가득 찼어요",
        };
        toast.error(messages[e.code ?? ""] ?? "합류에 실패했어요");
        router.push("/team/join");
      }
    } finally {
      setJoining(false);
    }
  };

  if (!ready || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--tf-bg-layer-alt)]">
        <Loader2 className="w-8 h-8 text-[var(--tf-fg-brand)] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--tf-bg-layer-alt)] px-4">
      <div className="w-full max-w-[400px] bg-[var(--tf-bg-layer-default)] rounded-r3 border border-[var(--tf-stroke-neutral)] p-8 space-y-6 shadow-sm">
        <div className="text-center space-y-2">
          <h1 className="text-[20px] font-bold text-[var(--tf-fg-default)]">팀에 합류하기</h1>
          <p className="text-[13px] text-[var(--tf-fg-muted)]">
            초대 코드 <span className="font-mono font-bold text-[var(--tf-fg-brand)]">{code}</span> 로 참여합니다
          </p>
        </div>

        {/* Role selection */}
        <div className="space-y-2">
          <p className="text-[12px] font-medium text-[var(--tf-fg-muted)]">참여 유형</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSelectedRole("member")}
              className="flex flex-col items-start gap-1.5 px-3 py-3 rounded-r2 border text-left transition-colors"
              style={{
                borderColor: selectedRole === "member" ? "var(--tf-stroke-brand)" : "var(--tf-stroke-neutral)",
                background: selectedRole === "member" ? "var(--tf-bg-info)" : "var(--tf-bg-layer-default)",
              }}
            >
              <div className="flex items-center gap-1.5">
                <UserCheck size={14} style={{ color: selectedRole === "member" ? "var(--tf-fg-brand)" : "var(--tf-fg-muted)" }} />
                <span className="text-[13px] font-semibold" style={{ color: selectedRole === "member" ? "var(--tf-fg-brand)" : "var(--tf-fg-default)" }}>
                  팀원
                </span>
              </div>
              <span className="text-[11px]" style={{ color: "var(--tf-fg-muted)" }}>
                설문 참여 · 역할 배정
              </span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedRole("observer")}
              className="flex flex-col items-start gap-1.5 px-3 py-3 rounded-r2 border text-left transition-colors"
              style={{
                borderColor: selectedRole === "observer" ? "var(--tf-stroke-brand)" : "var(--tf-stroke-neutral)",
                background: selectedRole === "observer" ? "var(--tf-bg-info)" : "var(--tf-bg-layer-default)",
              }}
            >
              <div className="flex items-center gap-1.5">
                <Eye size={14} style={{ color: selectedRole === "observer" ? "var(--tf-fg-brand)" : "var(--tf-fg-muted)" }} />
                <span className="text-[13px] font-semibold" style={{ color: selectedRole === "observer" ? "var(--tf-fg-brand)" : "var(--tf-fg-default)" }}>
                  옵저버
                </span>
              </div>
              <span className="text-[11px]" style={{ color: "var(--tf-fg-muted)" }}>
                교수 · 멘토 · 외부 참관
              </span>
            </button>
          </div>
        </div>

        <button
          onClick={handleJoin}
          disabled={joining}
          className="w-full h-12 rounded-r2 text-[14px] font-medium transition-opacity flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50"
          style={{ background: "var(--tf-bg-brand-solid)", color: "var(--tf-fg-inverse)" }}
        >
          {joining ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <>팀에 합류하기 <ArrowRight size={16} /></>
          )}
        </button>
      </div>
    </div>
  );
}
