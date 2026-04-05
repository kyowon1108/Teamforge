"use client";

import { Eye } from "lucide-react";

/**
 * SEED Page Banner — informative/weak tone
 * 팀원이 킥오프 화면을 읽기 전용으로 볼 때 상단에 고정 표시됩니다.
 *
 * 가이드라인:
 * - 페이지 상단 전체 너비 (gutter 없이 가로 확장)
 * - "사용자 권한 제한" 케이스 → informative tone
 * - 경고·오류가 아니므로 dismissible 아님 (상태가 바뀔 때까지 유지)
 */
export default function KickoffReadOnlyBanner() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full bg-[var(--tf-bg-informative-weak)] border-b border-[var(--tf-stroke-informative-weak)] px-4 py-2.5 flex items-center gap-2"
    >
      {/* Prefix icon — fill 타입 권장 (SEED 가이드라인) */}
      <Eye
        className="w-4 h-4 text-[var(--tf-fg-informative-contrast)] shrink-0"
        aria-hidden="true"
      />

      {/* Title + description (inline, SEED 스타일) */}
      <p className="text-[13px] leading-snug text-[var(--tf-fg-informative-contrast)]">
        <span className="font-bold">읽기 전용&nbsp;&nbsp;</span>
        팀장이 킥오프를 진행하는 과정을 볼 수 있어요. 채팅 참여 및 확정은 팀장만 가능합니다.
      </p>
    </div>
  );
}
