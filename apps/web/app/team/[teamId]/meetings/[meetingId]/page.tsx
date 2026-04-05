"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ChevronRight,
  Loader2,
  FileText,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Lightbulb,
  User,
  Calendar,
} from "lucide-react";
import LogoutButton from "@/components/LogoutButton";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import type { MeetingDetail, ActionItemResponse } from "@teamforge/contracts";

export default function MeetingDetailPage() {
  const params = useParams();
  const teamId = params.teamId as string;
  const meetingId = params.meetingId as string;
  const router = useRouter();
  const { data: session, status } = useSession();
  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMeeting = useCallback(async () => {
    try {
      const data = await apiClient.get<MeetingDetail>(`/meetings/${meetingId}`);
      setMeeting(data);
    } catch {
      toast.error("회의를 불러올 수 없어요");
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const token = session?.teamforgeToken ?? session?.user?.teamforgeToken;
    if (token) apiClient.setToken(token);
    fetchMeeting();
  }, [status, session?.teamforgeToken, session?.user?.teamforgeToken, fetchMeeting]);

  // Poll if still analyzing
  useEffect(() => {
    if (!meeting || meeting.analysisStatus !== "analyzing") return;
    const interval = setInterval(fetchMeeting, 3000);
    return () => clearInterval(interval);
  }, [meeting?.analysisStatus, fetchMeeting]);

  const toggleAction = async (item: ActionItemResponse) => {
    try {
      const res = await apiClient.patch<{ id: string; status: string }>(
        `/meetings/action-items/${item.id}/toggle`
      );
      setMeeting((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          actionItems: prev.actionItems.map((a) =>
            a.id === item.id ? { ...a, status: res.status as "open" | "done" } : a
          ),
        };
      });
    } catch {
      toast.error("상태 변경에 실패했어요");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--tf-bg-layer-alt)]">
        <Loader2 className="w-8 h-8 text-[var(--tf-fg-brand)] animate-spin" />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--tf-bg-layer-alt)]">
        <p className="text-[var(--tf-fg-muted)]">회의를 찾을 수 없어요</p>
      </div>
    );
  }

  const doneCount = meeting.actionItems.filter((a) => a.status === "done").length;
  const totalCount = meeting.actionItems.length;
  const formatDate = (iso: string) => new Date(iso).toLocaleDateString("ko-KR");

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
          <div className="flex-1 min-w-0">
            <h1 className="text-[16px] font-semibold text-[var(--tf-fg-default)] truncate">
              {meeting.title ?? `${formatDate(meeting.meetingDate)} 회의`}
            </h1>
            <p className="text-[12px] text-[var(--tf-fg-subtle)]">
              {formatDate(meeting.meetingDate)}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-[640px] mx-auto px-4 py-6 space-y-4">

        {/* Analysis status */}
        {meeting.analysisStatus === "analyzing" && (
          <div className="flex items-center gap-3 p-4 rounded-r3 bg-[var(--tf-bg-info)] border border-[var(--tf-stroke-neutral)]">
            <Loader2 className="w-5 h-5 text-[var(--tf-fg-brand)] animate-spin shrink-0" />
            <div>
              <p className="text-[14px] font-medium text-[var(--tf-fg-default)]">AI 분석 중이에요</p>
              <p className="text-[12px] text-[var(--tf-fg-muted)]">요약과 액션 아이템을 추출하는 중...</p>
            </div>
          </div>
        )}

        {meeting.analysisStatus === "failed" && (
          <div className="flex items-center gap-3 p-4 rounded-r3 bg-[var(--tf-bg-warning)] border border-[var(--tf-stroke-neutral)]">
            <AlertTriangle className="w-5 h-5 text-[var(--tf-fg-warning)] shrink-0" />
            <div>
              <p className="text-[14px] font-medium text-[var(--tf-fg-default)]">분석에 실패했어요</p>
              <p className="text-[12px] text-[var(--tf-fg-muted)]">원문은 저장되었어요. 나중에 다시 시도할 수 있어요.</p>
            </div>
          </div>
        )}

        {/* Summary card */}
        {meeting.summary && (
          <div className="bg-[var(--tf-bg-layer-default)] rounded-r3 border border-[var(--tf-stroke-neutral)] p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[var(--tf-fg-brand)]" />
              <h2 className="text-[15px] font-semibold text-[var(--tf-fg-default)]">요약</h2>
            </div>
            <p className="text-[14px] text-[var(--tf-fg-default)] leading-relaxed whitespace-pre-wrap">
              {meeting.summary}
            </p>
          </div>
        )}

        {/* Action items */}
        {meeting.actionItems.length > 0 && (
          <div className="bg-[var(--tf-bg-layer-default)] rounded-r3 border border-[var(--tf-stroke-neutral)] p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-[var(--tf-fg-default)]">
                액션 아이템
              </h2>
              <span className="text-[12px] text-[var(--tf-fg-muted)]">
                {doneCount}/{totalCount} 완료
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-1.5 bg-[var(--tf-bg-layer-alt)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--tf-fg-positive)] transition-all duration-300"
                style={{ width: totalCount > 0 ? `${(doneCount / totalCount) * 100}%` : "0%" }}
              />
            </div>

            <div className="space-y-2">
              {meeting.actionItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => toggleAction(item)}
                  className="w-full flex items-start gap-3 p-3 rounded-r2 hover:bg-[var(--tf-bg-layer-alt)] transition-colors text-left"
                >
                  {item.status === "done" ? (
                    <CheckCircle2 className="w-5 h-5 text-[var(--tf-fg-positive)] shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="w-5 h-5 text-[var(--tf-fg-muted)] shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-[14px] ${item.status === "done" ? "text-[var(--tf-fg-muted)] line-through" : "text-[var(--tf-fg-default)]"}`}>
                      {item.description}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      {item.assigneeName && (
                        <span className="flex items-center gap-1 text-[11px] text-[var(--tf-fg-subtle)]">
                          <User className="w-3 h-3" />
                          {item.assigneeName}
                        </span>
                      )}
                      {item.dueDate && (
                        <span className="flex items-center gap-1 text-[11px] text-[var(--tf-fg-subtle)]">
                          <Calendar className="w-3 h-3" />
                          {new Date(item.dueDate).toLocaleDateString("ko-KR")}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Next agenda */}
        {meeting.nextAgenda && meeting.nextAgenda.length > 0 && (
          <div className="bg-[var(--tf-bg-layer-default)] rounded-r3 border border-[var(--tf-stroke-neutral)] p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-[var(--tf-fg-warning)]" />
              <h2 className="text-[15px] font-semibold text-[var(--tf-fg-default)]">
                다음 회의 안건
              </h2>
            </div>
            <ul className="space-y-2">
              {meeting.nextAgenda.map((agenda, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-[12px] font-bold text-[var(--tf-fg-brand)] mt-0.5 w-5 text-center shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-[14px] text-[var(--tf-fg-default)]">{agenda}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Raw content (for leader/member only — already stripped on server for observer) */}
        {meeting.rawContent && (
          <details className="bg-[var(--tf-bg-layer-default)] rounded-r3 border border-[var(--tf-stroke-neutral)] shadow-sm">
            <summary className="px-5 py-4 text-[13px] font-medium text-[var(--tf-fg-muted)] cursor-pointer hover:text-[var(--tf-fg-default)] transition-colors">
              원문 보기
            </summary>
            <div className="px-5 pb-5">
              <p className="text-[13px] text-[var(--tf-fg-default)] whitespace-pre-wrap leading-relaxed border-t border-[var(--tf-stroke-neutral)] pt-4">
                {meeting.rawContent}
              </p>
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
