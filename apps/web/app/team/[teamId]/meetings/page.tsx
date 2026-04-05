"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Loader2,
  Plus,
  FileText,
  CheckCircle2,
  Circle,
  ChevronRight,
  MessageSquareText,
} from "lucide-react";
import LogoutButton from "@/components/LogoutButton";
import { apiClient } from "@/lib/api-client";
import type { MeetingSummary } from "@teamforge/contracts";

export default function MeetingsListPage() {
  const params = useParams();
  const teamId = params.teamId as string;
  const router = useRouter();
  const { data: session, status } = useSession();
  const [meetings, setMeetings] = useState<MeetingSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "authenticated") return;
    const token = session?.teamforgeToken ?? session?.user?.teamforgeToken;
    if (token) apiClient.setToken(token);

    apiClient
      .get<MeetingSummary[]>(`/meetings/team/${teamId}`)
      .then(setMeetings)
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

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  return (
    <div className="min-h-screen bg-[var(--tf-bg-layer-alt)]">
      <LogoutButton />

      {/* Header */}
      <div className="sticky top-0 z-10 bg-[var(--tf-bg-layer-default)] border-b border-[var(--tf-stroke-neutral)]">
        <div className="max-w-[640px] mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push(`/team/${teamId}`)}
              className="text-[var(--tf-fg-muted)] hover:text-[var(--tf-fg-default)] transition-colors"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
            <h1 className="text-[18px] font-semibold text-[var(--tf-fg-default)]">회의 허브</h1>
          </div>
          <button
            onClick={() => router.push(`/team/${teamId}/meetings/new`)}
            className="flex items-center gap-1.5 h-9 px-4 rounded-r2 bg-[var(--tf-bg-brand-solid)] text-[var(--tf-fg-inverse)] text-[13px] font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            회의 기록
          </button>
        </div>
      </div>

      <div className="max-w-[640px] mx-auto px-4 py-6 space-y-3 pb-24">
        {meetings.length === 0 ? (
          /* Empty state — Toss: "비어있다"가 아닌 "진행 중이다" */
          <div className="text-center py-16 space-y-4">
            <div className="w-16 h-16 rounded-full bg-[var(--tf-bg-info)] flex items-center justify-center mx-auto">
              <MessageSquareText className="w-8 h-8 text-[var(--tf-fg-brand)]" />
            </div>
            <div className="space-y-2">
              <p className="text-[16px] font-semibold text-[var(--tf-fg-default)]">
                첫 번째 회의를 기록해보세요
              </p>
              <p className="text-[13px] text-[var(--tf-fg-muted)] max-w-[280px] mx-auto leading-relaxed">
                회의 내용을 붙여넣으면 AI가 요약하고 액션 아이템을 자동 추출해요
              </p>
            </div>
            <button
              onClick={() => router.push(`/team/${teamId}/meetings/new`)}
              className="inline-flex items-center gap-2 h-11 px-6 rounded-r2 bg-[var(--tf-bg-brand-solid)] text-[var(--tf-fg-inverse)] text-[14px] font-medium hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              회의 기록하기
            </button>
          </div>
        ) : (
          meetings.map((m) => (
            <button
              key={m.id}
              onClick={() => router.push(`/team/${teamId}/meetings/${m.id}`)}
              className="w-full bg-[var(--tf-bg-layer-default)] rounded-r3 border border-[var(--tf-stroke-neutral)] p-4 shadow-sm text-left hover:border-[var(--tf-stroke-brand)] transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-4 h-4 text-[var(--tf-fg-brand)] shrink-0" />
                    <span className="text-[14px] font-medium text-[var(--tf-fg-default)] truncate">
                      {m.title ?? `${formatDate(m.meetingDate)} 회의`}
                    </span>
                  </div>
                  {m.summary && (
                    <p className="text-[13px] text-[var(--tf-fg-muted)] line-clamp-2 ml-6">
                      {m.summary}
                    </p>
                  )}
                  {m.analysisStatus === "analyzing" && (
                    <div className="flex items-center gap-1.5 ml-6 mt-1">
                      <Loader2 className="w-3 h-3 text-[var(--tf-fg-brand)] animate-spin" />
                      <span className="text-[12px] text-[var(--tf-fg-brand)]">분석 중...</span>
                    </div>
                  )}
                  {m.analysisStatus === "failed" && (
                    <p className="text-[12px] text-[var(--tf-fg-negative)] ml-6 mt-1">분석 실패</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[12px] text-[var(--tf-fg-subtle)]">
                    {formatDate(m.meetingDate)}
                  </span>
                  {m.actionItemsCount > 0 && (
                    <div className="flex items-center gap-1 mt-1 justify-end">
                      {m.actionItemsDone === m.actionItemsCount ? (
                        <CheckCircle2 className="w-3 h-3 text-[var(--tf-fg-positive)]" />
                      ) : (
                        <Circle className="w-3 h-3 text-[var(--tf-fg-muted)]" />
                      )}
                      <span className="text-[11px] text-[var(--tf-fg-muted)]">
                        {m.actionItemsDone}/{m.actionItemsCount}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
