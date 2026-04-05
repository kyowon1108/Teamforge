"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Loader2,
  Send,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  Layers,
  Pencil,
  X,
  Check,
  RefreshCw,
  RotateCcw,
  AlertTriangle,
  Target,
  Eye,
  ChevronDown,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import DiagramViewer from "@/components/DiagramViewer";
import KickoffReadOnlyBanner from "@/components/KickoffReadOnlyBanner";
import { useKickoffRole } from "../kickoff-context";
import { useKickoffChannel } from "@/hooks/useKickoffChannel";
import { PLATFORM_PRESETS, type PlatformPresetKey } from "@teamforge/contracts";

// ─── Types ────────────────────────────────────────────────────────────────────

type OptionItem = { name: string; reason: string; isPrimary: boolean };
type OptionCard = { category: string; label: string; options: OptionItem[] };

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  mermaidCode?: string | null;
  stackUpdate?: Record<string, string> | null;
  optionCards?: OptionCard[] | null;
  createdAt: string;
};

type SessionData = {
  topicTitle: string | null;
  topicDescription: string | null;
  platformType: string | null;
  architecture: Record<string, string> | null;
  mermaidDiagram: string | null;
  complexity: string | null;
};

const ARCH_CATEGORY_MAP: Record<string, string> = {
  framework: "Framework",
  styling: "Styling",
  realtime: "Realtime",
  api: "API",
  server: "Server",
  db: "DB/ORM",
  auth: "Auth",
  state: "State",
};

const DEFAULT_APPLICABLE = Object.keys(ARCH_CATEGORY_MAP);

// ─── Architecture Progress Rail ───────────────────────────────────────────────

