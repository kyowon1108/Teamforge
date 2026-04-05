"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ChevronRight,
  Send,
  Loader2,
  ClipboardPaste,
  Calendar,
} from "lucide-react";
import LogoutButton from "@/components/LogoutButton";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

export default function NewMeetingPage() {
  const params = useParams();
  const teamId = params.teamId as string;
  const router = useRouter();
  const { data: session, status } = useSession();

  const [title, setTitle] = useState("");
  const [rawContent, setRawContent] = useState("");
  const [meetingDate, setMeetingDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [submitting, setSubmitting] = useState(false);

  // Ensure token is set
  if (status === "authenticated") {
    const token = session?.teamforgeToken ?? session?.user?.teamforgeToken;
    if (token) apiClient.setToken(token);
  }

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setRawContent(text);
        toast.success("클립보드에서 붙여넣었어요");
      }
    } catch {
      toast.error("클립보드 접근 권한이 필요해요");
    }
  };

  const handleSubmit = async () => {
    if (rawContent.trim().length < 50) {
      toast.error("회의 내용은 최소 50자 이상이어야 해요");
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiClient.post<{ id: string; analysisStatus: string }>(
        "/meetings",
        { teamId, title: title.trim() || undefined, rawContent, meetingDate }
      );
      toast.success("회의가 등록되었어요. AI가 분석 중이에요.");
      router.push(`/team/${teamId}/meetings/${res.id}`);
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error(e?.message ?? "회의 등록에 실패했어요");
      setSubmitting(false);
    }
  };

  const charCount = rawContent.length;
  const isValid = charCount >= 50;

  return (
    <div className="min-h-screen bg-[var(--tf-bg-layer-alt)]">
      <LogoutButton />

      {/* Header */}
      <div className="sticky top-0 z-10 bg-[var(--tf-bg-layer-default)] border-b border-[var(--tf-stroke-neutral)]">
        <div className="max-w-[640px] mx-auto px-4 py-4 flex items-center gap-2">
          <button
            onClick={() => router.push(`/team/${teamId}/meetings`)}
            className="text-[var(--tf-fg-muted)] hover:text-[var(--tf-fg-default)] transition-colors"
          >
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          <h1 className="text-[18px] font-semibold text-[var(--tf-fg-default)]">
            회의 기록하기
          </h1>
        </div>
      </div>

      <div className="max-w-[640px] mx-auto px-4 py-6 space-y-5 pb-32">
        {/* Title (optional) */}
        <div className="space-y-2">
          <label className="text-[13px] font-medium text-[var(--tf-fg-default)]">
            회의 제목 <span className="text-[var(--tf-fg-subtle)]">(선택)</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 2주차 스프린트 리뷰"
            maxLength={200}
            className="w-full h-11 px-3 rounded-r2 border border-[var(--tf-stroke-neutral)] bg-[var(--tf-bg-layer-default)] text-[14px] text-[var(--tf-fg-default)] placeholder:text-[var(--tf-fg-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--tf-stroke-focus)] transition-shadow"
          />
        </div>

        {/* Meeting date */}
        <div className="space-y-2">
          <label className="text-[13px] font-medium text-[var(--tf-fg-default)] flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[var(--tf-fg-muted)]" />
            회의 날짜
          </label>
          <input
            type="date"
            value={meetingDate}
            onChange={(e) => setMeetingDate(e.target.value)}
            className="w-full h-11 px-3 rounded-r2 border border-[var(--tf-stroke-neutral)] bg-[var(--tf-bg-layer-default)] text-[14px] text-[var(--tf-fg-default)] focus:outline-none focus:ring-2 focus:ring-[var(--tf-stroke-focus)] transition-shadow"
          />
        </div>

        {/* Raw content input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[13px] font-medium text-[var(--tf-fg-default)]">
              회의 내용
            </label>
            <button
              onClick={handlePaste}
              className="flex items-center gap-1 text-[12px] text-[var(--tf-fg-brand)] hover:underline"
            >
              <ClipboardPaste className="w-3 h-3" />
              클립보드에서 붙여넣기
            </button>
          </div>
          <textarea
            value={rawContent}
            onChange={(e) => setRawContent(e.target.value)}
            placeholder="회의 내용을 그대로 붙여넣으세요. Slack, Notion, 메모장 등 어디서든 복사한 텍스트를 넣으면 AI가 자동으로 분석해요."
            rows={12}
            className="w-full px-3 py-3 rounded-r2 border border-[var(--tf-stroke-neutral)] bg-[var(--tf-bg-layer-default)] text-[14px] text-[var(--tf-fg-default)] placeholder:text-[var(--tf-fg-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--tf-stroke-focus)] resize-none transition-shadow leading-relaxed"
          />
          <div className="flex items-center justify-between">
            <p className={`text-[11px] ${isValid ? "text-[var(--tf-fg-subtle)]" : "text-[var(--tf-fg-warning)]"}`}>
              {charCount < 50
                ? `최소 50자 이상 입력해주세요 (${charCount}/50)`
                : `${charCount.toLocaleString()}자`
              }
            </p>
          </div>
        </div>

        {/* AI analysis preview hint */}
        <div className="p-4 rounded-r2 bg-[var(--tf-bg-info)] space-y-1.5">
          <p className="text-[13px] font-medium text-[var(--tf-fg-info)]">
            AI가 분석하는 내용
          </p>
          <ul className="text-[12px] text-[var(--tf-fg-info)] space-y-0.5 pl-4 list-disc">
            <li>핵심 논의 사항 요약 (3~5줄)</li>
            <li>액션 아이템 추출 (누가 / 무엇을 / 언제까지)</li>
            <li>다음 회의 안건 자동 생성</li>
          </ul>
        </div>
      </div>

      {/* Bottom CTA — Toss: Clear CTA, 하단 고정 */}
      <div className="fixed bottom-0 left-0 right-0 bg-[var(--tf-bg-layer-default)] border-t border-[var(--tf-stroke-neutral)]">
        <div
          className="max-w-[640px] mx-auto px-4 py-3 flex justify-end"
          style={{ paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))" }}
        >
          <button
            onClick={handleSubmit}
            disabled={submitting || !isValid}
            className={`
              flex items-center gap-2 h-11 px-6 rounded-r2 text-[14px] font-medium transition-all
              ${!submitting && isValid
                ? "bg-[var(--tf-bg-brand-solid)] text-[var(--tf-fg-inverse)] hover:opacity-90"
                : "bg-[var(--tf-stroke-neutral)] text-[var(--tf-fg-disabled)] cursor-not-allowed"
              }
            `}
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> 등록 중...</>
            ) : (
              <><Send className="w-4 h-4" /> AI 분석 요청</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
