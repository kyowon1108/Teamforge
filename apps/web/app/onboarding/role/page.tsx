"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Crown, User, Eye, Check, Loader2 } from "lucide-react";
import LogoutButton from "@/components/LogoutButton";
import { apiClient } from "@/lib/api-client";

const roles = [
  {
    id: "leader",
    label: "팀장 (Leader)",
    icon: Crown,
    description: "팀을 만들고 이끌어요",
    perks: [
      "팀 생성 및 초대 코드 발급",
      "스택/역할 결정 최종 권한",
      "회의록·변경 관리 전체 접근",
    ],
    color: "var(--tf-fg-brand)",
    bgSelected: "var(--tf-bg-info)",
  },
  {
    id: "member",
    label: "팀원 (Member)",
    icon: User,
    description: "초대를 받고 참여해요",
    perks: [
      "설문 참여로 스킬 분석",
      "투표·변경 제안 가능",
      "회의록 업로드·분석 접근",
    ],
    color: "var(--tf-fg-positive)",
    bgSelected: "var(--tf-bg-positive)",
  },
  {
    id: "observer",
    label: "옵저버 (Observer)",
    icon: Eye,
    description: "읽기 전용으로 관찰해요",
    perks: [
      "팀 대시보드 열람",
      "진행 상황 모니터링",
    ],
    color: "var(--tf-fg-muted)",
    bgSelected: "var(--tf-bg-layer-alt)",
    muted: true,
  },
];

export default function RoleSelectPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();
  const { data: session, status } = useSession();

  // Check if user already has a team — wait for session to be ready
  useEffect(() => {
    if (status !== "authenticated") return;

    // Ensure token is synced before API call
    const token = session?.teamforgeToken ?? session?.user?.teamforgeToken;
    if (token) {
      apiClient.setToken(token);
    }

    const check = async () => {
      try {
        // 팀이 있으면 대시보드로 바로 이동 (선형 위저드 탈피)
        const teams = await apiClient.get<{ teamId: string }[]>("/teams");
        if (Array.isArray(teams) && teams.length > 0) {
          router.replace("/dashboard");
          return;
        }
      } catch {
        // API 불가 시 역할 선택 화면 그대로 표시
      } finally {
        setChecking(false);
      }
    };

    check();
  }, [status, session?.teamforgeToken, session?.user?.teamforgeToken]);

  const handleContinue = async () => {
    if (!selected) return;
    setLoading(true);

    localStorage.setItem("teamforge_role", selected);

    if (selected === "leader") {
      router.push("/team/create");
    } else {
      router.push("/team/join");
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--tf-bg-layer-alt)]">
        <Loader2 className="w-6 h-6 text-[var(--tf-fg-brand)] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--tf-bg-layer-alt)] px-4 py-10">
      <LogoutButton />
      <div className="w-full max-w-[720px] space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-[26px] md:text-[26px] font-bold text-[var(--tf-fg-default)]">
            역할을 선택하세요
          </h1>
          <p className="text-[14px] text-[var(--tf-fg-muted)]">
            {session?.user?.name}님, TeamForge에서의 역할을 골라주세요
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {roles.map((role) => {
            const isSelected = selected === role.id;
            const Icon = role.icon;

            return (
              <button
                key={role.id}
                onClick={() => setSelected(role.id)}
                className={`
                  relative p-6 rounded-r3 border-2 text-left transition-all
                  ${isSelected
                    ? "border-[var(--tf-stroke-brand)] shadow-md"
                    : "border-[var(--tf-stroke-neutral)] hover:border-[var(--tf-stroke-brand)]"
                  }
                  ${role.muted ? "opacity-80" : ""}
                `}
                style={{
                  backgroundColor: isSelected ? role.bgSelected : "var(--tf-bg-layer-default)",
                }}
              >
                {isSelected && (
                  <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-[var(--tf-bg-brand-solid)] flex items-center justify-center">
                    <Check className="w-4 h-4 text-[var(--tf-fg-inverse)]" />
                  </div>
                )}

                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center mb-4"
                  style={{ backgroundColor: role.bgSelected }}
                >
                  <Icon className="w-5 h-5" style={{ color: role.color }} />
                </div>

                <h3 className="text-[16px] font-semibold text-[var(--tf-fg-default)] mb-1">
                  {role.label}
                </h3>
                <p className="text-[13px] text-[var(--tf-fg-muted)] mb-4">
                  {role.description}
                </p>

                <ul className="space-y-1.5">
                  {role.perks.map((perk, i) => (
                    <li
                      key={i}
                      className="text-[12px] text-[var(--tf-fg-muted)] flex items-start gap-2"
                    >
                      <span
                        className="w-1 h-1 rounded-full mt-1.5 shrink-0"
                        style={{ backgroundColor: role.color }}
                      />
                      {perk}
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>

        <div className="flex justify-center">
          <button
            onClick={handleContinue}
            disabled={!selected || loading}
            className={`
              h-12 px-8 rounded-r2 text-[14px] font-medium transition-all
              ${selected
                ? "bg-[var(--tf-bg-brand-solid)] text-[var(--tf-fg-inverse)] hover:opacity-90"
                : "bg-[var(--tf-stroke-neutral)] text-[var(--tf-fg-disabled)] cursor-not-allowed"
              }
            `}
          >
            {loading ? "이동 중..." : "역할 선택하고 시작하기"}
          </button>
        </div>
      </div>
    </div>
  );
}
