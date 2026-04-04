"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { apiClient } from "@/lib/api-client";

export default function LogoutButton() {
  const handleLogout = async () => {
    // Invalidate server session (clears HttpOnly refresh cookie)
    try {
      await apiClient.delete("/auth/session");
    } catch {
      // Best effort — proceed with client logout regardless
    }
    apiClient.clearToken();
    localStorage.removeItem("teamforge_team_id");
    localStorage.removeItem("teamforge_role");
    signOut({ callbackUrl: "/login" });
  };

  return (
    <button
      onClick={handleLogout}
      className="fixed top-4 right-4 z-50 flex items-center gap-1.5 h-8 px-3 rounded-r2 text-[12px] text-[var(--tf-fg-muted)] hover:text-[var(--tf-fg-default)] hover:bg-[var(--tf-bg-layer-default)] border border-transparent hover:border-[var(--tf-stroke-neutral)] transition-all"
    >
      <LogOut className="w-3.5 h-3.5" />
      로그아웃
    </button>
  );
}
