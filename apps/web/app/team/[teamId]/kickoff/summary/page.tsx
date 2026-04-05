"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Loader2,
  ArrowLeft,
  CheckCircle2,
  Rocket,
  Target,
  Layers,
  Users,
  Edit3,
  PartyPopper,
  Eye,
  XCircle,
  RefreshCw,
  MessageSquare,
  Sparkles,
  FileText,
  Calendar,
  BookOpen,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  PenLine,
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import DiagramViewer from "@/components/DiagramViewer";
import KickoffReadOnlyBanner from "@/components/KickoffReadOnlyBanner";
import { useKickoffRole } from "../kickoff-context";
import { useKickoffChannel } from "@/hooks/useKickoffChannel";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type CollabRules = {
  branchStrategy: string;
  prRule: string;
  issueRule: string;
  meetingCycle: string;
};

type SummaryData = {
  session: {
    id: string;
    phase: string;
    topicTitle: string | null;
    topicDescription: string | null;
    platformType: string | null;
    features: string[] | null;
    complexity: string | null;
    architecture: Record<string, string> | null;
    mermaidDiagram: string | null;
    summaryConfirmed: boolean;
    outOfScope: string[] | null;
    successCriteria: string[] | null;
    collabRules: CollabRules | null;
    revision: number;
    generationStatus: string;
  };
  team: {
    id: string;
    name: string;
    members: Array<{
      userId: string;
      name: string;
      role: string;
      skillVector: number[] | null;
    }>;
  };
};

type Participant = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  concerns: Array<{ type: string; detail?: string; createdAt: string }> | null;
  roleAcceptanceStatus: "pending" | "accepted" | "adjustment_requested" | "declined";
  alternativeRole: string | null;
  signedAt: string | null;
};

type Artifact = {
  id: string;
  artifactType: "first_issues" | "first_agenda" | "mini_adrs";
  content: Record<string, unknown>;
  status: string;
  sessionRevision: number;
  createdAt: string;
};

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const ARCH_LABELS: Record<string, string> = {
  framework: "Framework", styling: "Styling", realtime: "Realtime",
  api: "API", server: "Server", db: "DB/ORM", auth: "Auth", state: "State 관리",
};

const COMPLEXITY_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  simple:   { label: "단순", color: "var(--tf-fg-positive)",     bg: "var(--tf-bg-positive-weak)" },
  moderate: { label: "중간", color: "var(--tf-fg-informative)",  bg: "var(--tf-bg-informative-weak)" },
  complex:  { label: "복잡", color: "var(--tf-fg-warning)",      bg: "var(--tf-bg-warning-weak)" },
};

const PLATFORM_LABELS: Record<string, string> = {
  web: "Web", mobile: "Mobile", desktop: "Desktop", embedded: "Embedded", data: "Data/AI",
};

const CONCERN_LABELS: Record<string, string> = {
  stack_unfamiliar: "스택 자신 없음",
  role_burden: "역할 부담",
  schedule_tight: "일정 무리",
  skill_gap: "기술 격차",
  environment_issue: "개발 환경 문제",
  git_unfamiliar: "Git 협업 미숙",
  other: "기타",
};

const ROLE_STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pending:              { label: "대기 중",    color: "var(--tf-fg-muted)",        bg: "var(--tf-bg-neutral-weak)" },
  accepted:             { label: "수락",        color: "var(--tf-fg-positive)",     bg: "var(--tf-bg-positive-weak)" },
  adjustment_requested: { label: "조정 요청",  color: "var(--tf-fg-warning)",      bg: "var(--tf-bg-warning-weak)" },
  declined:             { label: "거절",        color: "var(--tf-fg-critical)",     bg: "var(--tf-bg-critical-weak)" },
};

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────

