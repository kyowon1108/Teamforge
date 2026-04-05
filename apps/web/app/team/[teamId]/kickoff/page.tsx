"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useKickoffRole } from "./kickoff-context";

export default function KickoffRouterPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params.teamId as string;
  const { data: session, status } = useSession();
  const [error, setError] = useState<string | null>(null);
  const { viewerRole } = useKickoffRole();

  useEffect(() => {
    if (status !== "authenticated") return;

    const token = session?.teamforgeToken ?? session?.user?.teamforgeToken;
    if (token) apiClient.setToken(token);

    // Try to get existing session
    apiClient
      .get<{ phase: string }>(`/kickoff/${teamId}`)
      .then((data) => {
        redirectByPhase(data.phase);
      })
      .catch((err: unknown) => {
        const code = (err as { statusCode?: number })?.statusCode;
        // Only 404 means "no session yet" — 403/500 are genuine errors
        if (code !== 404 && code !== undefined) {
          setError("킥오프 정보를 불러올 수 없어요.");
          return;
        }
        if (viewerRole !== "leader") {
          // Members/observers can't start a session — go back to dashboard
          router.replace(`/team/${teamId}`);
          return;
        }
        // Leader: start a new session
        apiClient
          .post<{ session: { phase: string } }>("/kickoff/start", { teamId })
          .then((data) => {
            redirectByPhase(data.session.phase);
          })
          .catch(() => {
            setError("킥오프 세션을 시작할 수 없어요.");
          });
      });
  }, [status, session?.teamforgeToken, session?.user?.teamforgeToken, teamId]);

  function redirectByPhase(phase: string) {
    switch (phase) {
      case "topic_decision":
        // Check chat history to restore the correct sub-mode
        apiClient
          .get<{ id: string }[]>(`/kickoff/${teamId}/chat/topic_brainstorm`)
          .then((msgs) => {
            const hasChat = msgs.length > 0;
            if (hasChat) {
              router.replace(`/team/${teamId}/kickoff/topic?mode=chat`);
            } else if (viewerRole !== "leader") {
              router.replace(`/team/${teamId}/kickoff/topic?mode=watch`);
            } else {
              router.replace(`/team/${teamId}/kickoff/topic`);
            }
          })
          .catch(() => {
            if (viewerRole !== "leader") {
              router.replace(`/team/${teamId}/kickoff/topic?mode=watch`);
            } else {
              router.replace(`/team/${teamId}/kickoff/topic`);
            }
          });
        break;
      case "architecture":
        router.replace(`/team/${teamId}/kickoff/architecture`);
        break;
      case "summary":
      case "completed":
        router.replace(`/team/${teamId}/kickoff/summary`);
        break;
      default:
        if (viewerRole !== "leader") {
          router.replace(`/team/${teamId}/kickoff/topic?mode=watch`);
        } else {
          router.replace(`/team/${teamId}/kickoff/topic`);
        }
    }
  }

  if (error) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[var(--tf-bg-layer-alt)] px-4">
        <div className="text-center space-y-3">
          <p className="text-[15px] text-[var(--tf-fg-default)]">{error}</p>
          <button
            onClick={() => router.push(`/team/${teamId}`)}
            className="h-10 px-6 rounded-r2 bg-[var(--tf-bg-brand-solid)] text-[var(--tf-fg-neutral-inverted)] text-[14px] font-medium cursor-pointer"
          >
            대시보드로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-[var(--tf-bg-layer-alt)]">
      <Loader2 className="w-8 h-8 text-[var(--tf-fg-brand)] animate-spin" />
    </div>
  );
}