function ArchitectureProgressRail({
  applicableCategories,
  architecture,
  currentCategoryKey,
}: {
  applicableCategories: string[];
  architecture: Record<string, string>;
  currentCategoryKey: string | null;
}) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {applicableCategories.map((key, idx) => {
        const label = ARCH_CATEGORY_MAP[key] ?? key;
        const decided = !!architecture[key];
        const isCurrent = key === currentCategoryKey;
        return (
          <div key={key} className="flex items-center gap-1.5">
            {idx > 0 && <div className="w-3 h-px bg-[var(--tf-stroke-neutral)]" />}
            <div
              className={`flex items-center gap-1 h-6 px-2 rounded-full text-[10px] font-medium transition-colors ${
                decided
                  ? "bg-[var(--tf-bg-positive-weak)] text-[var(--tf-fg-positive)] border border-[var(--tf-stroke-positive-weak)]"
                  : isCurrent
                  ? "bg-[var(--tf-bg-brand-weak)] text-[var(--tf-fg-brand)] border border-[var(--tf-stroke-brand)]"
                  : "bg-transparent text-[var(--tf-fg-subtle)] border border-[var(--tf-stroke-neutral-muted)]"
              }`}
            >
              {decided && <CheckCircle2 className="w-3 h-3" />}
              {label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function stripMermaidBlock(text: string): string {
  return text.replace(/```mermaid[\s\S]*?```/g, "").trim();
}

function getPresetOptions(
  platformType: string | null,
  catKey: string,
): { primary: string; secondary: string; options: string[] } | null {
  if (!platformType) return null;
  const preset = (PLATFORM_PRESETS as Record<string, (typeof PLATFORM_PRESETS)[PlatformPresetKey]>)[platformType];
  if (!preset) return null;
  return (preset.stacks as Record<string, { primary: string; secondary: string; options: string[] }>)[catKey] ?? null;
}

// ─── Option Card Group Component ─────────────────────────────────────────────

function OptionCardGroup({
  card,
  selected,
  onSelect,
  disabled,
}: {
  card: OptionCard;
  selected: string | undefined;
  onSelect: (catKey: string, catLabel: string, name: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="mt-3 first:mt-0">
      <p className="text-[11px] font-semibold text-[var(--tf-fg-muted)] uppercase tracking-wide mb-1.5">
        {card.label}
      </p>
      <div className="space-y-1.5">
        {card.options.map((opt) => {
          const isSelected = selected === opt.name;
          return (
            <button
              key={opt.name}
              onClick={() => !disabled && onSelect(card.category, card.label, opt.name)}
              disabled={disabled}
              className={`
                w-full text-left px-3 py-2.5 rounded-r2 border transition-all cursor-pointer
                flex items-start gap-3 min-h-[52px]
                ${isSelected
                  ? "bg-[var(--tf-bg-brand-weak)] border-[var(--tf-stroke-brand)] shadow-sm"
                  : "bg-[var(--tf-bg-layer-default)] border-[var(--tf-stroke-neutral)] hover:border-[var(--tf-stroke-brand)] hover:bg-[var(--tf-bg-neutral-weak)]"
                }
                ${disabled ? "opacity-50 cursor-not-allowed" : ""}
              `}
            >
              {/* Left: check indicator */}
              <div className={`
                w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center transition-colors
                ${isSelected
                  ? "bg-[var(--tf-bg-brand-solid)] border-[var(--tf-stroke-brand)]"
                  : "border-[var(--tf-stroke-neutral-muted)]"
                }
              `}>
                {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
              </div>

              {/* Right: name + reason */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-[13px] font-semibold ${isSelected ? "text-[var(--tf-fg-brand)]" : "text-[var(--tf-fg-default)]"}`}>
                    {opt.name}
                  </span>
                  {opt.isPrimary && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[var(--tf-bg-brand-weak)] text-[var(--tf-fg-brand)] border border-[var(--tf-stroke-brand-weak)] leading-none">
                      추천
                    </span>
                  )}
                </div>
                {opt.reason && (
                  <p className="text-[12px] text-[var(--tf-fg-muted)] mt-0.5 leading-relaxed">
                    {opt.reason}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ArchitecturePage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params.teamId as string;
  const { data: session, status } = useSession();
  const { viewerRole } = useKickoffRole();
  const isReadOnly = viewerRole !== "leader";

  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [mermaidCode, setMermaidCode] = useState<string | null>(null);
  const [architecture, setArchitecture] = useState<Record<string, string>>({});
  const [applicableCategories, setApplicableCategories] = useState<string[]>(DEFAULT_APPLICABLE);
  const [teamLevel, setTeamLevel] = useState<"beginner" | "intermediate" | "advanced" | "unknown">("unknown");
  const [submitting, setSubmitting] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [resetting, setResetting] = useState(false);
  const [openPopover, setOpenPopover] = useState<string | null>(null);
  // Pending mermaid from AI — only applied when user explicitly requests diagram update
  const [pendingMermaidCode, setPendingMermaidCode] = useState<string | null>(null);
  // Flag: next AI response's mermaid will be applied to the main diagram
  const diagramUpdateMode = useRef(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ── Load ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (status !== "authenticated") return;
    const token = session?.teamforgeToken ?? session?.user?.teamforgeToken;
    if (token) apiClient.setToken(token);

    Promise.all([
      apiClient.get<SessionData>(`/kickoff/${teamId}`),
      apiClient.get<ChatMessage[]>(`/kickoff/${teamId}/chat/architecture`),
      apiClient.get<{ applicableCategories: string[]; teamLevel: string }>(`/kickoff/${teamId}/architecture/plan`).catch(() => null),
    ])
      .then(([sess, chat, plan]) => {
        setSessionData(sess);
        if (sess.architecture) setArchitecture(sess.architecture);
        if (sess.mermaidDiagram) setMermaidCode(sess.mermaidDiagram);
        if (plan?.applicableCategories?.length) setApplicableCategories(plan.applicableCategories);
        if (plan?.teamLevel) setTeamLevel(plan.teamLevel as "beginner" | "intermediate" | "advanced" | "unknown");
        if (chat.length > 0) {
          setMessages(chat);
          const lastMermaid = [...chat].reverse().find((m) => m.mermaidCode);
          if (lastMermaid?.mermaidCode) setPendingMermaidCode(lastMermaid.mermaidCode);
        }
      })
      .catch(() => setLoadError(true))
      .finally(() => setPageLoading(false));
  }, [status, session?.teamforgeToken, session?.user?.teamforgeToken, teamId]);

  // ── Auto-seed ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (pageLoading || isReadOnly || messages.length > 0 || seeding) return;
    setSeeding(true);
    apiClient
      .post<{ seeded: boolean; message?: ChatMessage; applicableCategories?: string[]; teamLevel?: string }>(`/kickoff/${teamId}/architecture/seed`, {})
      .then((res) => {
        if (res.applicableCategories?.length) setApplicableCategories(res.applicableCategories);
        if (res.teamLevel) setTeamLevel(res.teamLevel as "beginner" | "intermediate" | "advanced" | "unknown");
        if (res.seeded && res.message) {
          setMessages([res.message]);
          if (res.message.mermaidCode) setPendingMermaidCode(res.message.mermaidCode);
          if (res.message.stackUpdate) {
            setArchitecture((prev) => ({ ...res.message!.stackUpdate!, ...prev }));
          }
        }
      })
      .catch(() => {})
      .finally(() => setSeeding(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageLoading]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, seeding]);

  // ── Popover outside click ───────────────────────────────────────────────────

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpenPopover(null);
      }
    }
    if (openPopover) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [openPopover]);

  // ── Real-time sync ──────────────────────────────────────────────────────────

  useKickoffChannel({
    teamId,
    onEvent: useCallback((event) => {
      if (!isReadOnly) return;
      if (event.type === "kickoff:chat_updated" && event.phase === "architecture") {
        apiClient
          .get<ChatMessage[]>(`/kickoff/${teamId}/chat/architecture`)
          .then((data) => {
            setMessages(data);
            const last = [...data].reverse().find((m) => m.mermaidCode);
            if (last?.mermaidCode) setPendingMermaidCode(last.mermaidCode);
          })
          .catch(() => {});
      } else if (event.type === "kickoff:chat_reset" && event.phase === "architecture") {
        setMessages([]);
      } else if (event.type === "kickoff:phase_changed" && event.phase === "summary") {
        router.push(`/team/${teamId}/kickoff/summary`);
      } else if (event.type === "kickoff:phase_changed" && event.phase === "topic_decision") {
        // Leader reverted to topic phase — all viewers follow
        router.push(`/team/${teamId}/kickoff/topic`);
      } else if (event.type === "kickoff:completed") {
        router.push(`/team/${teamId}/kickoff/summary`);
      }
    }, [isReadOnly, teamId, router]),
  });

  // ── Send message ────────────────────────────────────────────────────────────

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || chatLoading) return;
      const userMsg = text.trim();
      setInput("");
      setChatLoading(true);

      const tempId = `temp-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        { id: tempId, role: "user", content: userMsg, createdAt: new Date().toISOString() },
      ]);

      try {
        const res = await apiClient.post<{ message: ChatMessage }>(
          `/kickoff/${teamId}/chat`,
          { message: userMsg, phase: "architecture" },
        );
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== tempId),
          { id: tempId, role: "user", content: userMsg, createdAt: new Date().toISOString() },
          res.message,
        ]);
        if (res.message.mermaidCode) {
          if (diagramUpdateMode.current) {
            setMermaidCode(res.message.mermaidCode);
            diagramUpdateMode.current = false;
            setPendingMermaidCode(null);
          } else {
            setPendingMermaidCode(res.message.mermaidCode);
          }
        }
        if (res.message.stackUpdate) {
          setArchitecture((prev) => ({ ...prev, ...res.message.stackUpdate! }));
        }
      } catch {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      } finally {
        setChatLoading(false);
        inputRef.current?.focus();
      }
    },
    [chatLoading, teamId],
  );

  // ── Option card select ──────────────────────────────────────────────────────

  function handleOptionSelect(catKey: string, catLabel: string, name: string) {
    const wasAlreadySelected = architecture[catKey] === name;
    setArchitecture((prev) => {
      if (wasAlreadySelected) {
        const next = { ...prev };
        delete next[catKey];
        return next;
      }
      return { ...prev, [catKey]: name };
    });
    if (!isReadOnly && !wasAlreadySelected) {
      sendMessage(`${catLabel}은(는) "${name}"으로 선택할게요.`);
    }
  }

  // ── Chip popover direct select ──────────────────────────────────────────────

  function handleChipDirectSelect(catKey: string, catLabel: string, value: string) {
    setArchitecture((prev) => ({ ...prev, [catKey]: value }));
    setOpenPopover(null);
    if (!isReadOnly) {
      sendMessage(`${catLabel}을(를) "${value}"로 직접 선택했습니다. 이 선택에 맞게 나머지 스택 추천을 업데이트해줘.`);
    }
  }

  // ── Save / Reset ────────────────────────────────────────────────────────────

  async function handleSaveArchitecture() {
    const decidedCount = Object.values(architecture).filter(Boolean).length;
    if (decidedCount === 0) return;
    setSubmitting(true);
    try {
      await apiClient.post(`/kickoff/${teamId}/architecture`, { architecture });
      router.push(`/team/${teamId}/kickoff/summary`);
    } catch {
      toast.error("아키텍처 저장에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetChat() {
    if (!confirm("채팅을 초기화하시겠습니까? 모든 대화 내용이 삭제됩니다.")) return;
    setResetting(true);
    try {
      const res = await apiClient.delete<{ mermaidDiagram: string | null }>(
        `/kickoff/${teamId}/chat/architecture`,
      );
      setMessages([]);
      setMermaidCode(res.mermaidDiagram ?? null);
    } catch (err: unknown) {
      const code = (err as { statusCode?: number })?.statusCode;
      // 404 = session already gone — just clear local state
      if (code === 404) {
        setMessages([]);
      } else {
        toast.error("채팅 초기화에 실패했습니다.");
      }
    } finally {
      setResetting(false);
    }
  }

  // ── Loading / Error states ──────────────────────────────────────────────────

  if (pageLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[var(--tf-bg-layer-alt)]">
        <Loader2 className="w-8 h-8 text-[var(--tf-fg-brand)] animate-spin" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[var(--tf-bg-layer-alt)] px-4">
        <div className="text-center space-y-4">
          <AlertTriangle className="w-10 h-10 text-[var(--tf-fg-warning)] mx-auto" />
          <p className="text-[15px] text-[var(--tf-fg-default)]">세션을 불러올 수 없어요</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push(`/team/${teamId}/kickoff/topic`)}
              className="h-10 px-5 rounded-r2 border border-[var(--tf-stroke-neutral)] text-[13px] text-[var(--tf-fg-muted)] hover:bg-[var(--tf-bg-neutral-weak)] transition-colors cursor-pointer"
            >
              주제 선정으로
            </button>
            <button
              onClick={() => window.location.reload()}
              className="h-10 px-5 rounded-r2 bg-[var(--tf-bg-brand-solid)] text-[var(--tf-fg-neutral-inverted)] text-[13px] transition-colors cursor-pointer"
            >
              다시 시도
            </button>
          </div>
        </div>
      </div>
    );
  }

  const decidedCount = Object.values(architecture).filter(Boolean).length;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="h-[calc(100dvh-3rem)] bg-[var(--tf-bg-layer-alt)] flex flex-col overflow-hidden">
      {isReadOnly && <KickoffReadOnlyBanner />}

      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-[var(--tf-bg-layer-default)] border-b border-[var(--tf-stroke-neutral)] px-4 py-3">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/team/${teamId}/kickoff/topic`)}
              aria-label="주제 선정으로 돌아가기"
              className="w-8 h-8 rounded-r2 flex items-center justify-center hover:bg-[var(--tf-bg-neutral-weak)] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-[var(--tf-fg-muted)]" />
            </button>
            <div>
              <h1 className="text-[15px] font-semibold text-[var(--tf-fg-default)]">기술 아키텍처 설계</h1>
              <p className="text-[11px] text-[var(--tf-fg-muted)]">
                {sessionData?.topicTitle ?? "프로젝트"} &mdash; 기술 스택을 결정해요
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isReadOnly && messages.length > 0 && (
              <button
                onClick={handleResetChat}
                disabled={resetting || chatLoading}
                aria-label="채팅 초기화"
                className="h-9 px-3 rounded-r2 border border-[var(--tf-stroke-neutral)] text-[12px] text-[var(--tf-fg-muted)] hover:border-[var(--tf-stroke-critical-weak)] hover:text-[var(--tf-fg-critical)] transition-colors cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
              >
                {resetting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                초기화
              </button>
            )}
            {!isReadOnly && (
              <button
                onClick={handleSaveArchitecture}
                disabled={decidedCount === 0 || submitting}
                className="h-9 px-4 rounded-r2 bg-[var(--tf-bg-brand-solid)] text-[var(--tf-fg-neutral-inverted)] text-[13px] font-medium hover:bg-[var(--tf-bg-brand-solid-pressed)] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {submitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    확정 ({decidedCount}/{applicableCategories.length})
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Category chips with popover */}
      <div
        ref={popoverRef}
        className="bg-[var(--tf-bg-layer-default)] border-b border-[var(--tf-stroke-neutral)] px-4 py-2 overflow-x-auto relative"
      >
        <div className="max-w-[1200px] mx-auto flex gap-2">
          {applicableCategories.map((catKey) => {
            const cat = { key: catKey, label: ARCH_CATEGORY_MAP[catKey] ?? catKey };
            const decided = !!architecture[cat.key];
            const isOpen = openPopover === cat.key;
            const presetOpts = getPresetOptions(sessionData?.platformType ?? null, cat.key);

            return (
              <div key={cat.key} className="relative shrink-0">
                <button
                  onClick={() => setOpenPopover(isOpen ? null : cat.key)}
                  className={`h-8 px-3 rounded-full text-[12px] font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                    decided
                      ? "bg-[var(--tf-bg-positive-weak)] text-[var(--tf-fg-positive)] border border-[var(--tf-stroke-positive-weak)]"
                      : isOpen
                      ? "bg-[var(--tf-bg-brand-weak)] text-[var(--tf-fg-brand)] border border-[var(--tf-stroke-brand)]"
                      : "bg-[var(--tf-bg-neutral-weak)] text-[var(--tf-fg-muted)] border border-[var(--tf-stroke-neutral)] hover:border-[var(--tf-stroke-brand)]"
                  }`}
                >
                  {decided && <CheckCircle2 className="w-3 h-3" />}
                  {cat.label}
                  {architecture[cat.key] && (
                    <span className="text-[10px] opacity-70">· {architecture[cat.key]}</span>
                  )}
                  <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>

                {isOpen && (
                  <div className="absolute top-full left-0 mt-1.5 z-50 bg-[var(--tf-bg-layer-floating)] border border-[var(--tf-stroke-neutral)] rounded-r2 shadow-lg min-w-[200px] max-w-[280px] py-2">
                    {presetOpts ? (
                      <>
                        <p className="px-3 pb-1.5 text-[10px] text-[var(--tf-fg-subtle)] font-medium uppercase tracking-wide">추천 옵션</p>
                        <button
                          onClick={() => handleChipDirectSelect(cat.key, cat.label, presetOpts.primary)}
                          className="w-full px-3 py-2 text-left text-[13px] text-[var(--tf-fg-default)] hover:bg-[var(--tf-bg-neutral-weak)] flex items-center justify-between gap-2 cursor-pointer"
                        >
                          <span className="font-medium">{presetOpts.primary}</span>
                          <span className="text-[10px] text-[var(--tf-fg-brand)] bg-[var(--tf-bg-brand-weak)] px-1.5 py-0.5 rounded-full shrink-0">1순위</span>
                        </button>
                        <button
                          onClick={() => handleChipDirectSelect(cat.key, cat.label, presetOpts.secondary)}
                          className="w-full px-3 py-2 text-left text-[13px] text-[var(--tf-fg-default)] hover:bg-[var(--tf-bg-neutral-weak)] flex items-center justify-between gap-2 cursor-pointer"
                        >
                          <span>{presetOpts.secondary}</span>
                          <span className="text-[10px] text-[var(--tf-fg-muted)] bg-[var(--tf-bg-neutral-weak)] px-1.5 py-0.5 rounded-full shrink-0">2순위</span>
                        </button>
                        <div className="mx-3 my-1.5 border-t border-[var(--tf-stroke-neutral)]" />
                        <p className="px-3 pb-1 text-[10px] text-[var(--tf-fg-subtle)] font-medium uppercase tracking-wide">기타</p>
                        {presetOpts.options
                          .filter((o) => o !== presetOpts.primary && o !== presetOpts.secondary)
                          .map((opt) => (
                            <button
                              key={opt}
                              onClick={() => handleChipDirectSelect(cat.key, cat.label, opt)}
                              className="w-full px-3 py-1.5 text-left text-[12px] text-[var(--tf-fg-muted)] hover:bg-[var(--tf-bg-neutral-weak)] hover:text-[var(--tf-fg-default)] cursor-pointer"
                            >
                              {opt}
                            </button>
                          ))}
                      </>
                    ) : (
                      <button
                        onClick={() => { setOpenPopover(null); sendMessage(`${cat.label}에 대해 팀에 맞는 옵션을 추천해줘.`); }}
                        className="w-full px-3 py-2 text-left text-[13px] text-[var(--tf-fg-brand)] hover:bg-[var(--tf-bg-brand-weak)] flex items-center gap-2 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        AI에게 추천 받기
                      </button>
                    )}
                    <div className="mx-3 my-1.5 border-t border-[var(--tf-stroke-neutral)]" />
                    <button
                      onClick={() => { setOpenPopover(null); sendMessage(`${cat.label}에 대해 더 자세히 비교해줘.`); }}
                      className="w-full px-3 py-1.5 text-left text-[12px] text-[var(--tf-fg-muted)] hover:bg-[var(--tf-bg-neutral-weak)] flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" />
                      AI에게 자세히 물어보기
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex max-w-[1200px] mx-auto w-full min-h-0">

        {/* Left panel: stack decisions + diagram (desktop) */}
        <div className="hidden lg:flex lg:w-[38%] xl:w-[40%] max-w-[500px] border-r border-[var(--tf-stroke-neutral)] bg-[var(--tf-bg-layer-default)] flex-col min-h-0">
          {sessionData?.topicTitle && (
            <div className="p-4 border-b border-[var(--tf-stroke-neutral)] shrink-0">
              <div className="flex items-center gap-2 mb-1.5">
                <Target className="w-3.5 h-3.5 text-[var(--tf-fg-brand)]" />
                <span className="text-[11px] font-medium text-[var(--tf-fg-muted)]">프로젝트 주제</span>
              </div>
              <p className="text-[13px] font-semibold text-[var(--tf-fg-default)]">{sessionData.topicTitle}</p>
              {sessionData.topicDescription && (
                <p className="text-[11px] text-[var(--tf-fg-muted)] mt-1 line-clamp-2">{sessionData.topicDescription}</p>
              )}
            </div>
          )}

          <div className="p-4 border-b border-[var(--tf-stroke-neutral)] space-y-2 shrink-0">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[var(--tf-fg-brand)]" />
                <h2 className="text-[13px] font-semibold text-[var(--tf-fg-default)]">선택된 스택</h2>
              </div>
              {teamLevel !== "unknown" && (
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                  teamLevel === "beginner" ? "bg-[var(--tf-bg-info-weak)] text-[var(--tf-fg-info)] border-[var(--tf-stroke-info-weak)]"
                  : teamLevel === "advanced" ? "bg-[var(--tf-bg-brand-weak)] text-[var(--tf-fg-brand)] border-[var(--tf-stroke-brand-weak)]"
                  : "bg-[var(--tf-bg-neutral-weak)] text-[var(--tf-fg-muted)] border-[var(--tf-stroke-neutral)]"
                }`}>
                  {{ beginner: "입문", intermediate: "중급", advanced: "고급" }[teamLevel]}
                </span>
              )}
            </div>
            <div className="space-y-1">
              {applicableCategories.map((catKey) => {
                const cat = { key: catKey, label: ARCH_CATEGORY_MAP[catKey] ?? catKey };
                const isEditing = editingKey === cat.key;
                const value = architecture[cat.key];
                return (
                  <div
                    key={cat.key}
                    className="flex items-center justify-between text-[12px] py-1.5 px-2 rounded-r1 group hover:bg-[var(--tf-bg-neutral-weak)] transition-colors"
                  >
                    <span className="text-[var(--tf-fg-muted)]">{cat.label}</span>
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <input
                          autoFocus
                          type="text"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") { setArchitecture((p) => ({ ...p, [cat.key]: editingValue.trim() })); setEditingKey(null); }
                            if (e.key === "Escape") setEditingKey(null);
                          }}
                          className="w-[120px] h-6 px-1.5 rounded-r1 border border-[var(--tf-stroke-brand)] text-[12px] text-right text-[var(--tf-fg-default)] focus:outline-none bg-[var(--tf-bg-layer-default)]"
                        />
                        <button onClick={() => { setArchitecture((p) => ({ ...p, [cat.key]: editingValue.trim() })); setEditingKey(null); }} aria-label="확인" className="w-5 h-5 rounded flex items-center justify-center text-[var(--tf-fg-positive)] hover:bg-[var(--tf-bg-positive-weak)] cursor-pointer"><Check className="w-3 h-3" /></button>
                        <button onClick={() => setEditingKey(null)} aria-label="취소" className="w-5 h-5 rounded flex items-center justify-center text-[var(--tf-fg-muted)] hover:bg-[var(--tf-bg-neutral-weak)] cursor-pointer"><X className="w-3 h-3" /></button>
                      </div>
                    ) : (
                      <button onClick={() => { setEditingKey(cat.key); setEditingValue(value ?? ""); }} className="flex items-center gap-1.5 cursor-pointer">
                        {value ? <span className="text-[var(--tf-fg-default)] font-medium">{value}</span> : <span className="text-[var(--tf-fg-subtle)]">미정</span>}
                        <Pencil className="w-3 h-3 text-[var(--tf-fg-subtle)] opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Progress rail */}
          <div className="px-4 py-3 border-b border-[var(--tf-stroke-neutral)] shrink-0">
            <p className="text-[10px] font-medium text-[var(--tf-fg-subtle)] uppercase tracking-wide mb-2">진행 단계</p>
            <ArchitectureProgressRail
              applicableCategories={applicableCategories}
              architecture={architecture}
              currentCategoryKey={applicableCategories.find((k) => !architecture[k]) ?? null}
            />
          </div>

          {(mermaidCode || pendingMermaidCode) && (
            <div className="flex-1 min-h-0 p-4 flex flex-col">
              <div className="flex items-center gap-2 mb-3 shrink-0">
                <h2 className="text-[13px] font-semibold text-[var(--tf-fg-muted)]">아키텍처 다이어그램</h2>
                {pendingMermaidCode && !mermaidCode && (
                  <span className="text-[11px] text-[var(--tf-fg-subtle)] bg-[var(--tf-bg-neutral-weak)] px-2 py-0.5 rounded-full">
                    AI 제안 — 업데이트 버튼으로 적용
                  </span>
                )}
                {pendingMermaidCode && mermaidCode && (
                  <span className="text-[11px] text-[var(--tf-fg-brand)] bg-[var(--tf-bg-brand-weak)] px-2 py-0.5 rounded-full animate-pulse">
                    새 제안 있음
                  </span>
                )}
              </div>
              <DiagramViewer code={mermaidCode ?? pendingMermaidCode!} className="flex-1 min-h-0" />
            </div>
          )}
        </div>

        {/* Chat panel */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">

            {/* Empty / seeding state */}
            {messages.length === 0 && (
              <div className="text-center py-12 space-y-3">
                <div className="w-12 h-12 rounded-full bg-[var(--tf-bg-brand-weak)] flex items-center justify-center mx-auto">
                  {seeding
                    ? <Loader2 className="w-6 h-6 text-[var(--tf-fg-brand)] animate-spin" />
                    : <Sparkles className="w-6 h-6 text-[var(--tf-fg-brand)]" />}
                </div>
                <p className="text-[14px] text-[var(--tf-fg-default)]">
                  {seeding ? "AI가 스택을 분석 중이에요..." : "기술 스택을 정해볼까요?"}
                </p>
                {!seeding && !isReadOnly && (
                  <div className="flex flex-wrap justify-center gap-2 pt-2">
                    {["전체 스택 추천해줘", "우리 팀 스킬에 맞는 조합은?"].map((q) => (
                      <button key={q} onClick={() => sendMessage(q)}
                        className="h-8 px-3 rounded-full border border-[var(--tf-stroke-brand)] text-[12px] text-[var(--tf-fg-brand)] hover:bg-[var(--tf-bg-brand-weak)] transition-colors cursor-pointer">
                        {q}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Messages */}
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[90%] md:max-w-[75%] rounded-r3 px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-[var(--tf-bg-brand-solid)] text-[var(--tf-fg-neutral-inverted)]"
                    : "bg-[var(--tf-bg-layer-default)] border border-[var(--tf-stroke-neutral)] text-[var(--tf-fg-default)]"
                }`}>
                  {msg.role === "assistant" ? (
                    <>
                      {/* Markdown intro text */}
                      {(msg.mermaidCode ? stripMermaidBlock(msg.content) : msg.content).trim() && (
                        <div className="prose prose-sm max-w-none text-[var(--tf-fg-default)] [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_strong]:text-[var(--tf-fg-default)] [&_ul]:pl-4 [&_ol]:pl-4 [&_pre]:bg-[var(--tf-bg-neutral-weak)] [&_pre]:rounded-r1 [&_pre]:p-2">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.mermaidCode ? stripMermaidBlock(msg.content) : msg.content}
                          </ReactMarkdown>
                        </div>
                      )}

                      {/* Interactive option cards */}
                      {msg.optionCards && msg.optionCards.length > 0 && (
                        <div className={`space-y-3 ${(msg.mermaidCode ? stripMermaidBlock(msg.content) : msg.content).trim() ? "mt-4 pt-3 border-t border-[var(--tf-stroke-neutral)]" : ""}`}>
                          {msg.optionCards.map((card) => (
                            <OptionCardGroup
                              key={card.category}
                              card={card}
                              selected={architecture[card.category]}
                              onSelect={handleOptionSelect}
                              disabled={isReadOnly || chatLoading}
                            />
                          ))}
                        </div>
                      )}

                      {/* Mobile mermaid */}
                      {msg.mermaidCode && (
                        <div className="lg:hidden mt-3">
                          <p className="text-[11px] font-medium text-[var(--tf-fg-muted)] mb-1">다이어그램</p>
                          <DiagramViewer code={msg.mermaidCode} />
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
              </div>
            ))}

            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-[var(--tf-bg-layer-default)] border border-[var(--tf-stroke-neutral)] rounded-r3 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[var(--tf-fg-brand)]" />
                    <span className="text-[13px] text-[var(--tf-fg-muted)]">분석 중...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Mobile collapsible panels */}
          <div className="lg:hidden px-4 pb-2 space-y-2">
            <details className="bg-[var(--tf-bg-layer-default)] rounded-r2 border border-[var(--tf-stroke-neutral)]">
              <summary className="px-3 py-2 text-[12px] font-medium text-[var(--tf-fg-muted)] cursor-pointer flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />선택된 스택 ({decidedCount}/{applicableCategories.length})
              </summary>
              <div className="px-3 pb-3 space-y-1">
                {applicableCategories.map((catKey) => (
                  <div key={catKey} className="flex items-center justify-between text-[12px] py-1">
                    <span className="text-[var(--tf-fg-muted)]">{ARCH_CATEGORY_MAP[catKey] ?? catKey}</span>
                    <input
                      type="text"
                      value={architecture[catKey] ?? ""}
                      onChange={(e) => setArchitecture((p) => ({ ...p, [catKey]: e.target.value }))}
                      placeholder="미정"
                      className="w-[140px] h-7 px-2 rounded-r1 border border-[var(--tf-stroke-neutral)] text-[12px] text-right text-[var(--tf-fg-default)] placeholder:text-[var(--tf-fg-subtle)] focus:outline-none focus:border-[var(--tf-stroke-brand)]"
                    />
                  </div>
                ))}
              </div>
            </details>
            {mermaidCode && (
              <details className="bg-[var(--tf-bg-layer-default)] rounded-r2 border border-[var(--tf-stroke-neutral)]">
                <summary className="px-3 py-2 text-[12px] font-medium text-[var(--tf-fg-muted)] cursor-pointer flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />아키텍처 다이어그램
                </summary>
                <div className="px-3 pb-3"><DiagramViewer code={mermaidCode} /></div>
              </details>
            )}
          </div>

          {/* Input bar */}
          <div className="shrink-0 bg-[var(--tf-bg-layer-default)] border-t border-[var(--tf-stroke-neutral)] px-4 py-3">
            {!isReadOnly && messages.length >= 1 && !chatLoading && (
              <div className="max-w-[720px] mx-auto mb-2 flex flex-wrap gap-2">
                {(mermaidCode || pendingMermaidCode) && (
                  <button
                    onClick={() => { diagramUpdateMode.current = true; sendMessage("현재 선택된 스택을 반영해서 아키텍처 다이어그램을 업데이트해줘"); }}
                    className="h-7 px-3 rounded-full border border-[var(--tf-stroke-brand)] text-[11px] text-[var(--tf-fg-brand)] hover:bg-[var(--tf-bg-brand-weak)] transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />다이어그램 업데이트
                  </button>
                )}
                {(() => {
                  const undecided = applicableCategories.filter((k) => !architecture[k]);
                  if (undecided.length === 0 || undecided.length === applicableCategories.length) return null;
                  return (
                    <button
                      onClick={() => sendMessage(`아직 안 정한 ${undecided.map((k) => ARCH_CATEGORY_MAP[k] ?? k).join(", ")} 추천해줘`)}
                      className="h-7 px-3 rounded-full border border-[var(--tf-stroke-neutral)] text-[11px] text-[var(--tf-fg-muted)] hover:border-[var(--tf-stroke-brand)] hover:text-[var(--tf-fg-brand)] transition-colors cursor-pointer"
                    >
                      나머지 {undecided.length}개 추천받기
                    </button>
                  );
                })()}
              </div>
            )}
            {isReadOnly ? (
              <div className="max-w-[720px] mx-auto flex items-center justify-center gap-2 py-2 text-[12px] text-[var(--tf-fg-subtle)]">
                <Eye className="w-3.5 h-3.5" />채팅에 참여하려면 팀장 권한이 필요해요
              </div>
            ) : (
              <div className="max-w-[720px] mx-auto flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
                  placeholder="기술 스택에 대해 질문하세요..."
                  rows={1}
                  className="flex-1 min-h-[44px] max-h-[120px] px-3 py-2.5 rounded-r2 border border-[var(--tf-stroke-neutral)] bg-[var(--tf-bg-layer-default)] text-[14px] text-[var(--tf-fg-default)] placeholder:text-[var(--tf-fg-placeholder)] focus:outline-none focus:border-[var(--tf-stroke-brand)] transition-colors resize-none"
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || chatLoading}
                  aria-label="메시지 전송"
                  className="w-11 h-11 rounded-r2 bg-[var(--tf-bg-brand-solid)] text-[var(--tf-fg-neutral-inverted)] flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--tf-bg-brand-solid-pressed)] transition-colors cursor-pointer shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
