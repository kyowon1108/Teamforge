"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ChevronDown, LayoutDashboard, Check, Users, Crown, Eye } from "lucide-react";
import { apiClient } from "@/lib/api-client";

type TeamEntry = {
  teamId: string;
  teamName: string;
  role: "leader" | "member" | "observer";
};

function RoleIcon({ role }: { role: string }) {
  if (role === "leader") return <Crown size={12} style={{ color: "var(--tf-fg-brand)" }} />;
  if (role === "observer") return <Eye size={12} style={{ color: "var(--tf-fg-muted)" }} />;
  return <Users size={12} style={{ color: "var(--tf-fg-positive)" }} />;
}

export default function TeamSwitcher() {
  const router = useRouter();
  const params = useParams();
  const currentTeamId = params?.teamId as string | undefined;

  const [teams, setTeams] = useState<TeamEntry[]>([]);
  const [currentTeam, setCurrentTeam] = useState<TeamEntry | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiClient
      .get<TeamEntry[]>("/teams")
      .then((data) => {
        setTeams(data);
        if (currentTeamId) {
          setCurrentTeam(data.find((t) => t.teamId === currentTeamId) ?? null);
        }
      })
      .catch(() => {});
  }, [currentTeamId]);

  // Close on outside click or ESC
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  if (!currentTeam && teams.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`현재 팀: ${currentTeam?.teamName ?? "팀 선택"}. 팀 전환 메뉴 열기`}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors hover:bg-[var(--tf-bg-layer-alt)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tf-stroke-focus)] max-w-[200px]"
        style={{
          borderColor: "var(--tf-stroke-neutral)",
          color: "var(--tf-fg-default)",
          background: "var(--tf-bg-layer-default)",
        }}
      >
        <div
          className="w-5 h-5 rounded-md flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
          style={{ background: "var(--tf-bg-brand-solid)" }}
        >
          {(currentTeam?.teamName ?? "?").charAt(0).toUpperCase()}
        </div>
        <span className="truncate">{currentTeam?.teamName ?? "팀 선택"}</span>
        <ChevronDown size={14} className="flex-shrink-0 opacity-60" />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="팀 선택"
          className="absolute top-full left-0 mt-1 w-56 rounded-xl border shadow-lg z-50 py-1"
          style={{
            background: "var(--tf-bg-layer-floating)",
            borderColor: "var(--tf-stroke-neutral)",
          }}
        >
          {/* Dashboard link */}
          <button
            onClick={() => { setOpen(false); router.push("/dashboard"); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--tf-bg-layer-alt)] transition-colors"
            style={{ color: "var(--tf-fg-muted)" }}
          >
            <LayoutDashboard size={14} />
            모든 팀 보기
          </button>

          {teams.length > 0 && (
            <div className="my-1" style={{ borderTop: "1px solid var(--tf-stroke-neutral)" }} />
          )}

          {/* Team list */}
          {teams.map((team) => (
            <button
              key={team.teamId}
              onClick={() => { setOpen(false); router.push(`/team/${team.teamId}`); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--tf-bg-layer-alt)] transition-colors"
              style={{ color: "var(--tf-fg-default)" }}
            >
              <div
                className="w-5 h-5 rounded-md flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ background: "var(--tf-bg-brand-solid)" }}
              >
                {team.teamName.charAt(0).toUpperCase()}
              </div>
              <span className="flex-1 truncate text-left">{team.teamName}</span>
              <RoleIcon role={team.role} />
              {team.teamId === currentTeamId && (
                <Check size={12} style={{ color: "var(--tf-fg-brand)" }} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
