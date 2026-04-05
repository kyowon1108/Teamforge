"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Loader2,
  Send,
  ArrowLeft,
  CheckCircle2,
  FileText,
  MessageSquare,
  ChevronRight,
  Sparkles,
  RotateCcw,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { apiClient } from "@/lib/api-client";
import DiagramViewer from "@/components/DiagramViewer";
import KickoffReadOnlyBanner from "@/components/KickoffReadOnlyBanner";
import { useKickoffRole } from "../kickoff-context";
import { useKickoffChannel } from "@/hooks/useKickoffChannel";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  mermaidCode?: string | null;
  createdAt: string;
};

type BranchMode = null | "direct" | "brainstorm";

/** Strip mermaid code blocks from displayed message text */
function stripMermaidBlock(text: string): string {
  return text.replace(/```mermaid[\s\S]*?```/g, "").trim();
}

export default function TopicDecisionPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const teamId = params.teamId as string;
  const { data: session, status } = useSession();
  const { viewerRole } = useKickoffRole();
  const isReadOnly = viewerRole !== "leader";

  const [branch, setBranch] = useState<BranchMode>(null);
  const [pageReady, setPageReady] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Phase guard state — checked before branch selection
  const [sessionPhase, setSessionPhase] = useState<string | null>(null);
  const [lockedTopic, setLockedTopic] = useState<{ title: string; description: string } | null>(null);
  const [reverting, setReverting] = useState(false);
  const [showRevertConfirm, setShowRevertConfirm] = useState(false);

  // Direct input state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Brainstorm chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [mermaidCode, setMermaidCode] = useState<string | null>(null);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmDesc, setConfirmDesc] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const modalTitleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    const token = session?.teamforgeToken ?? session?.user?.teamforgeToken;
    if (token) apiClient.setToken(token);
  }, [status, session?.teamforgeToken, session?.user?.teamforgeToken]);

  // Phase guard: check if session has already moved past topic_decision
  useEffect(() => {
    if (status !== "authenticated") return;
    apiClient
      .get<{ phase: string; topicTitle: string | null; topicDescription: string | null }>(`/kickoff/${teamId}`)
      .then((s) => {
        setSessionPhase(s.phase);
        if (s.phase !== "topic_decision" && s.topicTitle) {
          setLockedTopic({ title: s.topicTitle, description: s.topicDescription ?? "" });
        }
      })
      .catch(() => {
        // If session fetch fails, fall through to normal flow
        setSessionPhase("topic_decision");
      });
  }, [status, teamId]);

  // Restore branch from URL mode param (set by kickoff router after chat-history check)
  useEffect(() => {
    const mode = searchParams.get("mode");
    if (mode === "chat" || mode === "watch") {
      setBranch("brainstorm");
    }
    setPageReady(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount — searchParams is stable

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load existing chat history when entering brainstorm mode
  useEffect(() => {
    if (branch !== "brainstorm") return;
    apiClient
      .get<ChatMessage[]>(`/kickoff/${teamId}/chat/topic_brainstorm`)
      .then((data) => {
        if (data.length > 0) {
          setMessages(data);
          const lastMermaid = [...data].reverse().find((m) => m.mermaidCode);
          if (lastMermaid?.mermaidCode) setMermaidCode(lastMermaid.mermaidCode);
        }
      })
      .catch(() => setLoadError(true));
  }, [branch, teamId]);

  // #9: Modal focus trap + ESC
  useEffect(() => {
    if (!showConfirm) return;
    modalTitleRef.current?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setShowConfirm(false);
      if (e.key === "Tab" && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          "input, textarea, button, [tabindex]",
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showConfirm]);

  // Real-time sync for members: refetch chat when leader sends a message
  useKickoffChannel({
    teamId,
    onEvent: useCallback((event) => {
      if (!isReadOnly) return; // leader doesn't need to refetch
      if (
        event.type === "kickoff:chat_updated" &&
        event.phase === "topic_brainstorm"
      ) {
        apiClient
          .get<ChatMessage[]>(`/kickoff/${teamId}/chat/topic_brainstorm`)
          .then((data) => {
            setMessages(data);
            const last = [...data].reverse().find((m) => m.mermaidCode);
            if (last?.mermaidCode) setMermaidCode(last.mermaidCode);
          })
          .catch(() => {});
      } else if (
        event.type === "kickoff:chat_reset" &&
        event.phase === "topic_brainstorm"
      ) {
        setMessages([]);
        setMermaidCode(null);
      } else if (event.type === "kickoff:phase_changed") {
        router.push(`/team/${teamId}/kickoff/architecture`);
      }
    }, [isReadOnly, teamId, router]),
  });

  // #5: Direct send function that doesn't rely on input state
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
          { message: userMsg, phase: "topic_brainstorm" },
        );
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== tempId),
          { id: tempId, role: "user", content: userMsg, createdAt: new Date().toISOString() },
          res.message,
        ]);
        if (res.message.mermaidCode) {
          setMermaidCode(res.message.mermaidCode);
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

  function handleSendMessage() {
    sendMessage(input);
  }

  async function handleDirectSubmit() {
    if (!title.trim() || !description.trim() || description.trim().length < 10) return;
    setSubmitting(true);
    try {
      await apiClient.post(`/kickoff/${teamId}/topic/direct`, {
        title: title.trim(),
        description: description.trim(),
      });
      router.push(`/team/${teamId}/kickoff/architecture`);
    } catch {
      toast.error("주제 등록에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmTopic() {
    if (!confirmTitle.trim()) return;
    setSubmitting(true);
    try {
      await apiClient.post(`/kickoff/${teamId}/topic/confirm`, {
        title: confirmTitle.trim(),
        description: confirmDesc.trim(),
      });
      router.push(`/team/${teamId}/kickoff/architecture`);
    } catch {
      toast.error("주제 확정에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  // #15: Chat reset
  async function handleResetChat() {
    if (!confirm("채팅을 초기화하시겠습니까? 모든 대화 내용이 삭제됩니다.")) return;
    setResetting(true);
    try {
      const res = await apiClient.delete<{ mermaidDiagram: string | null }>(
        `/kickoff/${teamId}/chat/topic_brainstorm`,
      );
      setMessages([]);
      setMermaidCode(res.mermaidDiagram ?? null);
    } catch {
      toast.error("채팅 초기화에 실패했습니다.");
    } finally {
      setResetting(false);
    }
  }

  // ── Phase revert handler ────────────────────────────────────────────────────

  async function handleRevertToTopic() {
    setReverting(true);
    setShowRevertConfirm(false);
    try {
      await apiClient.post(`/kickoff/${teamId}/revert-to-topic`, {});
      // Phase reverted — reload page in topic_decision mode
      setSessionPhase("topic_decision");
      setLockedTopic(null);
      toast.success("주제 결정 단계로 돌아왔어요. 다시 주제를 설정해주세요.");
    } catch {
      toast.error("되돌리기에 실패했습니다.");
    } finally {
      setReverting(false);
    }
  }

  // ── Phase guard: locked view when session is past topic_decision ─────────────

  // Still loading phase — show spinner
  if (sessionPhase === null) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[var(--tf-bg-layer-alt)]">
        <Loader2 className="w-8 h-8 text-[var(--tf-fg-brand)] animate-spin" />
      </div>
    );
  }

  if (sessionPhase !== "topic_decision") {
    const isArchPhase = sessionPhase === "architecture";
    const canRevert = !isReadOnly && isArchPhase;

    return (
      <div className="min-h-dvh bg-[var(--tf-bg-layer-alt)] flex flex-col">
        {isReadOnly && <KickoffReadOnlyBanner />}
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="max-w-[480px] w-full space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-[var(--tf-bg-positive-weak)] flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6 text-[var(--tf-fg-positive)]" />
              </div>
              <h1 className="text-[18px] font-bold text-[var(--tf-fg-default)]">주제가 결정되었어요</h1>
              <p className="text-[13px] text-[var(--tf-fg-muted)]">
                {isArchPhase ? "기술 아키텍처 설계 단계로 진행 중이에요." : "킥오프가 마무리 단계예요."}
              </p>
            </div>

            {/* Topic card */}
            {lockedTopic && (
              <div className="bg-[var(--tf-bg-layer-default)] rounded-r3 border border-[var(--tf-stroke-neutral)] p-5 space-y-2">
                <p className="text-[11px] font-medium text-[var(--tf-fg-muted)] uppercase tracking-wide">선택된 주제</p>
                <h2 className="text-[16px] font-semibold text-[var(--tf-fg-default)]">{lockedTopic.title}</h2>
                {lockedTopic.description && (
                  <p className="text-[13px] text-[var(--tf-fg-muted)] leading-relaxed">{lockedTopic.description}</p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-3">
              {isArchPhase && (
                <button
                  onClick={() => router.push(`/team/${teamId}/kickoff/architecture`)}
                  className="w-full h-11 rounded-r2 bg-[var(--tf-bg-brand-solid)] text-[var(--tf-fg-neutral-inverted)] text-[14px] font-medium hover:bg-[var(--tf-bg-brand-solid-pressed)] transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <ChevronRight className="w-4 h-4" />
                  아키텍처 설계로 이동
                </button>
              )}
              {sessionPhase === "summary" && (
                <button
                  onClick={() => router.push(`/team/${teamId}/kickoff/summary`)}
                  className="w-full h-11 rounded-r2 bg-[var(--tf-bg-brand-solid)] text-[var(--tf-fg-neutral-inverted)] text-[14px] font-medium hover:bg-[var(--tf-bg-brand-solid-pressed)] transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <ChevronRight className="w-4 h-4" />
                  킥오프 요약으로 이동
                </button>
              )}
              {canRevert && (
                <button
                  onClick={() => setShowRevertConfirm(true)}
                  disabled={reverting}
                  className="w-full h-10 rounded-r2 border border-[var(--tf-stroke-critical-weak)] text-[var(--tf-fg-critical)] text-[13px] hover:bg-[var(--tf-bg-critical-weak)] transition-colors cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {reverting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                  주제 변경하기
                </button>
              )}
              <button
                onClick={() => router.push(`/team/${teamId}`)}
                className="w-full h-9 rounded-r2 text-[13px] text-[var(--tf-fg-muted)] hover:bg-[var(--tf-bg-neutral-weak)] transition-colors cursor-pointer"
              >
                대시보드로 돌아가기
              </button>
            </div>
          </div>
        </div>

        {/* Revert confirmation dialog */}
        {showRevertConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={(e) => { if (e.target === e.currentTarget) setShowRevertConfirm(false); }}>
            <div className="bg-[var(--tf-bg-layer-default)] rounded-r3 border border-[var(--tf-stroke-neutral)] shadow-xl p-6 max-w-[400px] w-full space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-[var(--tf-bg-warning-weak)] flex items-center justify-center shrink-0">
                  <RotateCcw className="w-4 h-4 text-[var(--tf-fg-warning)]" />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-[var(--tf-fg-default)]">주제를 변경할까요?</h3>
                  <p className="text-[13px] text-[var(--tf-fg-muted)] mt-1 leading-relaxed">
                    아키텍처 설계 단계의 모든 채팅과 스택 선택이 초기화됩니다. 주제 브레인스톰 기록은 유지됩니다.
                  </p>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowRevertConfirm(false)}
                  className="h-9 px-4 rounded-r2 border border-[var(--tf-stroke-neutral)] text-[13px] text-[var(--tf-fg-muted)] hover:bg-[var(--tf-bg-neutral-weak)] transition-colors cursor-pointer"
                >
                  취소
                </button>
                <button
                  onClick={handleRevertToTopic}
                  className="h-9 px-4 rounded-r2 bg-[var(--tf-bg-critical-solid)] text-white text-[13px] font-medium hover:bg-[var(--tf-bg-critical-solid-pressed)] transition-colors cursor-pointer"
                >
                  주제 변경
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- Branch selection ---
  if (branch === null) {
    // Not ready yet — avoid flash of wrong screen
    if (!pageReady) {
      return (
        <div className="min-h-dvh flex items-center justify-center bg-[var(--tf-bg-layer-alt)]">
          <Loader2 className="w-8 h-8 text-[var(--tf-fg-brand)] animate-spin" />
        </div>
      );
    }

    // Members/observers never see the selection screen
    if (isReadOnly) {
      return (
        <div className="min-h-dvh flex flex-col bg-[var(--tf-bg-layer-alt)]">
          <KickoffReadOnlyBanner />
          <div className="flex-1 flex items-center justify-center px-4">
            <div className="max-w-[400px] w-full text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-[var(--tf-bg-informative-weak)] flex items-center justify-center mx-auto">
                <Sparkles className="w-7 h-7 text-[var(--tf-fg-informative)]" />
              </div>
              <p className="text-[15px] font-semibold text-[var(--tf-fg-default)]">
                팀장이 킥오프를 준비하고 있어요
              </p>
              <p className="text-[13px] text-[var(--tf-fg-muted)]">
                주제 결정이 시작되면 자동으로 화면이 업데이트돼요
              </p>
              <button
                onClick={() => router.push(`/team/${teamId}`)}
                className="text-[13px] text-[var(--tf-fg-muted)] hover:text-[var(--tf-fg-default)] transition-colors cursor-pointer"
              >
                대시보드로 돌아가기
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-dvh bg-[var(--tf-bg-layer-alt)] flex items-center justify-center px-4">
        <div className="max-w-[480px] w-full space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-full bg-[var(--tf-bg-brand-weak)] flex items-center justify-center mx-auto">
              <Sparkles className="w-7 h-7 text-[var(--tf-fg-brand)]" />
            </div>
            <h1 className="text-[22px] font-bold text-[var(--tf-fg-default)]">
              프로젝트 주제 결정
            </h1>
            <p className="text-[14px] text-[var(--tf-fg-muted)]">
              이미 주제를 정하셨나요?
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => setBranch("direct")}
              className="w-full bg-[var(--tf-bg-layer-default)] rounded-r3 border border-[var(--tf-stroke-neutral)] p-5 text-left hover:border-[var(--tf-stroke-brand)] transition-all duration-150 cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-r2 bg-[var(--tf-bg-positive-weak)] flex items-center justify-center shrink-0">
                  <FileText className="w-6 h-6 text-[var(--tf-fg-positive)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold text-[var(--tf-fg-default)]">
                    네, 주제가 정해졌어요
                  </p>
                  <p className="text-[13px] text-[var(--tf-fg-muted)] mt-0.5">
                    프로젝트 제목과 설명을 직접 입력할게요
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-[var(--tf-fg-subtle)] group-hover:text-[var(--tf-fg-brand)] transition-colors" />
              </div>
            </button>

            <button
              onClick={() => { setBranch("brainstorm"); router.replace(`/team/${teamId}/kickoff/topic?mode=chat`); }}
              className="w-full bg-[var(--tf-bg-layer-default)] rounded-r3 border border-[var(--tf-stroke-neutral)] p-5 text-left hover:border-[var(--tf-stroke-brand)] transition-all duration-150 cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-r2 bg-[var(--tf-bg-informative-weak)] flex items-center justify-center shrink-0">
                  <MessageSquare className="w-6 h-6 text-[var(--tf-fg-informative)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold text-[var(--tf-fg-default)]">
                    아직 정하지 못했어요
                  </p>
                  <p className="text-[13px] text-[var(--tf-fg-muted)] mt-0.5">
                    AI와 대화하면서 주제를 정할게요
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-[var(--tf-fg-subtle)] group-hover:text-[var(--tf-fg-brand)] transition-colors" />
              </div>
            </button>
          </div>

          <button
            onClick={() => router.push(`/team/${teamId}`)}
            className="w-full text-center text-[13px] text-[var(--tf-fg-muted)] hover:text-[var(--tf-fg-default)] transition-colors cursor-pointer py-2"
          >
            대시보드로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // --- Direct input (Yes path) ---
  if (branch === "direct") {
    return (
      <div className="min-h-dvh bg-[var(--tf-bg-layer-alt)] px-4 py-8">
        <div className="max-w-[520px] mx-auto space-y-6">
          <button
            onClick={() => setBranch(null)}
            className="flex items-center gap-1.5 text-[13px] text-[var(--tf-fg-muted)] hover:text-[var(--tf-fg-default)] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            돌아가기
          </button>

          <div className="space-y-1">
            <h1 className="text-[20px] font-bold text-[var(--tf-fg-default)]">
              프로젝트 주제 입력
            </h1>
            <p className="text-[13px] text-[var(--tf-fg-muted)]">
              AI가 주제를 분석하여 플랫폼, 핵심 기능, 복잡도를 분류해드려요
            </p>
          </div>

          <div className="bg-[var(--tf-bg-layer-default)] rounded-r3 border border-[var(--tf-stroke-neutral)] p-6 space-y-5">
            <div className="space-y-2">
              <label htmlFor="topic-title" className="text-[13px] font-medium text-[var(--tf-fg-default)]">
                프로젝트 제목 <span className="text-[var(--tf-fg-critical)]">*</span>
              </label>
              <input
                id="topic-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 대학생 팀 매칭 플랫폼"
                className="w-full h-11 px-3 rounded-r2 border border-[var(--tf-stroke-neutral)] bg-[var(--tf-bg-layer-default)] text-[14px] text-[var(--tf-fg-default)] placeholder:text-[var(--tf-fg-placeholder)] focus:outline-none focus:border-[var(--tf-stroke-brand)] transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="topic-desc" className="text-[13px] font-medium text-[var(--tf-fg-default)]">
                프로젝트 설명 <span className="text-[var(--tf-fg-critical)]">*</span>
              </label>
              <textarea
                id="topic-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="프로젝트의 목적, 대상 사용자, 주요 기능을 설명해주세요. (최소 10자)"
                rows={5}
                className="w-full px-3 py-2.5 rounded-r2 border border-[var(--tf-stroke-neutral)] bg-[var(--tf-bg-layer-default)] text-[14px] text-[var(--tf-fg-default)] placeholder:text-[var(--tf-fg-placeholder)] focus:outline-none focus:border-[var(--tf-stroke-brand)] transition-colors resize-none"
              />
              <p className="text-[11px] text-[var(--tf-fg-subtle)]">
                {description.length}자 / 최소 10자
              </p>
            </div>
          </div>

          <button
            onClick={handleDirectSubmit}
            disabled={!title.trim() || description.trim().length < 10 || submitting}
            className="w-full h-12 rounded-r3 bg-[var(--tf-bg-brand-solid)] text-[var(--tf-fg-neutral-inverted)] text-[15px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--tf-bg-brand-solid-pressed)] transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                다음 단계로
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // --- Brainstorm mode (No path): AI Chat + Mermaid ---
  // h-[calc(100dvh-3rem)]: subtract TeamLayout sticky header height (h-12 = 3rem)
  return (
    <div className="h-[calc(100dvh-3rem)] bg-[var(--tf-bg-layer-alt)] flex flex-col overflow-hidden">
      {/* Read-only banner for members (SEED Page Banner — informative) */}
      {isReadOnly && <KickoffReadOnlyBanner />}

      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-[var(--tf-bg-layer-default)] border-b border-[var(--tf-stroke-neutral)] px-4 py-3">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setBranch(null)}
              aria-label="돌아가기"
              className="w-8 h-8 rounded-r2 flex items-center justify-center hover:bg-[var(--tf-bg-neutral-weak)] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-[var(--tf-fg-muted)]" />
            </button>
            <div>
              <h1 className="text-[15px] font-semibold text-[var(--tf-fg-default)]">
                AI 브레인스토밍
              </h1>
              <p className="text-[11px] text-[var(--tf-fg-muted)]">
                팀 스킬 기반으로 프로젝트 주제를 함께 정해요
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Leader-only actions */}
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
                onClick={() => setShowConfirm(true)}
                className="h-9 px-4 rounded-r2 bg-[var(--tf-bg-brand-solid)] text-[var(--tf-fg-neutral-inverted)] text-[13px] font-medium hover:bg-[var(--tf-bg-brand-solid-pressed)] transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                주제 확정
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main content: split view on desktop, chat only on mobile */}
      <div className="flex-1 flex max-w-[1200px] mx-auto w-full min-h-0">
        {/* Diagram panel (desktop only) — ratio-based width */}
        {mermaidCode && (
          <div className="hidden lg:flex lg:w-[44%] xl:w-[46%] max-w-[560px] border-r border-[var(--tf-stroke-neutral)] bg-[var(--tf-bg-layer-default)] flex-col min-h-0">
            <div className="px-5 pt-4 pb-2 shrink-0">
              <h2 className="text-[13px] font-semibold text-[var(--tf-fg-default)]">
                프로젝트 구조 다이어그램
              </h2>
            </div>
            <div className="flex-1 min-h-0 p-4 flex flex-col">
              <DiagramViewer code={mermaidCode} className="flex-1 min-h-0" />
            </div>
          </div>
        )}

        {/* Chat panel */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
            {messages.length === 0 && !chatLoading && (
              <div className="text-center py-12 space-y-3">
                <div className="w-12 h-12 rounded-full bg-[var(--tf-bg-informative-weak)] flex items-center justify-center mx-auto">
                  <Sparkles className="w-6 h-6 text-[var(--tf-fg-informative)]" />
                </div>
                {isReadOnly ? (
                  <>
                    <p className="text-[14px] text-[var(--tf-fg-default)]">
                      아직 대화가 시작되지 않았어요
                    </p>
                    <p className="text-[12px] text-[var(--tf-fg-muted)]">
                      팀장이 AI와 채팅을 시작하면 여기에 실시간으로 표시돼요
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-[14px] text-[var(--tf-fg-default)]">
                      어떤 프로젝트를 만들고 싶으세요?
                    </p>
                    <p className="text-[12px] text-[var(--tf-fg-muted)]">
                      관심 분야나 아이디어가 있다면 자유롭게 이야기해주세요
                    </p>
                  </>
                )}
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] md:max-w-[70%] rounded-r3 px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-[var(--tf-bg-brand-solid)] text-[var(--tf-fg-neutral-inverted)]"
                      : "bg-[var(--tf-bg-layer-default)] border border-[var(--tf-stroke-neutral)] text-[var(--tf-fg-default)]"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="text-[14px] leading-relaxed prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-headings:my-1 prose-code:text-[var(--tf-fg-brand)]">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.mermaidCode ? stripMermaidBlock(msg.content) : msg.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-[14px] leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </p>
                  )}
                  {msg.mermaidCode && (
                    <div className="lg:hidden mt-3">
                      <p className="text-[11px] font-medium text-[var(--tf-fg-muted)] mb-1">
                        다이어그램
                      </p>
                      <DiagramViewer code={msg.mermaidCode} />
                    </div>
                  )}
                </div>
              </div>
            ))}

            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-[var(--tf-bg-layer-default)] border border-[var(--tf-stroke-neutral)] rounded-r3 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[var(--tf-fg-brand)]" />
                    <span className="text-[13px] text-[var(--tf-fg-muted)]">생각하는 중...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input bar — leader only; members see a read-only notice */}
          <div className="shrink-0 bg-[var(--tf-bg-layer-default)] border-t border-[var(--tf-stroke-neutral)] px-4 py-3">
            {!isReadOnly && messages.length >= 2 && !chatLoading && (
              <div className="max-w-[720px] mx-auto mb-2 flex gap-2">
                <button
                  onClick={() => {
                    const msg = mermaidCode
                      ? "지금까지 논의한 내용을 반영해서 다이어그램을 업데이트해줘"
                      : "지금까지 논의한 내용을 mermaid 다이어그램으로 정리해줘";
                    sendMessage(msg);
                  }}
                  className="h-8 px-3 rounded-full border border-[var(--tf-stroke-brand)] text-[12px] text-[var(--tf-fg-brand)] hover:bg-[var(--tf-bg-brand-weak)] transition-colors cursor-pointer"
                >
                  {mermaidCode ? "다이어그램 업데이트" : "다이어그램으로 정리하기"}
                </button>
              </div>
            )}
            {isReadOnly ? (
              /* Member: read-only notice (UI/UX Pro Max: read-only-distinction) */
              <div className="max-w-[720px] mx-auto flex items-center justify-center gap-2 py-2 text-[12px] text-[var(--tf-fg-subtle)]">
                <Eye className="w-3.5 h-3.5" />
                채팅에 참여하려면 팀장 권한이 필요해요
              </div>
            ) : (
              <div className="max-w-[720px] mx-auto flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="아이디어를 입력하세요..."
                  rows={1}
                  className="flex-1 min-h-[44px] max-h-[120px] px-3 py-2.5 rounded-r2 border border-[var(--tf-stroke-neutral)] bg-[var(--tf-bg-layer-default)] text-[14px] text-[var(--tf-fg-default)] placeholder:text-[var(--tf-fg-placeholder)] focus:outline-none focus:border-[var(--tf-stroke-brand)] transition-colors resize-none"
                />
                <button
                  onClick={handleSendMessage}
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

      {/* #9: Confirm topic modal with focus trap + ESC + ARIA */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
          onClick={(e) => { if (e.target === e.currentTarget) setShowConfirm(false); }}
        >
          <div
            ref={modalRef}
            className="bg-[var(--tf-bg-layer-floating)] rounded-r3 border border-[var(--tf-stroke-neutral)] p-6 max-w-[440px] w-full space-y-5 shadow-lg"
          >
            <h2 id="confirm-modal-title" className="text-[18px] font-bold text-[var(--tf-fg-default)]">
              주제 확정하기
            </h2>
            <p className="text-[13px] text-[var(--tf-fg-muted)]">
              대화에서 정리된 주제를 확정해주세요. 다음 단계(기술 스택 결정)로 넘어갑니다.
            </p>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="confirm-title" className="text-[13px] font-medium text-[var(--tf-fg-default)]">
                  프로젝트 제목 <span className="text-[var(--tf-fg-critical)]">*</span>
                </label>
                <input
                  ref={modalTitleRef}
                  id="confirm-title"
                  type="text"
                  value={confirmTitle}
                  onChange={(e) => setConfirmTitle(e.target.value)}
                  placeholder="프로젝트 제목"
                  className="w-full h-10 px-3 rounded-r2 border border-[var(--tf-stroke-neutral)] bg-[var(--tf-bg-layer-default)] text-[14px] text-[var(--tf-fg-default)] placeholder:text-[var(--tf-fg-placeholder)] focus:outline-none focus:border-[var(--tf-stroke-brand)] transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="confirm-desc" className="text-[13px] font-medium text-[var(--tf-fg-default)]">
                  간단한 설명
                </label>
                <textarea
                  id="confirm-desc"
                  value={confirmDesc}
                  onChange={(e) => setConfirmDesc(e.target.value)}
                  placeholder="프로젝트에 대한 간단한 설명"
                  rows={3}
                  className="w-full px-3 py-2 rounded-r2 border border-[var(--tf-stroke-neutral)] bg-[var(--tf-bg-layer-default)] text-[14px] text-[var(--tf-fg-default)] placeholder:text-[var(--tf-fg-placeholder)] focus:outline-none focus:border-[var(--tf-stroke-brand)] transition-colors resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 h-11 rounded-r2 border border-[var(--tf-stroke-neutral)] text-[14px] text-[var(--tf-fg-muted)] hover:bg-[var(--tf-bg-neutral-weak)] transition-colors cursor-pointer"
              >
                취소
              </button>
              <button
                onClick={handleConfirmTopic}
                disabled={!confirmTitle.trim() || submitting}
                className="flex-1 h-11 rounded-r2 bg-[var(--tf-bg-brand-solid)] text-[var(--tf-fg-neutral-inverted)] text-[14px] font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--tf-bg-brand-solid-pressed)] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    확정하고 다음으로
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
