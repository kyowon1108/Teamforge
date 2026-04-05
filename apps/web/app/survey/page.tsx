"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ChevronLeft, ChevronRight, Check, Loader2 } from "lucide-react";
import LogoutButton from "@/components/LogoutButton";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import Section1BasicInfo from "@/components/survey/sections/Section1BasicInfo";
import Section2TechStack from "@/components/survey/sections/Section2TechStack";
import Section3ProjectExp from "@/components/survey/sections/Section3ProjectExp";
import Section4CollabStyle from "@/components/survey/sections/Section4CollabStyle";
import Section5Availability from "@/components/survey/sections/Section5Availability";
import Section6Portfolio from "@/components/survey/sections/Section6Portfolio";

const SECTIONS = [
  { id: 1, title: "기본 정보", est: "~30초" },
  { id: 2, title: "기술 스택", est: "~90초" },
  { id: 3, title: "프로젝트 경험", est: "~60초" },
  { id: 4, title: "협업 스타일", est: "~45초" },
  { id: 5, title: "가용 시간", est: "~30초" },
  { id: 6, title: "포트폴리오", est: "~30초" },
];

export default function SurveyPage() {
  const [currentSection, setCurrentSection] = useState(1);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [submitting, setSubmitting] = useState(false);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [teamIdLoading, setTeamIdLoading] = useState(true);
  const [teamRole, setTeamRole] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();
  const { data: session, status } = useSession();

  // Resolve teamId + teamRole; redirect observers immediately
  // NOTE: JWT teamRole is set at login time — after joining a team it may be stale.
  // Always verify via /auth/me when teamRole is null to catch fresh-join observer case.
  useEffect(() => {
    if (status !== "authenticated") return;

    const token = session?.teamforgeToken ?? session?.user?.teamforgeToken;
    if (token) apiClient.setToken(token);

    const sessionTeamId = session?.user?.teamId;
    const sessionRole = session?.user?.teamRole;
    const storedTeamId = typeof window !== "undefined"
      ? localStorage.getItem("teamforge_team_id")
      : null;

    const applyRoleAndTeam = (tid: string | null, role: string | null) => {
      if (tid) setTeamId(tid);
      if (role === "observer" && tid) {
        router.replace(`/team/${tid}`);
        return;
      }
      if (role) setTeamRole(role);
      setTeamIdLoading(false);
    };

    // If role is already known from a fresh session, use it directly
    if (sessionTeamId && sessionRole) {
      applyRoleAndTeam(sessionTeamId, sessionRole);
      return;
    }

    // Otherwise fetch from API to handle stale JWT (e.g. just joined as observer)
    apiClient
      .get<{ teamId: string | null; teamRole: string | null }>("/auth/me")
      .then((me) => {
        const tid = sessionTeamId ?? storedTeamId ?? me?.teamId ?? null;
        if (me?.teamId) localStorage.setItem("teamforge_team_id", me.teamId);
        applyRoleAndTeam(tid, me?.teamRole ?? sessionRole ?? null);
      })
      .catch(() => {
        // API unavailable — fall back to session/localStorage values
        const tid = sessionTeamId ?? storedTeamId ?? null;
        applyRoleAndTeam(tid, sessionRole ?? null);
      });
  }, [status, session?.user?.teamId, session?.user?.teamRole, session?.teamforgeToken, session?.user?.teamforgeToken, router]);

  const updateAnswers = useCallback(
    (sectionAnswers: Record<string, unknown>) => {
      const merged = { ...answers, ...sectionAnswers };
      setAnswers(merged);

      // Debounced auto-save
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        if (!teamId) return;
        setSaveStatus("saving");
        try {
          await apiClient.post("/survey/draft", {
            teamId,
            section: currentSection,
            answers: merged,
          });
          setSaveStatus("saved");
          setTimeout(() => setSaveStatus("idle"), 3000);
        } catch {
          setSaveStatus("error");
        }
      }, 500);
    },
    [answers, teamId, currentSection]
  );

  const goNext = () => {
    if (currentSection < 6) setCurrentSection((s) => s + 1);
  };

  const goPrev = () => {
    if (currentSection > 1) setCurrentSection((s) => s - 1);
  };

  const handleSubmit = async () => {
    if (!teamId) {
      toast.error("팀 정보를 찾을 수 없어요. 팀을 먼저 생성하거나 합류해주세요.");
      router.push("/onboarding/role");
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiClient.post<{ jobId: string }>("/survey/submit", {
        teamId,
        answers,
      });
      toast.info("분석 중...");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
      const evtSource = new EventSource(
        `${apiUrl}/survey/result-status/${res.jobId}`
      );
      evtSource.onmessage = (event) => {
        const data = JSON.parse(event.data) as { status: string; progress: number };
        if (data.status === "done") {
          evtSource.close();
          router.push("/result");
        } else if (data.status === "failed") {
          evtSource.close();
          toast.error("분석에 실패했어요. 다시 시도해주세요.");
          setSubmitting(false);
        }
      };
      evtSource.onerror = () => {
        evtSource.close();
        toast.error("실시간 상태 확인에 실패했어요. 결과 페이지에서 확인해주세요.");
        setSubmitting(false);
        // Don't auto-redirect — let user manually navigate or retry
      };
    } catch {
      toast.error("제출에 실패했어요. 다시 시도해주세요.");
      setSubmitting(false);
    }
  };

  // Guard: if teamId couldn't be resolved after auth, block survey
  const noTeam = status === "authenticated" && !teamId && !teamIdLoading;

  // Per-section required field validation
  const isSectionValid = (section: number): boolean => {
    switch (section) {
      case 1:
        return answers.experienceTier != null && answers.backgroundType != null;
      case 2:
        return (
          Array.isArray(answers.techStackList) && (answers.techStackList as string[]).length >= 1 &&
          Array.isArray(answers.topStrengths) && (answers.topStrengths as string[]).length >= 1
        );
      case 3:
        return answers.projectCount != null && answers.gitCollabLevel != null;
      case 4:
        return (
          answers.workArchetype != null &&
          Array.isArray(answers.desiredRoles) && (answers.desiredRoles as string[]).length >= 1
        );
      case 5:
        return answers.weeklyHours != null;
      case 6:
        return true; // all optional
      default:
        return true;
    }
  };

  const currentValid = isSectionValid(currentSection);
  const allSectionsValid = [1, 2, 3, 4, 5, 6].every(isSectionValid);

  const progress = (currentSection / 6) * 100;

  const renderSection = () => {
    const props = { answers, updateAnswers };
    switch (currentSection) {
      case 1: return <Section1BasicInfo {...props} />;
      case 2: return <Section2TechStack {...props} />;
      case 3: return <Section3ProjectExp {...props} />;
      case 4: return <Section4CollabStyle {...props} />;
      case 5: return <Section5Availability {...props} />;
      case 6: return <Section6Portfolio {...props} teamId={teamId ?? undefined} />;
      default: return null;
    }
  };

  if (noTeam) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--tf-bg-layer-alt)] px-4">
        <LogoutButton />
        <div className="max-w-[400px] text-center space-y-4">
          <p className="text-[16px] font-semibold text-[var(--tf-fg-default)]">팀 정보를 찾을 수 없어요</p>
          <p className="text-[13px] text-[var(--tf-fg-muted)]">설문을 진행하려면 먼저 팀을 생성하거나 합류해주세요.</p>
          <button
            onClick={() => router.push("/onboarding/role")}
            className="h-10 px-6 rounded-r2 bg-[var(--tf-bg-brand-solid)] text-[var(--tf-fg-inverse)] text-[14px] font-medium hover:opacity-90 transition-opacity"
          >
            팀 설정하러 가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--tf-bg-layer-alt)]">
      <LogoutButton />
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[var(--tf-bg-layer-default)] border-b border-[var(--tf-stroke-neutral)]">
        <div className="max-w-[640px] mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] text-[var(--tf-fg-muted)]">
              {SECTIONS[currentSection - 1].title} ({currentSection}/6)
            </span>
            <span className="text-[12px] text-[var(--tf-fg-subtle)]">
              {saveStatus === "saving" && "저장 중..."}
              {saveStatus === "saved" && "저장됨"}
              {saveStatus === "error" && "저장 실패"}
              {saveStatus === "idle" && SECTIONS[currentSection - 1].est}
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full h-1.5 bg-[var(--tf-bg-layer-alt)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--tf-fg-brand)] transition-all duration-300"
              style={{ width: `${progress}%` }}
              role="progressbar"
              aria-valuenow={currentSection}
              aria-valuemin={1}
              aria-valuemax={6}
              aria-label="설문 진행률"
            />
          </div>
        </div>
      </div>

      {/* Section content — pb-24 to avoid bottom nav overlap */}
      <div className="max-w-[640px] mx-auto px-4 py-8 pb-28">
        {renderSection()}
      </div>

      {/* Bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-[var(--tf-bg-layer-default)] border-t border-[var(--tf-stroke-neutral)]">
        <div className="max-w-[640px] mx-auto px-4 py-3 flex items-center justify-between" style={{ paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))" }}>
          <button
            onClick={goPrev}
            disabled={currentSection === 1}
            className={`
              flex items-center gap-1 h-10 px-4 rounded-r2 text-[14px] font-medium transition-colors
              ${currentSection > 1
                ? "text-[var(--tf-fg-default)] hover:bg-[var(--tf-bg-layer-alt)]"
                : "text-[var(--tf-fg-disabled)] cursor-not-allowed"
              }
            `}
          >
            <ChevronLeft className="w-4 h-4" /> 이전
          </button>

          {currentSection < 6 ? (
            <button
              onClick={goNext}
              disabled={!currentValid}
              className={`
                flex items-center gap-1 h-10 px-6 rounded-r2 text-[14px] font-medium transition-all
                ${currentValid
                  ? "bg-[var(--tf-bg-brand-solid)] text-[var(--tf-fg-inverse)] hover:opacity-90"
                  : "bg-[var(--tf-stroke-neutral)] text-[var(--tf-fg-disabled)] cursor-not-allowed"
                }
              `}
            >
              다음 <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting || !allSectionsValid}
              className={`
                flex items-center gap-2 h-10 px-6 rounded-r2 text-[14px] font-medium transition-all
                ${!submitting && allSectionsValid
                  ? "bg-[var(--tf-bg-brand-solid)] text-[var(--tf-fg-inverse)] hover:opacity-90"
                  : "bg-[var(--tf-stroke-neutral)] text-[var(--tf-fg-disabled)] cursor-not-allowed opacity-50"
                }
              `}
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> 분석 중...</>
              ) : (
                <><Check className="w-4 h-4" /> 제출하기</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
