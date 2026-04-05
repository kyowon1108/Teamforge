"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Plus,
  LogIn,
  Users,
  Crown,
  Eye,
  Rocket,
  CheckCircle2,
  Clock,
  Layers,
  Loader2,
  LogOut,
  ChevronRight,
  LayoutDashboard,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { signOut } from "next-auth/react";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type KickoffInfo = {
  phase: string;
  topicDecided: boolean;
  summaryConfirmed: boolean;
} | null;

type TeamEntry = {
  teamId: string;
  teamName: string;
  teamDescription: string | null;
  expectedSize: number;
  memberCount: number;
  role: "leader" | "member" | "observer";
  joinedAt: string;
  kickoff: KickoffInfo;
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function getKickoffStatus(kickoff: KickoffInfo): {
  label: string;
  color: string;
  icon: React.ReactNode;
} {
  if (!kickoff) return { label: "킥오프 미시작", color: "var(--tf-fg-muted)", icon: <Clock size={14} /> };
  if (kickoff.summaryConfirmed || kickoff.phase === "completed")
    return { label: "킥오프 완료", color: "var(--tf-fg-positive)", icon: <CheckCircle2 size={14} /> };
  if (kickoff.phase === "summary")
    return { label: "최종 확인 중", color: "var(--tf-fg-brand)", icon: <Layers size={14} /> };
  if (kickoff.phase === "architecture")
    return { label: "스택 선택 중", color: "var(--tf-fg-warning)", icon: <Layers size={14} /> };
  if (kickoff.topicDecided)
    return { label: "주제 결정됨", color: "var(--tf-fg-warning)", icon: <Rocket size={14} /> };
  return { label: "주제 논의 중", color: "var(--tf-fg-muted)", icon: <Rocket size={14} /> };
}

function getRoleLabel(role: string) {
  if (role === "leader") return { label: "팀장", icon: <Crown size={12} />, color: "var(--tf-fg-brand)" };
  if (role === "observer") return { label: "옵저버", icon: <Eye size={12} />, color: "var(--tf-fg-muted)" };
  return { label: "팀원", icon: <Users size={12} />, color: "var(--tf-fg-positive)" };
}

// ─────────────────────────────────────────────
// TeamCard
// ─────────────────────────────────────────────

function TeamCard({ team, onClick }: { team: TeamEntry; onClick: () => void }) {
  const kickoffStatus = getKickoffStatus(team.kickoff);
  const roleInfo = getRoleLabel(team.role);

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl border bg-white p-5 hover:border-[var(--tf-stroke-brand)] hover:shadow-md transition-all duration-200 group"
      style={{ borderColor: "var(--tf-stroke-neutral)" }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
            style={{ background: "var(--tf-bg-brand-solid)" }}
          >
            {team.teamName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate" style={{ color: "var(--tf-fg-default)" }}>
              {team.teamName}
            </p>
            {team.teamDescription && (
              <p className="text-xs truncate mt-0.5" style={{ color: "var(--tf-fg-muted)" }}>
                {team.teamDescription}
              </p>
            )}
          </div>
        </div>
        <ChevronRight
          size={16}
          className="flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: "var(--tf-fg-muted)" }}
        />
      </div>

      {/* Badges */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Role badge */}
        <span
          className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
          style={{
            background: "var(--tf-bg-layer-alt)",
            color: roleInfo.color,
          }}
        >
          {roleInfo.icon}
          {roleInfo.label}
        </span>

        {/* Kickoff status badge */}
        <span
          className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
          style={{
            background: "var(--tf-bg-layer-alt)",
            color: kickoffStatus.color,
          }}
        >
          {kickoffStatus.icon}
          {kickoffStatus.label}
        </span>
      </div>

      {/* Footer */}
      <div className="mt-3 pt-3 flex items-center justify-between" style={{ borderTop: "1px solid var(--tf-stroke-neutral)" }}>
        <span className="text-xs" style={{ color: "var(--tf-fg-muted)" }}>
          <Users size={12} className="inline mr-1" />
          {team.memberCount}/{team.expectedSize}명
        </span>
        <span className="text-xs" style={{ color: "var(--tf-fg-muted)" }}>
          팀 보기 →
        </span>
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────
// AddTeamCard
// ─────────────────────────────────────────────

function AddTeamCard({ onCreateTeam, onJoinTeam }: { onCreateTeam: () => void; onJoinTeam: () => void }) {
  return (
    <div
      className="rounded-2xl border-2 border-dashed p-5 flex flex-col gap-3"
      style={{ borderColor: "var(--tf-stroke-neutral)" }}
    >
      <p className="text-xs font-medium" style={{ color: "var(--tf-fg-muted)" }}>
        새 팀 추가
      </p>
      <button
        onClick={onCreateTeam}
        className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors hover:opacity-90"
        style={{ background: "var(--tf-bg-brand-solid)", color: "#fff" }}
      >
        <Plus size={16} />
        새 팀 만들기
      </button>
      <button
        onClick={onJoinTeam}
        className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors border hover:bg-[var(--tf-bg-layer-alt)]"
        style={{ borderColor: "var(--tf-stroke-neutral)", color: "var(--tf-fg-default)" }}
      >
        <LogIn size={16} />
        초대 코드로 참가
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
// Empty State
// ─────────────────────────────────────────────

function EmptyState({ onCreateTeam, onJoinTeam }: { onCreateTeam: () => void; onJoinTeam: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: "var(--tf-bg-layer-alt)" }}
      >
        <Users size={28} style={{ color: "var(--tf-fg-muted)" }} />
      </div>
      <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--tf-fg-default)" }}>
        아직 팀에 속하지 않았어요
      </h2>
      <p className="text-sm mb-8 max-w-xs" style={{ color: "var(--tf-fg-muted)" }}>
        팀을 직접 만들거나, 초대 코드로 기존 팀에 참가해보세요.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
        <button
          onClick={onCreateTeam}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ background: "var(--tf-bg-brand-solid)", color: "#fff" }}
        >
          <Plus size={16} />
          새 팀 만들기
        </button>
        <button
          onClick={onJoinTeam}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-medium border transition-colors hover:bg-[var(--tf-bg-layer-alt)]"
          style={{ borderColor: "var(--tf-stroke-neutral)", color: "var(--tf-fg-default)" }}
        >
          <LogIn size={16} />
          팀 참가하기
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Dashboard Page
// ─────────────────────────────────────────────

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [teams, setTeams] = useState<TeamEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    if (status !== "authenticated") return;

    // Sync token before fetch to avoid stale-token empty-state
    const token = session?.teamforgeToken ?? session?.user?.teamforgeToken;
    if (token) apiClient.setToken(token);

    setFetchError(false);
    apiClient
      .get<TeamEntry[]>("/teams")
      .then((data) => setTeams(data))
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  }, [status, session?.teamforgeToken, session?.user?.teamforgeToken, router]);

  const handleTeamClick = (teamId: string) => {
    router.push(`/team/${teamId}`);
  };

  const handleCreateTeam = () => router.push("/team/create");
  const handleJoinTeam = () => router.push("/team/join");

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--tf-bg-layer-alt)" }}>
        <Loader2 size={28} className="animate-spin" style={{ color: "var(--tf-fg-muted)" }} />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-3" style={{ background: "var(--tf-bg-layer-alt)" }}>
        <p className="text-sm" style={{ color: "var(--tf-fg-muted)" }}>팀 목록을 불러오지 못했어요.</p>
        <button
          onClick={() => { setFetchError(false); setLoading(true); location.reload(); }}
          className="text-xs px-4 py-2 rounded-lg border transition-colors hover:bg-[var(--tf-bg-layer-default)]"
          style={{ borderColor: "var(--tf-stroke-neutral)", color: "var(--tf-fg-default)" }}
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--tf-bg-layer-alt)" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-30 border-b"
        style={{
          background: "var(--tf-bg-layer-default)",
          borderColor: "var(--tf-stroke-neutral)",
        }}
      >
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutDashboard size={20} style={{ color: "var(--tf-fg-brand)" }} />
            <span className="font-bold text-base" style={{ color: "var(--tf-fg-default)" }}>
              TeamForge
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm hidden sm:block" style={{ color: "var(--tf-fg-muted)" }}>
              {session?.user?.name ?? session?.user?.email}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors hover:bg-[var(--tf-bg-layer-alt)]"
              style={{ borderColor: "var(--tf-stroke-neutral)", color: "var(--tf-fg-muted)" }}
            >
              <LogOut size={13} />
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {teams.length === 0 ? (
          <EmptyState onCreateTeam={handleCreateTeam} onJoinTeam={handleJoinTeam} />
        ) : (
          <>
            {/* Title */}
            <div className="mb-6">
              <h1 className="text-xl font-bold" style={{ color: "var(--tf-fg-default)" }}>
                내 팀
              </h1>
              <p className="text-sm mt-1" style={{ color: "var(--tf-fg-muted)" }}>
                {teams.length}개 팀에 참여 중입니다.
              </p>
            </div>

            {/* Team grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {teams.map((team) => (
                <TeamCard key={team.teamId} team={team} onClick={() => handleTeamClick(team.teamId)} />
              ))}
              <AddTeamCard onCreateTeam={handleCreateTeam} onJoinTeam={handleJoinTeam} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
