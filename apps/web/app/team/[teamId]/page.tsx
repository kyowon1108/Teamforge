"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";
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
  progress: { total: number; completed: number };
  teamSkillDistribution: Record<string, number>;
  strengths: string[];
  weaknesses: string[];
  roleRecommendations?: RoleRecommendation[];
  members: MemberSummary[];
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
  const teamId = params.teamId as string;
  const { data: session, status } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;

    const token = session?.teamforgeToken ?? session?.user?.teamforgeToken;
    if (token) apiClient.setToken(token);

    apiClient
      .get<DashboardData>(`/teams/${teamId}/dashboard`)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [teamId, status, session?.teamforgeToken, session?.user?.teamforgeToken]);

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

  // Non-leader: waiting screen
  if (data.restricted || data.viewerRole !== "leader") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--tf-bg-layer-alt)] px-4">
        <LogoutButton />
        <div className="max-w-[400px] text-center space-y-4">
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
          <div className="pt-2">
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

  const { team, dashboardStatus, progress, teamSkillDistribution, strengths, weaknesses, roleRecommendations, members, viewerRole } = data;

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
              <p>{members.length}/{team.expectedSize}명</p>
            </div>
          </div>
        </div>

        {/* Survey progress */}
        <div className="bg-[var(--tf-bg-layer-default)] rounded-r3 border border-[var(--tf-stroke-neutral)] p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-semibold text-[var(--tf-fg-default)]">설문 진행률</h2>
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
                  {m.role === "observer" ? (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--tf-bg-layer-default)] text-[var(--tf-fg-subtle)]">옵저버</span>
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
