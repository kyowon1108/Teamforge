"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Loader2,
  Users,
  Crown,
  Copy,
  Check,
  Link2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  UserCheck,
  Star,
  MessageSquareText,
  ChevronRight,
  Rocket,
  Eye,
  X,
} from "lucide-react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import { apiClient } from "@/lib/api-client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";

type RoleCandidate = {
  userId: string;
  name: string | null;
  score: number;
  desired: boolean;
};

type RoleRecommendation = {
  role: string;
  topCandidate: RoleCandidate | null;
  candidates: RoleCandidate[];
};

type MemberSummary = {
  userId: string;
  name: string | null;
  avatarUrl: string | null;
  role: string;
  surveyCompleted: boolean;
  skillVector?: Record<string, number> | null;
  experienceScore?: number | null;
  reliabilityScore?: number | null;
  profileConfidence?: "high" | "medium" | "low" | null;
};

type DashboardData = {
  team: {
    id: string;
    name: string;
    description: string | null;
    expectedSize: number;
    inviteCode?: string;
    inviteUrl?: string;
  };
  dashboardStatus: "survey_incomplete" | "partial_ready" | "ready" | "restricted";
  restricted?: boolean;
  progress?: { total: number; completed: number };
  teamSkillDistribution?: Record<string, number>;
  strengths?: string[];
  weaknesses?: string[];
  roleRecommendations?: RoleRecommendation[];
  members?: MemberSummary[];
  viewerRole: string;
};

const SKILL_LABEL_KO: Record<string, string> = {
  backend: "백엔드",
  frontend: "프론트엔드",
  database: "데이터베이스",
  devops: "DevOps",
  aiMl: "AI/ML",
  design: "디자인",
};

