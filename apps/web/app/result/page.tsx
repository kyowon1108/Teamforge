"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2, Award, ArrowRight, RotateCcw, ShieldCheck, TrendingUp, Lightbulb } from "lucide-react";
import LogoutButton from "@/components/LogoutButton";
import { apiClient } from "@/lib/api-client";
import type { PersonalResult } from "@teamforge/contracts";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";

export default function ResultPage() {
  const [result, setResult] = useState<PersonalResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<"none" | "no_team" | "no_result" | "api_error">("none");
  // "api_error" is now a distinct state (5xx/network) separate from "no_result" (404)
  const [teamId, setTeamId] = useState<string | null>(null);
  const [teamRole, setTeamRole] = useState<string | null>(null);
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status !== "authenticated") return;

    // Ensure token is set
    const token = session?.teamforgeToken ?? session?.user?.teamforgeToken;
    if (token) apiClient.setToken(token);

    const fetchResult = async () => {
      try {
        let userId = session?.user?.id;
        let tid = session?.user?.teamId
          ?? (typeof window !== "undefined" ? localStorage.getItem("teamforge_team_id") : null);

        if (!userId || !tid) {
          const me = await apiClient.get<{ id: string; teamId: string | null; teamRole: string | null }>("/auth/me");
          userId = userId ?? me?.id;
          tid = tid ?? me?.teamId;
          if (me?.teamRole) setTeamRole(me.teamRole);
          if (me?.teamId) {
            localStorage.setItem("teamforge_team_id", me.teamId);
          }
        }

        if (!userId || !tid) {
          setErrorState("no_team");
          setLoading(false);
          return;
        }

        setTeamId(tid);
        if (!teamRole && session?.user?.teamRole) setTeamRole(session.user.teamRole);
        const data = await apiClient.get<PersonalResult>(
          `/survey/result/${userId}/${tid}`
        );
        if (data) {
          setResult(data);
        } else {
          setErrorState("no_result");
        }
      } catch (err: unknown) {
        const code = (err as { statusCode?: number })?.statusCode;
        if (code === 401 || code === 403) {
          router.replace("/login");
          return;
        }
        // 404 = survey not submitted yet; other errors = api_error
        setErrorState(code === 404 ? "no_result" : "api_error");
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [status, session?.teamforgeToken, session?.user?.teamforgeToken, session?.user?.id, session?.user?.teamId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--tf-bg-layer-alt)]">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 text-[var(--tf-fg-brand)] animate-spin mx-auto" />
          <p className="text-[14px] text-[var(--tf-fg-muted)]">결과를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--tf-bg-layer-alt)] px-4">
        <LogoutButton />
        <div className="max-w-[400px] text-center space-y-4">
          {errorState === "no_team" ? (
            <>
              <p className="text-[16px] font-semibold text-[var(--tf-fg-default)]">팀 정보를 찾을 수 없어요</p>
              <p className="text-[13px] text-[var(--tf-fg-muted)]">팀을 먼저 생성하거나 합류해주세요.</p>
              <button
                onClick={() => router.push("/onboarding/role")}
                className="h-10 px-6 rounded-r2 bg-[var(--tf-bg-brand-solid)] text-[var(--tf-fg-inverse)] text-[14px] font-medium hover:opacity-90 transition-opacity"
              >
                팀 설정하러 가기
              </button>
            </>
          ) : errorState === "api_error" ? (
            <>
              <p className="text-[16px] font-semibold text-[var(--tf-fg-default)]">결과를 불러오지 못했어요</p>
              <p className="text-[13px] text-[var(--tf-fg-muted)]">서버 오류가 발생했어요. 잠시 후 다시 시도해주세요.</p>
              <button
                onClick={() => window.location.reload()}
                className="h-10 px-6 rounded-r2 bg-[var(--tf-bg-brand-solid)] text-[var(--tf-fg-inverse)] text-[14px] font-medium hover:opacity-90 transition-opacity"
              >
                다시 시도
              </button>
            </>
          ) : (
            <>
              <p className="text-[16px] font-semibold text-[var(--tf-fg-default)]">아직 결과가 없어요</p>
              <p className="text-[13px] text-[var(--tf-fg-muted)]">설문을 완료하면 여기서 결과를 확인할 수 있어요.</p>
              <button
                onClick={() => router.push("/survey")}
                className="h-10 px-6 rounded-r2 bg-[var(--tf-bg-brand-solid)] text-[var(--tf-fg-inverse)] text-[14px] font-medium hover:opacity-90 transition-opacity"
              >
                설문하러 가기
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  const radarData = [
    { subject: "백엔드", value: result.skillVector.backend, fullMark: 5 },
    { subject: "프론트엔드", value: result.skillVector.frontend, fullMark: 5 },
    { subject: "데이터베이스", value: result.skillVector.database, fullMark: 5 },
    { subject: "DevOps", value: result.skillVector.devops, fullMark: 5 },
    { subject: "AI/ML", value: result.skillVector.aiMl, fullMark: 5 },
    { subject: "디자인", value: result.skillVector.design, fullMark: 5 },
  ];

  return (
    <div className="min-h-screen bg-[var(--tf-bg-layer-alt)] px-4 py-10">
      <LogoutButton />
      <div className="max-w-[480px] mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-[20px] font-bold text-[var(--tf-fg-default)]">
            나의 스킬 분석 결과
          </h1>
          <p className="text-[14px] text-[var(--tf-fg-muted)]">
            설문 응답을 바탕으로 분석했어요
          </p>
        </div>

        {/* Radar Chart */}
        <div
          className="bg-[var(--tf-bg-layer-default)] rounded-r3 border border-[var(--tf-stroke-neutral)] p-6 shadow-sm"
          aria-label="스킬 분포 레이더 차트"
        >
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="var(--tf-stroke-neutral)" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fill: "var(--tf-fg-muted)", fontSize: 12 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 5]}
                tick={{ fill: "var(--tf-fg-subtle)", fontSize: 10 }}
              />
              <Radar
                name="스킬"
                dataKey="value"
                stroke="var(--tf-stroke-brand)"
                fill="var(--tf-bg-brand-solid)"
                fillOpacity={0.25}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>

          {/* Skill values */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            {radarData.map((d) => (
              <div key={d.subject} className="text-center">
                <p className="text-[11px] text-[var(--tf-fg-muted)]">{d.subject}</p>
                <p className="text-[16px] font-bold text-[var(--tf-fg-default)]">
                  {d.value.toFixed(1)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Recommended roles + explanation */}
        {result.recommendedRoles.length > 0 && (
          <div className="bg-[var(--tf-bg-layer-default)] rounded-r3 border border-[var(--tf-stroke-neutral)] p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-[var(--tf-fg-brand)]" />
              <h2 className="text-[16px] font-semibold text-[var(--tf-fg-default)]">
                추천 역할
              </h2>
            </div>
            <div className="space-y-2">
              {result.recommendedRoles.map((role, i) => (
                <div
                  key={role}
                  className={`
                    flex items-center gap-3 p-3 rounded-r2
                    ${i === 0 ? "bg-[var(--tf-bg-info)]" : "bg-[var(--tf-bg-layer-alt)]"}
                  `}
                >
                  <span className="text-[12px] font-bold text-[var(--tf-fg-brand)] w-6 text-center">
                    {i + 1}
                  </span>
                  <span className="text-[14px] text-[var(--tf-fg-default)]">{role}</span>
                </div>
              ))}
            </div>
            {result.explanations?.roleReason && (
              <p className="text-[13px] text-[var(--tf-fg-muted)] leading-relaxed px-1">
                {result.explanations.roleReason}
              </p>
            )}
          </div>
        )}

        {/* Strengths & Improvements */}
        {(result.explanations?.strengths || result.explanations?.improvements) && (
          <div className="grid grid-cols-1 gap-3">
            {result.explanations?.strengths && (
              <div className="bg-[var(--tf-bg-layer-default)] rounded-r3 border border-[var(--tf-stroke-neutral)] p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-[var(--tf-fg-positive)]" />
                  <span className="text-[13px] font-semibold text-[var(--tf-fg-positive)]">강점</span>
                </div>
                <p className="text-[13px] text-[var(--tf-fg-default)] leading-relaxed">
                  {result.explanations.strengths}
                </p>
              </div>
            )}
            {result.explanations?.improvements && (
              <div className="bg-[var(--tf-bg-layer-default)] rounded-r3 border border-[var(--tf-stroke-neutral)] p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-4 h-4 text-[var(--tf-fg-warning)]" />
                  <span className="text-[13px] font-semibold text-[var(--tf-fg-warning)]">성장 포인트</span>
                </div>
                <p className="text-[13px] text-[var(--tf-fg-default)] leading-relaxed">
                  {result.explanations.improvements}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Position prediction + confidence */}
        <div className="bg-[var(--tf-bg-layer-default)] rounded-r3 border border-[var(--tf-stroke-neutral)] p-6 shadow-sm text-center space-y-3">
          <p className="text-[12px] text-[var(--tf-fg-muted)]">예상 포지션</p>
          <p className="text-[20px] font-bold text-[var(--tf-fg-brand)]">
            {result.positionPrediction}
          </p>
          {result.profileConfidence && (
            <div className="flex items-center justify-center gap-1.5">
              <ShieldCheck className={`w-3.5 h-3.5 ${
                result.profileConfidence === "high" ? "text-[var(--tf-fg-positive)]"
                : result.profileConfidence === "medium" ? "text-[var(--tf-fg-brand)]"
                : "text-[var(--tf-fg-muted)]"
              }`} />
              <span className={`text-[12px] ${
                result.profileConfidence === "high" ? "text-[var(--tf-fg-positive)]"
                : result.profileConfidence === "medium" ? "text-[var(--tf-fg-brand)]"
                : "text-[var(--tf-fg-muted)]"
              }`}>
                근거 일치도: {result.profileConfidence === "high" ? "높음" : result.profileConfidence === "medium" ? "보통" : "데이터 부족"}
              </span>
            </div>
          )}
        </div>

        {/* CTAs */}
        <div className="space-y-3">
          <button
            onClick={() => router.push("/survey")}
            className="w-full h-12 rounded-r2 border border-[var(--tf-stroke-neutral)] text-[var(--tf-fg-default)] text-[14px] font-medium flex items-center justify-center gap-2 hover:bg-[var(--tf-bg-layer-alt)] transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            설문 다시하기
          </button>
          <button
            onClick={() => teamId && router.push(`/team/${teamId}`)}
            disabled={!teamId}
            className={`
              w-full h-12 rounded-r2 text-[14px] font-medium flex items-center justify-center gap-2 transition-all
              ${teamId
                ? "bg-[var(--tf-bg-brand-solid)] text-[var(--tf-fg-inverse)] hover:opacity-90 cursor-pointer"
                : "bg-[var(--tf-stroke-neutral)] text-[var(--tf-fg-muted)] cursor-not-allowed"
              }
            `}
          >
            {teamRole === "leader" ? "팀 대시보드 보기" : "팀 현황 보기"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
