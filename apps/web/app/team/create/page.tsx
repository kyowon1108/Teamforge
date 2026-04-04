"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Copy, Check, Link2, Users, ArrowRight } from "lucide-react";
import LogoutButton from "@/components/LogoutButton";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

type TeamCreated = {
  team: {
    id: string;
    name: string;
    inviteCode: string;
    inviteUrl: string;
    memberCount: number;
    expectedSize: number;
  };
};

export default function TeamCreatePage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [expectedSize, setExpectedSize] = useState<number>(4);
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<TeamCreated | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const router = useRouter();
  const { data: session } = useSession();

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await apiClient.post<TeamCreated>("/teams", {
        name: name.trim(),
        description: description.trim() || undefined,
        expectedSize,
      });
      setCreated(res);
      // Store teamId so survey page can find it (JWT won't have it yet)
      localStorage.setItem("teamforge_team_id", res.team.id);
      toast.success("팀이 생성되었습니다!");
    } catch (err: unknown) {
      const e = err as { code?: string; statusCode?: number; message?: string };
      console.error("Team creation error:", e);
      if (e.code === "TEAM_NAME_DUPLICATE") {
        toast.error("이미 같은 이름의 팀이 있어요");
      } else if (e.statusCode === 401) {
        toast.error("인증이 필요해요. 다시 로그인해주세요.");
      } else {
        toast.error(`팀 생성에 실패했어요: ${e.message ?? e.code ?? "알 수 없는 오류"}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, type: "code" | "link") => {
    await navigator.clipboard.writeText(text);
    if (type === "code") {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } else {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  // After creation — show invite info
  if (created) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--tf-bg-layer-alt)] px-4">
        <LogoutButton />
        <div className="w-full max-w-[480px] bg-[var(--tf-bg-layer-default)] rounded-r3 border border-[var(--tf-stroke-neutral)] p-8 space-y-6 shadow-sm">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-[var(--tf-bg-positive)] flex items-center justify-center mx-auto">
              <Check className="w-6 h-6 text-[var(--tf-fg-positive)]" />
            </div>
            <h1 className="text-[20px] font-bold text-[var(--tf-fg-default)]">
              {created.team.name}
            </h1>
            <p className="text-[14px] text-[var(--tf-fg-muted)]">
              팀이 생성되었어요! 팀원을 초대하세요.
            </p>
          </div>

          {/* Invite code display */}
          <div className="bg-[var(--tf-bg-layer-alt)] rounded-r2 p-6 text-center space-y-3">
            <p className="text-[12px] text-[var(--tf-fg-muted)]">초대 코드</p>
            <div className="text-[32px] font-bold tracking-[0.3em] text-[var(--tf-fg-brand)]">
              {created.team.inviteCode}
            </div>
            <button
              onClick={() => copyToClipboard(created.team.inviteCode, "code")}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-r2 border border-[var(--tf-stroke-neutral)] text-[13px] text-[var(--tf-fg-muted)] hover:bg-[var(--tf-bg-layer-default)] transition-colors"
            >
              {codeCopied ? (
                <><Check className="w-4 h-4 text-[var(--tf-fg-positive)]" /> 복사됨</>
              ) : (
                <><Copy className="w-4 h-4" /> 코드 복사</>
              )}
            </button>
          </div>

          {/* Invite link */}
          <button
            onClick={() => copyToClipboard(created.team.inviteUrl, "link")}
            className="w-full flex items-center justify-center gap-2 h-10 rounded-r2 border border-[var(--tf-stroke-neutral)] text-[13px] text-[var(--tf-fg-muted)] hover:bg-[var(--tf-bg-layer-alt)] transition-colors"
          >
            {linkCopied ? (
              <><Check className="w-4 h-4 text-[var(--tf-fg-positive)]" /> 링크 복사됨</>
            ) : (
              <><Link2 className="w-4 h-4" /> 초대 링크 복사</>
            )}
          </button>

          {/* Member count */}
          <div className="flex items-center justify-center gap-2 text-[13px] text-[var(--tf-fg-muted)]">
            <Users className="w-4 h-4" />
            <span>
              {created.team.memberCount}/{created.team.expectedSize}명 합류
            </span>
            <span className="w-2 h-2 rounded-full bg-[var(--tf-fg-brand)] animate-pulse" />
          </div>

          {/* CTA */}
          <button
            onClick={() => router.push("/survey")}
            className="w-full h-12 rounded-r2 bg-[var(--tf-bg-brand-solid)] text-[var(--tf-fg-inverse)] text-[14px] font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            설문 시작하기
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Create form
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--tf-bg-layer-alt)] px-4">
      <LogoutButton />
      <div className="w-full max-w-[480px] bg-[var(--tf-bg-layer-default)] rounded-r3 border border-[var(--tf-stroke-neutral)] p-8 space-y-6 shadow-sm">
        <div className="text-center space-y-2">
          <h1 className="text-[20px] font-bold text-[var(--tf-fg-default)]">
            팀 만들기
          </h1>
          <p className="text-[14px] text-[var(--tf-fg-muted)]">
            팀 정보를 입력하고 팀원을 초대하세요
          </p>
        </div>

        <div className="space-y-4">
          {/* Team name */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-[var(--tf-fg-default)]">
              팀 이름 <span className="text-[var(--tf-fg-negative)]">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 캡스톤 1팀"
              maxLength={30}
              className="w-full h-11 px-3 rounded-r2 border border-[var(--tf-stroke-neutral)] bg-[var(--tf-bg-layer-default)] text-[14px] text-[var(--tf-fg-default)] placeholder:text-[var(--tf-fg-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--tf-stroke-focus)] transition-shadow"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-[var(--tf-fg-default)]">
              한 줄 소개 <span className="text-[12px] text-[var(--tf-fg-subtle)]">(선택)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="예: 2026 1학기 소프트웨어 캡스톤"
              maxLength={100}
              className="w-full h-11 px-3 rounded-r2 border border-[var(--tf-stroke-neutral)] bg-[var(--tf-bg-layer-default)] text-[14px] text-[var(--tf-fg-default)] placeholder:text-[var(--tf-fg-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--tf-stroke-focus)] transition-shadow"
            />
          </div>

          {/* Expected size */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-[var(--tf-fg-default)]">
              예상 인원
            </label>
            <div className="flex gap-2">
              {[2, 3, 4, 5, 6].map((n) => (
                <button
                  key={n}
                  onClick={() => setExpectedSize(n)}
                  className={`
                    flex-1 h-10 rounded-r2 text-[14px] font-medium transition-all
                    ${expectedSize === n
                      ? "bg-[var(--tf-bg-brand-solid)] text-[var(--tf-fg-inverse)]"
                      : "border border-[var(--tf-stroke-neutral)] text-[var(--tf-fg-muted)] hover:border-[var(--tf-stroke-brand)]"
                    }
                  `}
                >
                  {n}명
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={handleCreate}
          disabled={!name.trim() || loading}
          className={`
            w-full h-12 rounded-r2 text-[14px] font-medium transition-all
            ${name.trim()
              ? "bg-[var(--tf-bg-brand-solid)] text-[var(--tf-fg-inverse)] hover:opacity-90"
              : "bg-[var(--tf-stroke-neutral)] text-[var(--tf-fg-disabled)] cursor-not-allowed"
            }
          `}
        >
          {loading ? "생성 중..." : "팀 만들기"}
        </button>
      </div>
    </div>
  );
}
