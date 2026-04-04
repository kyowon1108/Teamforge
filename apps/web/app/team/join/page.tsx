"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Users, ArrowRight } from "lucide-react";
import LogoutButton from "@/components/LogoutButton";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

export default function TeamJoinPage() {
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [teamPreview, setTeamPreview] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const router = useRouter();

  const code = digits.join("");

  // Check stored invite code (from invite link before login)
  useEffect(() => {
    const stored = localStorage.getItem("teamforge_invite_code");
    if (stored && stored.length === 6) {
      setDigits(stored.split(""));
      localStorage.removeItem("teamforge_invite_code");
    }
  }, []);

  const handleDigitChange = (index: number, value: string) => {
    // Handle paste of full code
    if (value.length > 1) {
      const pastedDigits = value.replace(/\D/g, "").slice(0, 6).split("");
      const newDigits = [...digits];
      pastedDigits.forEach((d, i) => {
        if (index + i < 6) newDigits[index + i] = d;
      });
      setDigits(newDigits);
      const nextIdx = Math.min(index + pastedDigits.length, 5);
      inputRefs.current[nextIdx]?.focus();
      return;
    }

    const digit = value.replace(/\D/g, "");
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleJoin = async () => {
    if (code.length !== 6) return;
    setLoading(true);
    try {
      const selectedRole = localStorage.getItem("teamforge_role") ?? "member";
      const joinRes = await apiClient.post<{ team: { id: string }; role: string }>("/teams/join", {
        inviteCode: code,
        role: selectedRole === "observer" ? "observer" : "member",
      });
      localStorage.setItem("teamforge_team_id", joinRes.team.id);
      toast.success("팀에 합류했습니다!");

      if (joinRes.role === "observer") {
        router.push(`/team/${joinRes.team.id}`);
      } else {
        router.push("/survey");
      }
    } catch (err: unknown) {
      const e = err as { code?: string };
      const messages: Record<string, string> = {
        INVITE_CODE_NOT_FOUND: "존재하지 않는 초대 코드예요",
        INVITE_CODE_EXPIRED: "만료된 초대 코드예요",
        ALREADY_TEAM_MEMBER: "이미 팀에 합류해 있어요",
        TEAM_FULL: "팀 인원이 이미 가득 찼어요",
      };
      toast.error(messages[e.code ?? ""] ?? "합류에 실패했어요. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--tf-bg-layer-alt)] px-4">
      <LogoutButton />
      <div className="w-full max-w-[400px] bg-[var(--tf-bg-layer-default)] rounded-r3 border border-[var(--tf-stroke-neutral)] p-8 space-y-6 shadow-sm">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-[var(--tf-bg-info)] flex items-center justify-center mx-auto">
            <Users className="w-6 h-6 text-[var(--tf-fg-brand)]" />
          </div>
          <h1 className="text-[20px] font-bold text-[var(--tf-fg-default)]">
            팀에 합류하기
          </h1>
          <p className="text-[14px] text-[var(--tf-fg-muted)]">
            팀장에게 받은 6자리 코드를 입력하세요
          </p>
        </div>

        {/* 6-digit input */}
        <div className="flex justify-center gap-2">
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={digit}
              onChange={(e) => handleDigitChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className="w-11 h-14 text-center text-[20px] font-bold rounded-r2 border border-[var(--tf-stroke-neutral)] bg-[var(--tf-bg-layer-default)] text-[var(--tf-fg-default)] focus:outline-none focus:ring-2 focus:ring-[var(--tf-stroke-focus)] focus:border-[var(--tf-stroke-brand)] transition-shadow"
            />
          ))}
        </div>

        {teamPreview && (
          <p className="text-center text-[13px] text-[var(--tf-fg-positive)]">
            {teamPreview}
          </p>
        )}

        <button
          onClick={handleJoin}
          disabled={code.length !== 6 || loading}
          className={`
            w-full h-12 rounded-r2 text-[14px] font-medium transition-all flex items-center justify-center gap-2
            ${code.length === 6
              ? "bg-[var(--tf-bg-brand-solid)] text-[var(--tf-fg-inverse)] hover:opacity-90"
              : "bg-[var(--tf-stroke-neutral)] text-[var(--tf-fg-disabled)] cursor-not-allowed"
            }
          `}
        >
          {loading ? "합류 중..." : <>팀에 합류하기 <ArrowRight className="w-4 h-4" /></>}
        </button>
      </div>
    </div>
  );
}