export default function TeamDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params.teamId as string;
  const { data: session, status } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [kickoffPhase, setKickoffPhase] = useState<string | null>(null); // null = no session yet
  const [showProceedDialog, setShowProceedDialog] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dialogCancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (status !== "authenticated") return;

    const token = session?.teamforgeToken ?? session?.user?.teamforgeToken;
    if (token) apiClient.setToken(token);

    Promise.all([
      apiClient.get<DashboardData>(`/teams/${teamId}/dashboard`),
      apiClient.get<{ phase: string }>(`/kickoff/${teamId}`).catch(() => null),
    ])
      .then(([dashData, kickoff]) => {
        setData(dashData);
        if (kickoff) setKickoffPhase(kickoff.phase);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [teamId, status, session?.teamforgeToken, session?.user?.teamforgeToken]);

  useEffect(() => { setMounted(true); }, []);

  // Dialog ESC + focus trap
  useEffect(() => {
    if (!showProceedDialog) return;
    dialogCancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setShowProceedDialog(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showProceedDialog]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--tf-bg-layer-alt)]">
        <Loader2 className="w-8 h-8 text-[var(--tf-fg-brand)] animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--tf-bg-layer-alt)]">
        <p className="text-[var(--tf-fg-muted)]">대시보드를 불러올 수 없어요</p>
      </div>
    );
  }

  // Member (non-leader, non-observer): waiting screen
  const kickoffActive = kickoffPhase !== null && kickoffPhase !== "completed";

  if (data.restricted || (data.viewerRole !== "leader" && data.viewerRole !== "observer")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--tf-bg-layer-alt)] px-4">
        <LogoutButton />
        <div className="max-w-[400px] w-full space-y-4">
          <div className="text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-[var(--tf-bg-info)] flex items-center justify-center mx-auto">
              <Users className="w-7 h-7 text-[var(--tf-fg-brand)]" />
            </div>
            <h1 className="text-[20px] font-bold text-[var(--tf-fg-default)]">
              {data.team.name}
            </h1>
            <p className="text-[15px] text-[var(--tf-fg-default)]">
              팀장이 다음 단계를 준비하고 있어요
            </p>
            <p className="text-[13px] text-[var(--tf-fg-muted)]">
              최종 승인을 기다려주세요. 팀장이 팀 분석을 완료하면 알려드릴게요.
            </p>
          </div>

          {/* Survey locked notice — kickoff started means surveys are closed */}
          {kickoffPhase !== null && (
            <div className="rounded-r2 bg-[var(--tf-bg-warning-weak)] border border-[var(--tf-stroke-warning-weak)] px-4 py-3.5 flex items-start gap-3">
              <AlertTriangle
                className="w-4 h-4 text-[var(--tf-fg-warning)] shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <p className="text-[13px] leading-snug text-[var(--tf-fg-warning)]">
                <span className="font-bold">설문 기간 마감&nbsp;&nbsp;</span>
                팀장이 킥오프를 시작해 더 이상 설문을 제출할 수 없어요.
              </p>
            </div>
          )}

          {/* Kickoff in progress — informative callout */}
          {kickoffActive && (
            <div className="rounded-r2 bg-[var(--tf-bg-informative-weak)] border border-[var(--tf-stroke-informative-weak)] px-4 py-3.5 flex items-start gap-3">
              <Eye
                className="w-4 h-4 text-[var(--tf-fg-informative-contrast)] shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div className="flex-1 min-w-0 space-y-2">
                <p className="text-[13px] leading-snug text-[var(--tf-fg-informative-contrast)]">
                  <span className="font-bold">킥오프 진행 중&nbsp;&nbsp;</span>
                  팀장이 지금 킥오프를 진행하고 있어요. 실시간으로 구경할 수 있어요.
                </p>
                <button
                  onClick={() => router.push(`/team/${teamId}/kickoff`)}
                  className="h-8 px-4 rounded-r1 bg-[var(--tf-bg-informative-contrast)] text-[var(--tf-fg-neutral-inverted)] text-[12px] font-medium cursor-pointer hover:opacity-90 transition-opacity"
                >
                  킥오프 구경하기
                </button>
              </div>
            </div>
          )}

          <div className="pt-1 text-center">
            <button
              onClick={() => window.location.href = "/result"}
              className="h-10 px-6 rounded-r2 border border-[var(--tf-stroke-neutral)] text-[13px] text-[var(--tf-fg-muted)] hover:bg-[var(--tf-bg-layer-alt)] transition-colors"
            >
              내 결과 다시 보기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // After the restricted early-return, leader/observer always has these fields
  const { team, dashboardStatus, viewerRole } = data;
  const progress = data.progress!;
  const members = data.members ?? [];
  const nonObserverCount = members.filter((m) => m.role !== "observer").length;
  const teamSkillDistribution = data.teamSkillDistribution ?? {};
  const strengths = data.strengths ?? [];
  const weaknesses = data.weaknesses ?? [];
  const roleRecommendations = data.roleRecommendations;

  const copyText = async (text: string, type: "code" | "link") => {
    await navigator.clipboard.writeText(text);
    if (type === "code") { setCodeCopied(true); setTimeout(() => setCodeCopied(false), 2000); }
    else { setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000); }
  };

  const barData = Object.entries(teamSkillDistribution).map(([key, value]) => ({
    name: SKILL_LABEL_KO[key] ?? key,
    value: Math.round(value * 100) / 100,
  }));

  const radarData = barData.map((d) => ({ subject: d.name, value: d.value, fullMark: 5 }));

  return (
    <div className="min-h-screen bg-[var(--tf-bg-layer-alt)] px-4 py-10">
      <LogoutButton />
      <div className="max-w-[720px] mx-auto space-y-6">

        {/* Observer notice */}
        {viewerRole === "observer" && (
          <div className="rounded-r2 bg-[var(--tf-bg-layer-default)] border border-[var(--tf-stroke-neutral)] p-4 space-y-2">
            <div className="flex items-center gap-2 text-[13px] text-[var(--tf-fg-muted)]">
              <Eye className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>옵저버로 참여 중이에요. 팀 분석 결과를 읽기 전용으로 볼 수 있어요.</span>
            </div>
            {kickoffActive && (
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2 text-[13px] text-[var(--tf-fg-informative-contrast)]">
                  <Rocket className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>킥오프가 진행 중이에요.</span>
                </div>
                <button
                  onClick={() => router.push(`/team/${teamId}/kickoff`)}
                  className="h-7 px-3 rounded-r1 bg-[var(--tf-bg-informative-weak)] text-[var(--tf-fg-informative-contrast)] text-[12px] font-medium hover:opacity-90 transition-opacity cursor-pointer shrink-0"
                >
                  관찰하기
                </button>
              </div>
            )}
          </div>
        )}

        {/* Team header */}
        <div className="bg-[var(--tf-bg-layer-default)] rounded-r3 border border-[var(--tf-stroke-neutral)] p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--tf-bg-info)] flex items-center justify-center">
                <Users className="w-5 h-5 text-[var(--tf-fg-brand)]" />
              </div>
              <div>
                <h1 className="text-[20px] font-bold text-[var(--tf-fg-default)]">{team.name}</h1>
                {team.description && (
                  <p className="text-[13px] text-[var(--tf-fg-muted)]">{team.description}</p>
                )}
              </div>
            </div>
            <div className="text-right text-[12px] text-[var(--tf-fg-muted)]">
              <p>{nonObserverCount}/{team.expectedSize}명</p>
              {members.length > nonObserverCount && (
                <p className="text-[11px] text-[var(--tf-fg-subtle)]">옵저버 {members.length - nonObserverCount}명 별도</p>
              )}
            </div>
          </div>
        </div>

        {/* Next actions card (leader only, after kickoff completed) */}
        {viewerRole === "leader" && kickoffPhase === "completed" && (() => {
          const incompleteSurvey = progress.total > 0 && progress.completed < progress.total;
          const noMeetings = true; // TODO: fetch from API when dashboard includes meeting count
          const actions = [
            incompleteSurvey && {
              label: `설문 미완료 ${progress.total - progress.completed}명에게 리마인드`,
              color: "var(--tf-fg-warning)",
              bgColor: "var(--tf-bg-warning)",
              onClick: () => { /* TODO: POST /teams/:id/reminders/survey */ },
            },
            noMeetings && {
              label: "첫 회의를 기록해보세요",
              color: "var(--tf-fg-brand)",
              bgColor: "var(--tf-bg-info)",
              onClick: () => { window.location.href = `/team/${teamId}/meetings/new`; },
            },
          ].filter(Boolean) as { label: string; color: string; bgColor: string; onClick: () => void }[];

          if (actions.length === 0) return null;

          return (
            <div className="bg-[var(--tf-bg-layer-default)] rounded-r3 border border-[var(--tf-stroke-brand)] p-5 shadow-sm space-y-3">
              <h2 className="text-[14px] font-semibold text-[var(--tf-fg-brand)]">다음 할 일</h2>
              <div className="space-y-2">
                {actions.map((action, i) => (
                  <button
                    key={i}
                    onClick={action.onClick}
                    className="w-full flex items-center gap-3 p-3 rounded-r2 text-left hover:opacity-80 transition-opacity"
                    style={{ backgroundColor: action.bgColor }}
                  >
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold" style={{ color: action.color, border: `1.5px solid ${action.color}` }}>
                      {i + 1}
                    </span>
                    <span className="text-[13px] font-medium" style={{ color: action.color }}>
                      {action.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Kickoff CTA (leader only) — 3 states: start / resume / hidden(completed) */}
        {viewerRole === "leader" && progress.completed > 0 && kickoffPhase !== "completed" && (() => {
          const isResume = kickoffPhase !== null;
          // Check if all members are in and all surveys done
          const allReady = progress.total > 0
            && progress.completed === progress.total
            && team.expectedSize > 0
            && nonObserverCount >= team.expectedSize;

          function handleKickoffClick() {
            if (isResume) {
              router.push(`/team/${teamId}/kickoff`);
              return;
            }
            if (allReady) {
              router.push(`/team/${teamId}/kickoff`);
            } else {
              setShowProceedDialog(true);
            }
          }

          return (
            <button
              onClick={handleKickoffClick}
              className="w-full bg-[var(--tf-bg-brand-solid)] hover:bg-[var(--tf-bg-brand-solid-pressed)] text-[var(--tf-fg-neutral-inverted)] rounded-r3 p-5 shadow-sm transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <Rocket className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-[15px] font-semibold">
                      {isResume ? "킥오프 계속하기" : "이대로 진행하기"}
                    </p>
                    <p className="text-[12px] opacity-80">
                      {isResume
                        ? "진행 중인 킥오프 세션으로 이동"
                        : "프로젝트 주제 결정 → 아키텍처 설계 → 킥오프"}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 opacity-80" />
              </div>
            </button>
          );
        })()}

        {/* Proceed confirmation dialog — shown when incomplete state */}
        {mounted && showProceedDialog && (() => {
          const missingMembers = team.expectedSize > 0 ? Math.max(0, team.expectedSize - nonObserverCount) : 0;
          const missingSurveys = progress.total > 0 ? progress.total - progress.completed : 0;

          const descLines: string[] = [];
          if (missingMembers > 0) {
            descLines.push(`예상 인원보다 ${missingMembers}명이 아직 참가하지 않았어요.`);
          }
          if (missingSurveys > 0) {
            descLines.push(`${missingSurveys}명이 아직 설문을 완료하지 않았어요.`);
          }
          descLines.push("킥오프를 시작하면 새 팀원 초대와 설문 제출이 마감돼요. 이 결정은 되돌릴 수 없어요.");

          return createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="proceed-dialog-title"
              className="fixed inset-0 z-[1000] flex items-center justify-center px-4"
            >
              {/* Backdrop */}
              <div
                className="absolute inset-0 bg-[var(--tf-bg-overlay)]"
                onClick={() => setShowProceedDialog(false)}
                aria-hidden="true"
              />

              {/* Dialog content — SEED Alert Dialog spec: max-w-[272px], r5, layer-floating */}
              <div
                className="relative z-10 w-full max-w-[304px] bg-[var(--tf-bg-layer-floating)] rounded-r5 shadow-lg overflow-hidden"
                style={{ animation: "dialog-enter 200ms cubic-bezier(0.34,1.56,0.64,1) both" }}
              >
                {/* Header */}
                <div className="px-5 pt-5 pb-0 space-y-1.5">
                  <div className="flex items-start justify-between">
                    <h2
                      id="proceed-dialog-title"
                      className="text-[16px] font-bold text-[var(--tf-fg-default)] leading-snug"
                    >
                      킥오프를 시작할까요?
                    </h2>
                    <button
                      onClick={() => setShowProceedDialog(false)}
                      aria-label="닫기"
                      className="w-6 h-6 flex items-center justify-center text-[var(--tf-fg-subtle)] hover:text-[var(--tf-fg-default)] transition-colors shrink-0 ml-2 -mt-0.5 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Description */}
                <div className="px-5 pt-3 pb-0 space-y-1.5">
                  {/* Status chips */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium ${nonObserverCount >= team.expectedSize && team.expectedSize > 0 ? "bg-[var(--tf-bg-positive-weak)] text-[var(--tf-fg-positive)]" : "bg-[var(--tf-bg-warning-weak)] text-[var(--tf-fg-warning)]"}`}>
                      <Users className="w-3 h-3" />
                      {nonObserverCount}/{team.expectedSize}명 참가
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium ${progress.completed === progress.total && progress.total > 0 ? "bg-[var(--tf-bg-positive-weak)] text-[var(--tf-fg-positive)]" : "bg-[var(--tf-bg-warning-weak)] text-[var(--tf-fg-warning)]"}`}>
                      <Check className="w-3 h-3" />
                      {progress.completed}/{progress.total}명 설문 완료
                    </span>
                  </div>

                  {descLines.map((line, i) => (
                    <p key={i} className="text-[13px] text-[var(--tf-fg-muted)] leading-relaxed">
                      {line}
                    </p>
                  ))}
                </div>

                {/* Warning row */}
                <div className="mx-5 mt-3 flex items-start gap-2 p-3 rounded-r2 bg-[var(--tf-bg-warning-weak)]">
                  <AlertTriangle className="w-3.5 h-3.5 text-[var(--tf-fg-warning)] shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="text-[12px] text-[var(--tf-fg-warning)] leading-snug">
                    미완료 팀원은 더 이상 설문을 제출할 수 없게 됩니다.
                  </p>
                </div>

                {/* Footer buttons — SEED: horizontal layout, auto-wrap */}
                <div className="px-5 pt-4 pb-5 flex gap-2 justify-end">
                  <button
                    ref={dialogCancelRef}
                    onClick={() => setShowProceedDialog(false)}
                    className="h-9 px-4 rounded-r2 border border-[var(--tf-stroke-neutral)] text-[13px] font-medium text-[var(--tf-fg-default)] hover:bg-[var(--tf-bg-layer-alt)] transition-colors cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    onClick={() => {
                      setShowProceedDialog(false);
                      router.push(`/team/${teamId}/kickoff`);
                    }}
                    className="h-9 px-4 rounded-r2 bg-[var(--tf-bg-brand-solid)] text-[var(--tf-fg-neutral-inverted)] text-[13px] font-semibold hover:bg-[var(--tf-bg-brand-solid-pressed)] transition-colors cursor-pointer"
                  >
                    그래도 시작하기
                  </button>
                </div>
              </div>

              <style>{`
                @keyframes dialog-enter {
                  from { opacity: 0; transform: scale(1.08); }
                  to   { opacity: 1; transform: scale(1); }
                }
              `}</style>
            </div>,
            document.body,
          );
        })()}

        {/* Survey progress */}
        <div className="bg-[var(--tf-bg-layer-default)] rounded-r3 border border-[var(--tf-stroke-neutral)] p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[16px] font-semibold text-[var(--tf-fg-default)]">설문 진행률</h2>
              {members.length > nonObserverCount && (
                <p className="text-[11px] text-[var(--tf-fg-subtle)]">옵저버 제외</p>
              )}
            </div>
            <span className="text-[14px] font-bold text-[var(--tf-fg-brand)]">
              {progress.completed}/{progress.total}명 완료
            </span>
          </div>
          <div className="w-full h-2 bg-[var(--tf-bg-layer-alt)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--tf-fg-brand)] transition-all duration-500"
              style={{ width: progress.total > 0 ? `${(progress.completed / progress.total) * 100}%` : "0%" }}
            />
          </div>
          {dashboardStatus === "survey_incomplete" && (
            <div className="flex items-center gap-2 p-3 rounded-r2 bg-[var(--tf-bg-warning)]">
              <AlertTriangle className="w-4 h-4 text-[var(--tf-fg-warning)]" />
              <p className="text-[13px] text-[var(--tf-fg-warning)]">
                아직 설문을 완료한 팀원이 없어요. 팀원들에게 설문 참여를 독려해주세요.
              </p>
            </div>
          )}
          {dashboardStatus === "partial_ready" && viewerRole === "leader" && (
            <div className="flex items-center justify-between p-3 rounded-r2 bg-[var(--tf-bg-info)]">
              <p className="text-[13px] text-[var(--tf-fg-info)]">
                {progress.completed}명의 데이터로 분석 결과를 확인할 수 있어요
              </p>
            </div>
          )}
        </div>

        {/* Leader actions: invite code */}
        {viewerRole === "leader" && team.inviteCode && (
          <div className="bg-[var(--tf-bg-layer-default)] rounded-r3 border border-[var(--tf-stroke-neutral)] p-6 shadow-sm space-y-4">
            <h2 className="text-[16px] font-semibold text-[var(--tf-fg-default)]">팀원 초대</h2>
            <div className="flex items-center gap-3">
              <div className="flex-1 text-center py-3 rounded-r2 bg-[var(--tf-bg-layer-alt)] font-mono text-[24px] font-bold tracking-[0.3em] text-[var(--tf-fg-default)]">
                {team.inviteCode}
              </div>
              <button
                onClick={() => copyText(team.inviteCode!, "code")}
                className="h-12 w-12 rounded-r2 border border-[var(--tf-stroke-neutral)] flex items-center justify-center hover:bg-[var(--tf-bg-layer-alt)] transition-colors"
              >
                {codeCopied ? <Check className="w-4 h-4 text-[var(--tf-fg-positive)]" /> : <Copy className="w-4 h-4 text-[var(--tf-fg-muted)]" />}
              </button>
            </div>
            {team.inviteUrl && (
              <button
                onClick={() => copyText(team.inviteUrl!, "link")}
                className="w-full h-10 rounded-r2 border border-[var(--tf-stroke-neutral)] text-[13px] text-[var(--tf-fg-muted)] hover:bg-[var(--tf-bg-layer-alt)] transition-colors flex items-center justify-center gap-2"
              >
                {linkCopied ? <><Check className="w-3.5 h-3.5 text-[var(--tf-fg-positive)]" /> 링크 복사됨</> : <><Link2 className="w-3.5 h-3.5" /> 초대 링크 복사</>}
              </button>
            )}
          </div>
        )}

        {/* Meeting hub entry (only after kickoff completed) */}
        {kickoffPhase === "completed" && <button
          onClick={() => window.location.href = `/team/${teamId}/meetings`}
          className="w-full bg-[var(--tf-bg-layer-default)] rounded-r3 border border-[var(--tf-stroke-neutral)] p-5 shadow-sm hover:border-[var(--tf-stroke-brand)] transition-colors text-left"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--tf-bg-info)] flex items-center justify-center">
                <MessageSquareText className="w-5 h-5 text-[var(--tf-fg-brand)]" />
              </div>
              <div>
                <p className="text-[14px] font-medium text-[var(--tf-fg-default)]">회의 허브</p>
                <p className="text-[12px] text-[var(--tf-fg-muted)]">회의록 분석, 액션 아이템 추적</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-[var(--tf-fg-subtle)]" />
          </div>
        </button>}

        {/* Team skill distribution */}
        {progress.completed > 0 && (
          <>
            <div className="bg-[var(--tf-bg-layer-default)] rounded-r3 border border-[var(--tf-stroke-neutral)] p-6 shadow-sm space-y-4">
              <h2 className="text-[16px] font-semibold text-[var(--tf-fg-default)]">팀 스킬 분포</h2>

              {/* Radar chart for mobile, bar chart hidden on mobile */}
              <div className="block md:hidden">
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="var(--tf-stroke-neutral)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: "var(--tf-fg-muted)", fontSize: 11 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 5]} tick={{ fill: "var(--tf-fg-subtle)", fontSize: 10 }} />
                    <Radar name="팀 평균" dataKey="value" stroke="var(--tf-stroke-brand)" fill="var(--tf-bg-brand-solid)" fillOpacity={0.25} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Bar chart for desktop */}
              <div className="hidden md:block">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={barData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--tf-stroke-neutral)" />
                    <XAxis type="number" domain={[0, 5]} tick={{ fill: "var(--tf-fg-muted)", fontSize: 12 }} />
                    <YAxis dataKey="name" type="category" width={80} tick={{ fill: "var(--tf-fg-default)", fontSize: 13 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="var(--tf-bg-brand-solid)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Strengths & weaknesses */}
              <div className="grid grid-cols-2 gap-3">
                {strengths.length > 0 && (
                  <div className="p-3 rounded-r2 bg-[var(--tf-bg-positive)] space-y-1">
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-[var(--tf-fg-positive)]" />
                      <span className="text-[11px] font-semibold text-[var(--tf-fg-positive)]">강점</span>
                    </div>
                    <p className="text-[13px] text-[var(--tf-fg-default)]">
                      {strengths.map((s) => SKILL_LABEL_KO[s] ?? s).join(", ")}
                    </p>
                  </div>
                )}
                {weaknesses.length > 0 && (
                  <div className="p-3 rounded-r2 bg-[var(--tf-bg-warning)] space-y-1">
                    <div className="flex items-center gap-1.5">
                      <TrendingDown className="w-3.5 h-3.5 text-[var(--tf-fg-warning)]" />
                      <span className="text-[11px] font-semibold text-[var(--tf-fg-warning)]">보강 필요</span>
                    </div>
                    <p className="text-[13px] text-[var(--tf-fg-default)]">
                      {weaknesses.map((s) => SKILL_LABEL_KO[s] ?? s).join(", ")}
                    </p>
                  </div>
                )}
              </div>

              {dashboardStatus === "partial_ready" && (
                <p className="text-[11px] text-[var(--tf-fg-subtle)] text-center">
                  * {progress.completed}명의 완료 데이터 기준 (미완료 팀원 제외)
                </p>
              )}
            </div>

            {/* Role recommendations (leader/member only) */}
            {roleRecommendations && roleRecommendations.length > 0 && (
              <div className="bg-[var(--tf-bg-layer-default)] rounded-r3 border border-[var(--tf-stroke-neutral)] p-6 shadow-sm space-y-4">
                <h2 className="text-[16px] font-semibold text-[var(--tf-fg-default)]">역할 제안</h2>
                <p className="text-[12px] text-[var(--tf-fg-muted)]">스킬 점수 기반 추천이에요. 참고용으로 활용하세요.</p>
                <div className="space-y-3">
                  {roleRecommendations.map((rec) => (
                    <div key={rec.role} className="p-4 rounded-r2 bg-[var(--tf-bg-layer-alt)] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[14px] font-medium text-[var(--tf-fg-default)]">{rec.role}</span>
                        {rec.topCandidate && (
                          <span className="text-[13px] text-[var(--tf-fg-brand)] font-semibold">
                            {rec.topCandidate.name}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {rec.candidates.map((c, i) => (
                          <div
                            key={c.userId}
                            className={`
                              flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px]
                              ${i === 0 ? "bg-[var(--tf-bg-info)] text-[var(--tf-fg-brand)]" : "bg-[var(--tf-bg-layer-default)] text-[var(--tf-fg-muted)]"}
                            `}
                          >
                            {i === 0 && <Star className="w-3 h-3" />}
                            <span>{c.name}</span>
                            <span className="opacity-60">{c.score.toFixed(1)}</span>
                            {c.desired && <UserCheck className="w-3 h-3 text-[var(--tf-fg-positive)]" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Members list */}
        <div className="bg-[var(--tf-bg-layer-default)] rounded-r3 border border-[var(--tf-stroke-neutral)] p-6 shadow-sm space-y-4">
          <h2 className="text-[16px] font-semibold text-[var(--tf-fg-default)]">팀원</h2>
          <div className="space-y-3">
            {members.map((m) => (
              <div key={m.userId} className="flex items-center justify-between p-3 rounded-r2 bg-[var(--tf-bg-layer-alt)]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[var(--tf-bg-info)] flex items-center justify-center text-[12px] font-bold text-[var(--tf-fg-brand)]">
                    {m.name?.charAt(0) ?? "?"}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[14px] font-medium text-[var(--tf-fg-default)]">{m.name}</span>
                      {m.role === "leader" && <Crown className="w-3.5 h-3.5 text-[var(--tf-fg-warning)]" />}
                    </div>
                    <span className="text-[11px] text-[var(--tf-fg-subtle)]">
                      {m.role === "leader" ? "팀장" : m.role === "observer" ? "옵저버" : "팀원"}
                    </span>
                  </div>
                </div>
                <div>
                  {m.role === "observer" ? null : m.role === "leader" ? (
                    m.surveyCompleted ? (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--tf-bg-positive)] text-[var(--tf-fg-positive)]">설문 완료</span>
                    ) : (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--tf-bg-warning)] text-[var(--tf-fg-warning)]">설문 대기</span>
                    )
                  ) : m.surveyCompleted ? (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--tf-bg-positive)] text-[var(--tf-fg-positive)]">설문 완료</span>
                  ) : (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--tf-bg-warning)] text-[var(--tf-fg-warning)]">설문 대기</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
