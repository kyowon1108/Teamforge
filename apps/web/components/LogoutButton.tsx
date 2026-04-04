"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="fixed top-4 right-4 z-50 flex items-center gap-1.5 h-8 px-3 rounded-r2 text-[12px] text-[var(--tf-fg-muted)] hover:text-[var(--tf-fg-default)] hover:bg-[var(--tf-bg-layer-default)] border border-transparent hover:border-[var(--tf-stroke-neutral)] transition-all"
    >
      <LogOut className="w-3.5 h-3.5" />
      로그아웃
    </button>
  );
}