export default function KickoffSummaryPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params.teamId as string;
  const { data: session, status } = useSession();
  const { viewerRole } = useKickoffRole();
  const isLeader = viewerRole === "leader";
  const isObserver = viewerRole === "observer";

  const [data, setData] = useState<SummaryData | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmed, setConfirmed] = useState(false);

  // Batch A edit state
  const [editingDecisions, setEditingDecisions] = useState(false);
  const [outOfScope, setOutOfScope] = useState<string[]>([]);
  const [successCriteria, setSuccessCriteria] = useState<string[]>(["", "", ""]);
  const [collabRules, setCollabRules] = useState<CollabRules>({
    branchStrategy: "", prRule: "", issueRule: "", meetingCycle: "",
  });
  const [savingDecisions, setSavingDecisions] = useState(false);

  // Batch A concerns
  const [myConcerns, setMyConcerns] = useState<string[]>([]);
  const [savingConcerns, setSavingConcerns] = useState(false);

  // Batch B role status
  const [updatingRole, setUpdatingRole] = useState(false);
  const [adjustmentInput, setAdjustmentInput] = useState<Record<string, string>>({});

  // Batch C artifacts
  const [generating, setGenerating] = useState(false);
  const [artifactsOpen, setArtifactsOpen] = useState<Record<string, boolean>>({});

  // Batch D sign
  const [signing, setSigning] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const myUserId = (session?.user as { id?: string } | undefined)?.id ?? "";

  // ── Fetch helpers ──

  const fetchAll = useCallback(async () => {
    const token = session?.teamforgeToken ?? (session?.user as { teamforgeToken?: string } | undefined)?.teamforgeToken;
    if (token) apiClient.setToken(token);

    const [summaryRes, participantsRes, artifactsRes] = await Promise.all([
      apiClient.get<SummaryData>(`/kickoff/${teamId}/summary`).catch(() => null),
      apiClient.get<Participant[]>(`/kickoff/${teamId}/participants`).catch(() => []),
      apiClient.get<Artifact[]>(`/kickoff/${teamId}/artifacts`).catch(() => []),
    ]);

    if (summaryRes) {
      setData(summaryRes);
      if (summaryRes.session.summaryConfirmed) setConfirmed(true);
      if (summaryRes.session.outOfScope) setOutOfScope(summaryRes.session.outOfScope);
      if (summaryRes.session.successCriteria) {
        const filled = [...summaryRes.session.successCriteria];
        while (filled.length < 3) filled.push("");
        setSuccessCriteria(filled);
      }
      if (summaryRes.session.collabRules) setCollabRules(summaryRes.session.collabRules);
      if (summaryRes.session.generationStatus === "generating") setGenerating(true);
    }
    setParticipants(participantsRes as Participant[]);
    setArtifacts(artifactsRes as Artifact[]);
  }, [teamId, session]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetchAll().finally(() => setLoading(false));
  }, [status, fetchAll]);

  // ── Real-time ──

  useKickoffChannel({
    teamId,
    onEvent: useCallback((event) => {
      if (event.type === "kickoff:completed") setConfirmed(true);
      if (event.type === "kickoff:decisions_updated") fetchAll();
      if (event.type === "kickoff:concerns_updated") fetchAll();
      if (event.type === "kickoff:role_status_updated") fetchAll();
      if (event.type === "kickoff:artifacts_ready") {
        setGenerating(false);
        fetchAll();
      }
      if (event.type === "kickoff:member_signed") fetchAll();
    }, [fetchAll]),
  });

  // ─────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────

  async function handleSaveDecisions() {
    setSavingDecisions(true);
    try {
      await apiClient.patch(`/kickoff/${teamId}/decisions`, {
        outOfScope: outOfScope.filter(Boolean),
        successCriteria: successCriteria.filter(Boolean),
        collabRules,
      });
      setEditingDecisions(false);
      await fetchAll();
    } catch {
      toast.error("저장에 실패했습니다.");
    } finally {
      setSavingDecisions(false);
    }
  }

  async function handleSaveConcerns() {
    if (myConcerns.length === 0) return;
    setSavingConcerns(true);
    try {
      await apiClient.post(`/kickoff/${teamId}/concerns`, {
        concerns: myConcerns.map((type) => ({ type })),
      });
      setMyConcerns([]);
      await fetchAll();
    } catch {
      toast.error("우려 저장에 실패했습니다.");
    } finally {
      setSavingConcerns(false);
    }
  }

  async function handleRoleStatus(
    targetUserId: string,
    status: "accepted" | "adjustment_requested" | "declined",
    alternativeRole?: string,
  ) {
    setUpdatingRole(true);
    try {
      await apiClient.patch(`/kickoff/${teamId}/members/${targetUserId}/role-status`, {
        status, alternativeRole,
      });
      await fetchAll();
    } catch {
      toast.error("역할 상태 변경에 실패했습니다.");
    } finally {
      setUpdatingRole(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      await apiClient.post(`/kickoff/${teamId}/artifacts/generate`);
      // artifacts_ready 이벤트가 도착하면 setGenerating(false) + fetchAll
    } catch {
      setGenerating(false);
      toast.error("산출물 생성에 실패했습니다.");
    }
  }

  async function handleSign() {
    setSigning(true);
    try {
      await apiClient.post(`/kickoff/${teamId}/sign`);
      await fetchAll();
    } catch {
      toast.error("서명에 실패했습니다.");
    } finally {
      setSigning(false);
    }
  }

  async function handleFinalize() {
    setConfirming(true);
    try {
      await apiClient.post(`/kickoff/${teamId}/finalize`);
      setConfirmed(true);
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message ?? "킥오프 완료 처리에 실패했습니다.";
      toast.error(msg);
    } finally {
      setConfirming(false);
    }
  }

  // ─────────────────────────────────────────────
  // Loading
  // ─────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[var(--tf-bg-layer-alt)]">
        <Loader2 className="w-8 h-8 text-[var(--tf-fg-brand)] animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[var(--tf-bg-layer-alt)] px-4">
        <div className="text-center space-y-3">
          <p className="text-[15px] text-[var(--tf-fg-default)]">요약을 불러올 수 없어요</p>
          <button
            onClick={() => router.push(`/team/${teamId}`)}
            className="h-10 px-6 rounded-r2 bg-[var(--tf-bg-brand-solid)] text-[var(--tf-fg-neutral-inverted)] text-[14px] cursor-pointer"
          >
            대시보드로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const { session: sess, team } = data;
  const complexity = sess.complexity ? COMPLEXITY_LABELS[sess.complexity] : null;
  const features = (sess.features ?? []) as string[];
  const nonObservers = team.members.filter((m) => m.role !== "observer");

  const myParticipant = participants.find((p) => p.userId === myUserId);
  const hasSigned = !!myParticipant?.signedAt;
  const signedCount = participants.filter((p) => p.signedAt).length;
  const allSigned = nonObservers.every((m) => participants.find((p) => p.userId === m.userId)?.signedAt);

  // ─────────────────────────────────────────────
  // Confirmed (완료) state
  // ─────────────────────────────────────────────

  if (confirmed) {
    return (
      <div className="min-h-dvh bg-[var(--tf-bg-layer-alt)] flex items-center justify-center px-4">
        <div className="max-w-[480px] w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-[var(--tf-bg-positive-weak)] flex items-center justify-center mx-auto">
            <PartyPopper className="w-8 h-8 text-[var(--tf-fg-positive)]" />
          </div>
          <div className="space-y-2">
            <h1 className="text-[24px] font-bold text-[var(--tf-fg-default)]">킥오프 완료!</h1>
            <p className="text-[14px] text-[var(--tf-fg-muted)]">
              {sess.topicTitle} 프로젝트가 시작되었어요.<br />팀 대시보드에서 진행 상황을 관리하세요.
            </p>
          </div>
          <div className="bg-[var(--tf-bg-layer-default)] rounded-r3 border border-[var(--tf-stroke-neutral)] p-5 text-left space-y-3">
            <div className="flex items-center gap-2 text-[13px]">
              <Target className="w-4 h-4 text-[var(--tf-fg-brand)]" />
              <span className="font-medium text-[var(--tf-fg-default)]">{sess.topicTitle}</span>
            </div>
            {sess.architecture && (
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(sess.architecture).map(([k, v]) =>
                  v ? (
                    <span key={k} className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--tf-bg-informative-weak)] text-[var(--tf-fg-informative)]">
                      {v}
                    </span>
                  ) : null,
                )}
              </div>
            )}
            <div className="text-[12px] text-[var(--tf-fg-muted)]">
              {team.members.length}명 &middot; {PLATFORM_LABELS[sess.platformType ?? ""] ?? sess.platformType}
            </div>
          </div>
          <button
            onClick={() => router.push(`/team/${teamId}`)}
            className="w-full h-12 rounded-r3 bg-[var(--tf-bg-brand-solid)] text-[var(--tf-fg-neutral-inverted)] text-[15px] font-semibold hover:bg-[var(--tf-bg-brand-solid-pressed)] transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            팀 대시보드로 이동 <Rocket className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // Summary review
  // ─────────────────────────────────────────────

  return (
    <div className="min-h-dvh bg-[var(--tf-bg-layer-alt)] flex flex-col">
      {!isLeader && <KickoffReadOnlyBanner />}
      <div className="flex-1 px-4 py-8">
        <div className="max-w-[640px] mx-auto space-y-6">

          {/* Back */}
          <button
            onClick={() => router.push(`/team/${teamId}/kickoff/architecture`)}
            className="flex items-center gap-1.5 text-[13px] text-[var(--tf-fg-muted)] hover:text-[var(--tf-fg-default)] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            아키텍처로 돌아가기
          </button>

          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-[22px] font-bold text-[var(--tf-fg-default)]">킥오프 요약</h1>
            <p className="text-[13px] text-[var(--tf-fg-muted)]">
              모든 항목을 확인하고 팀원 전원이 서명하면 킥오프가 완료됩니다
            </p>
          </div>

          {/* ── 서명 진행 현황 배지 ── */}
          <div className="flex items-center justify-between px-4 py-3 rounded-r2 bg-[var(--tf-bg-layer-default)] border border-[var(--tf-stroke-neutral)]">
            <div className="flex items-center gap-2">
              <PenLine className="w-4 h-4 text-[var(--tf-fg-brand)]" />
              <span className="text-[13px] text-[var(--tf-fg-default)]">서명 현황</span>
            </div>
            <span className="text-[13px] font-semibold text-[var(--tf-fg-brand)]">
              {signedCount} / {nonObservers.length}명 서명 완료
            </span>
          </div>

          {/* ── Batch A: 프로젝트 주제 ── */}
          <SectionCard
            icon={<Target className="w-5 h-5 text-[var(--tf-fg-brand)]" />}
            title="프로젝트 주제"
            action={!isLeader ? null : (
              <button
                onClick={() => router.push(`/team/${teamId}/kickoff/topic`)}
                aria-label="프로젝트 주제 수정"
                className="w-7 h-7 rounded-r1 flex items-center justify-center hover:bg-[var(--tf-bg-neutral-weak)] transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-[var(--tf-fg-muted)]" />
              </button>
            )}
          >
            <h3 className="text-[18px] font-bold text-[var(--tf-fg-default)]">{sess.topicTitle ?? "미정"}</h3>
            {sess.topicDescription && (
              <p className="text-[14px] text-[var(--tf-fg-muted)] leading-relaxed">{sess.topicDescription}</p>
            )}
            <div className="flex flex-wrap gap-2 mt-1">
              {sess.platformType && (
                <span className="text-[12px] px-2.5 py-1 rounded-full bg-[var(--tf-bg-informative-weak)] text-[var(--tf-fg-informative)]">
                  {PLATFORM_LABELS[sess.platformType] ?? sess.platformType}
                </span>
              )}
              {complexity && (
                <span className="text-[12px] px-2.5 py-1 rounded-full" style={{ backgroundColor: complexity.bg, color: complexity.color }}>
                  복잡도: {complexity.label}
                </span>
              )}
            </div>
            {features.length > 0 && (
              <div className="space-y-1.5 mt-2">
                <p className="text-[12px] font-medium text-[var(--tf-fg-muted)]">핵심 기능</p>
                <div className="flex flex-wrap gap-1.5">
                  {features.map((f, i) => (
                    <span key={i} className="text-[12px] px-2 py-0.5 rounded-full bg-[var(--tf-bg-neutral-weak)] text-[var(--tf-fg-default)]">
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </SectionCard>

          {/* ── Batch A: 의사결정 입력 ── */}
          <SectionCard
            icon={<FileText className="w-5 h-5 text-[var(--tf-fg-brand)]" />}
            title="프로젝트 범위 & 성공 기준"
            action={isLeader && !editingDecisions ? (
              <button
                onClick={() => setEditingDecisions(true)}
                aria-label="편집"
                className="w-7 h-7 rounded-r1 flex items-center justify-center hover:bg-[var(--tf-bg-neutral-weak)] transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-[var(--tf-fg-muted)]" />
              </button>
            ) : null}
          >
            {editingDecisions ? (
              <div className="space-y-5">
                {/* Out of Scope */}
                <div className="space-y-2">
                  <label className="text-[13px] font-semibold text-[var(--tf-fg-default)]">
                    이번에 안 하는 것 <span className="text-[var(--tf-fg-muted)] font-normal">(한 줄씩, 최대 10개)</span>
                  </label>
                  {outOfScope.map((item, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        value={item}
                        onChange={(e) => { const n = [...outOfScope]; n[i] = e.target.value; setOutOfScope(n); }}
                        placeholder={`제외 항목 ${i + 1}`}
                        className="flex-1 h-9 px-3 rounded-r2 border border-[var(--tf-stroke-neutral)] bg-[var(--tf-bg-layer-default)] text-[13px] text-[var(--tf-fg-default)] focus:outline-none focus:border-[var(--tf-stroke-brand)]"
                      />
                      <button onClick={() => setOutOfScope(outOfScope.filter((_, j) => j !== i))} className="w-9 h-9 rounded-r2 border border-[var(--tf-stroke-neutral)] flex items-center justify-center hover:bg-[var(--tf-bg-neutral-weak)] cursor-pointer">
                        <XCircle className="w-4 h-4 text-[var(--tf-fg-muted)]" />
                      </button>
                    </div>
                  ))}
                  {outOfScope.length < 10 && (
                    <button onClick={() => setOutOfScope([...outOfScope, ""])} className="text-[12px] text-[var(--tf-fg-brand)] hover:underline cursor-pointer">
                      + 항목 추가
                    </button>
                  )}
                </div>

                {/* Success Criteria */}
                <div className="space-y-2">
                  <label className="text-[13px] font-semibold text-[var(--tf-fg-default)]">
                    데모 때 반드시 보여줄 것 <span className="text-[var(--tf-fg-critical)] text-[11px]">*최대 3개</span>
                  </label>
                  {[0, 1, 2].map((i) => (
                    <input
                      key={i}
                      value={successCriteria[i] ?? ""}
                      onChange={(e) => { const n = [...successCriteria]; n[i] = e.target.value; setSuccessCriteria(n); }}
                      placeholder={`성공 기준 ${i + 1}`}
                      className="w-full h-9 px-3 rounded-r2 border border-[var(--tf-stroke-neutral)] bg-[var(--tf-bg-layer-default)] text-[13px] text-[var(--tf-fg-default)] focus:outline-none focus:border-[var(--tf-stroke-brand)]"
                    />
                  ))}
                </div>

                {/* Collab Rules */}
                <div className="space-y-2">
                  <label className="text-[13px] font-semibold text-[var(--tf-fg-default)]">협업 규칙</label>
                  {(["branchStrategy", "prRule", "issueRule", "meetingCycle"] as const).map((key) => {
                    const labels: Record<string, string> = {
                      branchStrategy: "브랜치 전략",
                      prRule: "PR 규칙",
                      issueRule: "Issue 규칙",
                      meetingCycle: "회의 주기",
                    };
                    return (
                      <div key={key} className="space-y-1">
                        <p className="text-[11px] text-[var(--tf-fg-muted)]">{labels[key]}</p>
                        <input
                          value={collabRules[key]}
                          onChange={(e) => setCollabRules({ ...collabRules, [key]: e.target.value })}
                          placeholder={`예: ${key === "branchStrategy" ? "feature/xxx 브랜치 사용, main PR 전 리뷰 필수" : key === "prRule" ? "1인 이상 Approve 후 merge" : key === "issueRule" ? "작업 시작 전 Issue 먼저 생성" : "매주 월요일 오후 9시"}`}
                          className="w-full h-9 px-3 rounded-r2 border border-[var(--tf-stroke-neutral)] bg-[var(--tf-bg-layer-default)] text-[13px] text-[var(--tf-fg-default)] focus:outline-none focus:border-[var(--tf-stroke-brand)]"
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setEditingDecisions(false)}
                    className="flex-1 h-9 rounded-r2 border border-[var(--tf-stroke-neutral)] text-[13px] text-[var(--tf-fg-default)] hover:bg-[var(--tf-bg-neutral-weak)] cursor-pointer transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleSaveDecisions}
                    disabled={savingDecisions}
                    className="flex-1 h-9 rounded-r2 bg-[var(--tf-bg-brand-solid)] text-[var(--tf-fg-neutral-inverted)] text-[13px] font-semibold hover:bg-[var(--tf-bg-brand-solid-pressed)] cursor-pointer transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {savingDecisions ? <Loader2 className="w-4 h-4 animate-spin" /> : "저장"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Out of Scope 표시 */}
                <div>
                  <p className="text-[12px] font-semibold text-[var(--tf-fg-muted)] mb-1.5">이번에 안 하는 것</p>
                  {sess.outOfScope && sess.outOfScope.length > 0 ? (
                    <ul className="space-y-1">
                      {sess.outOfScope.map((item, i) => (
                        <li key={i} className="flex items-center gap-2 text-[13px] text-[var(--tf-fg-default)]">
                          <XCircle className="w-3.5 h-3.5 text-[var(--tf-fg-muted)] shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[13px] text-[var(--tf-fg-subtle)] italic">{isLeader ? "편집 버튼으로 입력하세요" : "미입력"}</p>
                  )}
                </div>
                {/* Success Criteria 표시 */}
                <div>
                  <p className="text-[12px] font-semibold text-[var(--tf-fg-muted)] mb-1.5">데모 필수 항목</p>
                  {sess.successCriteria && sess.successCriteria.filter(Boolean).length > 0 ? (
                    <ol className="space-y-1 list-decimal list-inside">
                      {sess.successCriteria.filter(Boolean).map((item, i) => (
                        <li key={i} className="text-[13px] text-[var(--tf-fg-default)]">{item}</li>
                      ))}
                    </ol>
                  ) : (
                    <p className="text-[13px] text-[var(--tf-fg-subtle)] italic">{isLeader ? "편집 버튼으로 입력하세요" : "미입력"}</p>
                  )}
                </div>
                {/* Collab Rules 표시 */}
                {sess.collabRules && (
                  <div>
                    <p className="text-[12px] font-semibold text-[var(--tf-fg-muted)] mb-1.5">협업 규칙</p>
                    <div className="grid grid-cols-2 gap-2">
                      {(["branchStrategy", "prRule", "issueRule", "meetingCycle"] as const).map((key) => {
                        const labels: Record<string, string> = {
                          branchStrategy: "브랜치", prRule: "PR", issueRule: "Issue", meetingCycle: "회의",
                        };
                        return sess.collabRules?.[key] ? (
                          <div key={key} className="p-2.5 rounded-r2 bg-[var(--tf-bg-neutral-weak)]">
                            <p className="text-[11px] text-[var(--tf-fg-muted)]">{labels[key]}</p>
                            <p className="text-[12px] text-[var(--tf-fg-default)] mt-0.5">{sess.collabRules[key]}</p>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </SectionCard>

          {/* ── 기술 스택 ── */}
          <SectionCard
            icon={<Layers className="w-5 h-5 text-[var(--tf-fg-brand)]" />}
            title="기술 스택"
            action={isLeader ? (
              <button
                onClick={() => router.push(`/team/${teamId}/kickoff/architecture`)}
                aria-label="기술 스택 수정"
                className="w-7 h-7 rounded-r1 flex items-center justify-center hover:bg-[var(--tf-bg-neutral-weak)] transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-[var(--tf-fg-muted)]" />
              </button>
            ) : null}
          >
            {sess.architecture ? (
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(sess.architecture).map(([key, val]) => (
                  <div key={key} className="p-3 rounded-r2 bg-[var(--tf-bg-neutral-weak)]">
                    <p className="text-[11px] text-[var(--tf-fg-muted)]">{ARCH_LABELS[key] ?? key}</p>
                    <p className="text-[14px] font-medium text-[var(--tf-fg-default)] mt-0.5">{val || "미정"}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[14px] text-[var(--tf-fg-muted)]">아키텍처가 결정되지 않았습니다.</p>
            )}
          </SectionCard>

          {/* ── Batch B: 역할 수락 ── */}
          <SectionCard
            icon={<Users className="w-5 h-5 text-[var(--tf-fg-brand)]" />}
            title="팀원 역할 수락"
          >
            <div className="space-y-3">
              {team.members.map((m) => {
                const participant = participants.find((p) => p.userId === m.userId);
                const roleStatus = participant?.roleAcceptanceStatus ?? "pending";
                const statusInfo = ROLE_STATUS_LABELS[roleStatus];
                const isMe = m.userId === myUserId;
                const canAct = isMe && !isObserver && roleStatus !== "accepted";

                return (
                  <div key={m.userId} className="p-3 rounded-r2 bg-[var(--tf-bg-neutral-weak)] space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[var(--tf-bg-informative-weak)] flex items-center justify-center text-[12px] font-bold text-[var(--tf-fg-informative)]">
                          {m.name?.charAt(0) ?? "?"}
                        </div>
                        <div>
                          <p className="text-[13px] font-medium text-[var(--tf-fg-default)]">
                            {m.name} {isMe && <span className="text-[11px] text-[var(--tf-fg-muted)]">(나)</span>}
                          </p>
                          <p className="text-[11px] text-[var(--tf-fg-muted)]">
                            {m.role === "leader" ? "팀장" : m.role === "observer" ? "옵저버" : "팀원"}
                          </p>
                        </div>
                      </div>
                      <span
                        className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: statusInfo.bg, color: statusInfo.color }}
                      >
                        {statusInfo.label}
                      </span>
                    </div>

                    {participant?.alternativeRole && (
                      <p className="text-[12px] text-[var(--tf-fg-warning)] pl-10">
                        조정 요청: {participant.alternativeRole}
                      </p>
                    )}

                    {/* 우려 표시 */}
                    {participant?.concerns && participant.concerns.length > 0 && (
                      <div className="pl-10 flex flex-wrap gap-1.5">
                        {participant.concerns.map((c, i) => (
                          <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--tf-bg-warning-weak)] text-[var(--tf-fg-warning)]">
                            {CONCERN_LABELS[c.type] ?? c.type}
                          </span>
                        ))}
                      </div>
                    )}

                    {canAct && (
                      <div className="pl-10 space-y-2 pt-1">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRoleStatus(m.userId, "accepted")}
                            disabled={updatingRole}
                            className="flex-1 h-8 rounded-r2 bg-[var(--tf-bg-positive-weak)] text-[var(--tf-fg-positive)] text-[12px] font-semibold hover:opacity-80 cursor-pointer transition-opacity disabled:opacity-50 flex items-center justify-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> 수락
                          </button>
                          <button
                            onClick={() =>
                              setAdjustmentInput((prev) => ({
                                ...prev,
                                [m.userId]: prev[m.userId] === undefined ? "" : "",
                              }))
                            }
                            disabled={updatingRole}
                            className="flex-1 h-8 rounded-r2 bg-[var(--tf-bg-warning-weak)] text-[var(--tf-fg-warning)] text-[12px] font-semibold hover:opacity-80 cursor-pointer transition-opacity disabled:opacity-50 flex items-center justify-center gap-1"
                          >
                            <RefreshCw className="w-3.5 h-3.5" /> 조정 요청
                          </button>
                        </div>
                        {adjustmentInput[m.userId] !== undefined && (
                          <div className="flex gap-2">
                            <input
                              value={adjustmentInput[m.userId]}
                              onChange={(e) =>
                                setAdjustmentInput((prev) => ({ ...prev, [m.userId]: e.target.value }))
                              }
                              placeholder="원하는 역할을 입력하세요 (최대 100자)"
                              maxLength={100}
                              className="flex-1 h-8 px-2.5 rounded-r2 border border-[var(--tf-stroke-neutral)] bg-[var(--tf-bg-layer-default)] text-[12px] text-[var(--tf-fg-default)] focus:outline-none focus:border-[var(--tf-stroke-brand)]"
                            />
                            <button
                              onClick={() => {
                                const alt = adjustmentInput[m.userId]?.trim();
                                if (!alt) return;
                                handleRoleStatus(m.userId, "adjustment_requested", alt);
                                setAdjustmentInput((prev) => {
                                  const n = { ...prev };
                                  delete n[m.userId];
                                  return n;
                                });
                              }}
                              disabled={!adjustmentInput[m.userId]?.trim() || updatingRole}
                              className="h-8 px-3 rounded-r2 bg-[var(--tf-bg-warning-weak)] text-[var(--tf-fg-warning)] text-[12px] font-semibold hover:opacity-80 cursor-pointer disabled:opacity-50"
                            >
                              제출
                            </button>
                            <button
                              onClick={() =>
                                setAdjustmentInput((prev) => {
                                  const n = { ...prev };
                                  delete n[m.userId];
                                  return n;
                                })
                              }
                              className="h-8 px-2 rounded-r2 text-[12px] text-[var(--tf-fg-muted)] hover:bg-[var(--tf-bg-neutral-weak)] cursor-pointer"
                            >
                              취소
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 우려 입력 (본인, 옵저버 제외) */}
            {!isObserver && !hasSigned && (
              <div className="mt-4 pt-4 border-t border-[var(--tf-stroke-neutral)]">
                <p className="text-[12px] font-semibold text-[var(--tf-fg-muted)] mb-2">
                  <MessageSquare className="w-3.5 h-3.5 inline mr-1" />
                  우려 표시 (선택)
                </p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {Object.entries(CONCERN_LABELS).map(([type, label]) => (
                    <button
                      key={type}
                      onClick={() =>
                        setMyConcerns(
                          myConcerns.includes(type)
                            ? myConcerns.filter((c) => c !== type)
                            : [...myConcerns, type],
                        )
                      }
                      className="text-[12px] px-2.5 py-1 rounded-full border transition-colors cursor-pointer"
                      style={
                        myConcerns.includes(type)
                          ? { backgroundColor: "var(--tf-bg-warning-weak)", color: "var(--tf-fg-warning)", borderColor: "var(--tf-fg-warning)" }
                          : { backgroundColor: "var(--tf-bg-neutral-weak)", color: "var(--tf-fg-muted)", borderColor: "var(--tf-stroke-neutral)" }
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {myConcerns.length > 0 && (
                  <button
                    onClick={handleSaveConcerns}
                    disabled={savingConcerns}
                    className="h-8 px-4 rounded-r2 bg-[var(--tf-bg-brand-solid)] text-[var(--tf-fg-neutral-inverted)] text-[12px] font-semibold hover:bg-[var(--tf-bg-brand-solid-pressed)] cursor-pointer transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {savingConcerns ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "우려 저장"}
                  </button>
                )}
              </div>
            )}
          </SectionCard>

          {/* ── Batch C: AI 산출물 ── */}
          <SectionCard
            icon={<Sparkles className="w-5 h-5 text-[var(--tf-fg-brand)]" />}
            title="AI 산출물"
          >
            {artifacts.length === 0 ? (
              <div className="space-y-3">
                <p className="text-[13px] text-[var(--tf-fg-muted)]">
                  팀 정보와 성공 기준을 바탕으로 첫 Issue, 회의 안건, Mini ADR을 자동 생성합니다.
                </p>
                {isLeader && (
                  <button
                    onClick={handleGenerate}
                    disabled={generating || !sess.successCriteria?.some(Boolean)}
                    className="w-full h-10 rounded-r2 bg-[var(--tf-bg-brand-solid)] text-[var(--tf-fg-neutral-inverted)] text-[13px] font-semibold hover:bg-[var(--tf-bg-brand-solid-pressed)] cursor-pointer transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {generating ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> 생성 중...</>
                    ) : (
                      <><Sparkles className="w-4 h-4" /> 산출물 자동 생성</>
                    )}
                  </button>
                )}
                {isLeader && !sess.successCriteria?.some(Boolean) && (
                  <p className="text-[11px] text-[var(--tf-fg-warning)]">
                    <AlertTriangle className="w-3 h-3 inline mr-1" />
                    성공 기준을 먼저 입력해야 생성할 수 있어요
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {isLeader && (
                  <div className="flex justify-end">
                    <button
                      onClick={handleGenerate}
                      disabled={generating}
                      className="flex items-center gap-1.5 text-[12px] text-[var(--tf-fg-brand)] hover:underline cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      재생성
                    </button>
                  </div>
                )}
                {artifacts.map((artifact) => (
                  <ArtifactCard
                    key={artifact.id}
                    artifact={artifact}
                    open={!!artifactsOpen[artifact.id]}
                    onToggle={() => setArtifactsOpen((p) => ({ ...p, [artifact.id]: !p[artifact.id] }))}
                  />
                ))}
              </div>
            )}
          </SectionCard>

          {/* ── Mermaid 다이어그램 ── */}
          {sess.mermaidDiagram && (
            <SectionCard icon={null} title="프로젝트 다이어그램">
              <DiagramViewer code={sess.mermaidDiagram} />
            </SectionCard>
          )}

          {/* ── Batch D: 서명 + 완료 ── */}
          {!isObserver && (
            <div className="space-y-3">
              {hasSigned ? (
                <div className="flex items-center gap-2 px-4 py-3 rounded-r2 bg-[var(--tf-bg-positive-weak)]">
                  <CheckCircle2 className="w-4 h-4 text-[var(--tf-fg-positive)]" />
                  <p className="text-[13px] font-semibold text-[var(--tf-fg-positive)]">서명 완료</p>
                </div>
              ) : (
                <button
                  onClick={handleSign}
                  disabled={signing}
                  className="w-full h-12 rounded-r3 bg-[var(--tf-bg-brand-solid)] text-[var(--tf-fg-neutral-inverted)] text-[15px] font-semibold hover:bg-[var(--tf-bg-brand-solid-pressed)] transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {signing ? <Loader2 className="w-5 h-5 animate-spin" /> : <><PenLine className="w-5 h-5" /> 역할과 계획에 동의합니다 (서명)</>}
                </button>
              )}

              {isLeader && allSigned && (
                <button
                  onClick={handleFinalize}
                  disabled={confirming}
                  className="w-full h-12 rounded-r3 border-2 border-[var(--tf-stroke-brand)] text-[var(--tf-fg-brand)] text-[15px] font-semibold hover:bg-[var(--tf-bg-brand-weak)] transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {confirming ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-5 h-5" /> 킥오프 완료</>}
                </button>
              )}

              {isLeader && !allSigned && (
                <p className="text-[12px] text-[var(--tf-fg-muted)] text-center">
                  전원 서명 완료 후 킥오프를 완료할 수 있어요 ({signedCount}/{nonObservers.length})
                </p>
              )}
            </div>
          )}

          {isObserver && (
            <div className="flex items-start gap-3 px-4 py-3.5 rounded-r2 bg-[var(--tf-bg-neutral-weak)]">
              <Eye className="w-4 h-4 text-[var(--tf-fg-neutral)] shrink-0 mt-0.5" />
              <div>
                <p className="text-[13px] font-bold text-[var(--tf-fg-neutral)]">팀원들이 최종 확인 중이에요</p>
                <p className="text-[12px] text-[var(--tf-fg-muted)] mt-0.5">킥오프가 완료되면 자동으로 알려드려요.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function SectionCard({
  icon,
  title,
  action,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[var(--tf-bg-layer-default)] rounded-r3 border border-[var(--tf-stroke-neutral)] p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-[16px] font-semibold text-[var(--tf-fg-default)]">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

const ARTIFACT_META: Record<string, { label: string; icon: React.ReactNode }> = {
  first_issues: { label: "첫 번째 Issue 세트", icon: <FileText className="w-4 h-4 text-[var(--tf-fg-brand)]" /> },
  first_agenda: { label: "첫 회의 안건",        icon: <Calendar className="w-4 h-4 text-[var(--tf-fg-brand)]" /> },
  mini_adrs:    { label: "Mini ADR",            icon: <BookOpen className="w-4 h-4 text-[var(--tf-fg-brand)]" /> },
};

function ArtifactCard({
  artifact,
  open,
  onToggle,
}: {
  artifact: Artifact;
  open: boolean;
  onToggle: () => void;
}) {
  const meta = ARTIFACT_META[artifact.artifactType] ?? { label: artifact.artifactType, icon: null };
  const content = artifact.content as Record<string, unknown>;

  return (
    <div className="rounded-r2 border border-[var(--tf-stroke-neutral)] overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-[var(--tf-bg-neutral-weak)] hover:bg-[var(--tf-bg-neutral)] transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          {meta.icon}
          <span className="text-[13px] font-semibold text-[var(--tf-fg-default)]">{meta.label}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-[var(--tf-fg-muted)]" /> : <ChevronDown className="w-4 h-4 text-[var(--tf-fg-muted)]" />}
      </button>

      {open && (
        <div className="p-4 space-y-3">
          {artifact.artifactType === "first_issues" && (
            <ul className="space-y-2">
              {((content.issues ?? []) as Array<{ title: string; description: string; category: string; estimatedHours?: number }>).map((issue, i) => (
                <li key={i} className="p-3 rounded-r2 bg-[var(--tf-bg-neutral-weak)] space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[13px] font-semibold text-[var(--tf-fg-default)]">{issue.title}</p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--tf-bg-informative-weak)] text-[var(--tf-fg-informative)] shrink-0">
                      {issue.category}
                    </span>
                  </div>
                  <p className="text-[12px] text-[var(--tf-fg-muted)]">{issue.description}</p>
                  {issue.estimatedHours && (
                    <p className="text-[11px] text-[var(--tf-fg-subtle)]">예상 {issue.estimatedHours}시간</p>
                  )}
                </li>
              ))}
            </ul>
          )}

          {artifact.artifactType === "first_agenda" && (
            <div className="space-y-2">
              <p className="text-[13px] font-semibold text-[var(--tf-fg-default)]">{content.meetingTitle as string}</p>
              <p className="text-[11px] text-[var(--tf-fg-muted)]">총 {content.totalMinutes as number}분</p>
              <ul className="space-y-1.5">
                {((content.items ?? []) as Array<{ order: number; title: string; durationMinutes: number; description?: string; owner?: string }>).map((item) => (
                  <li key={item.order} className="flex items-start gap-2 text-[12px]">
                    <span className="text-[var(--tf-fg-muted)] shrink-0 w-5">{item.order}.</span>
                    <div>
                      <span className="text-[var(--tf-fg-default)]">{item.title}</span>
                      <span className="text-[var(--tf-fg-muted)] ml-1.5">({item.durationMinutes}분{item.owner ? ` · ${item.owner}` : ""})</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {artifact.artifactType === "mini_adrs" && (
            <ul className="space-y-3">
              {((content.adrs ?? []) as Array<{ title: string; decision: string; rationale: string; alternatives: string[] }>).map((adr, i) => (
                <li key={i} className="p-3 rounded-r2 bg-[var(--tf-bg-neutral-weak)] space-y-1.5">
                  <p className="text-[13px] font-semibold text-[var(--tf-fg-default)]">{adr.title}</p>
                  <p className="text-[12px] text-[var(--tf-fg-default)]"><span className="text-[var(--tf-fg-muted)]">결정: </span>{adr.decision}</p>
                  <p className="text-[12px] text-[var(--tf-fg-default)]"><span className="text-[var(--tf-fg-muted)]">이유: </span>{adr.rationale}</p>
                  {adr.alternatives.length > 0 && (
                    <p className="text-[11px] text-[var(--tf-fg-muted)]">검토한 대안: {adr.alternatives.join(", ")}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
