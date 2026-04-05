import TeamSwitcher from "@/components/TeamSwitcher";
import { LayoutDashboard } from "lucide-react";
import Link from "next/link";

export default function TeamLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: "var(--tf-bg-layer-alt)" }}>
      {/* Team context header */}
      <header
        className="sticky top-0 z-30 border-b"
        style={{
          background: "var(--tf-bg-layer-default)",
          borderColor: "var(--tf-stroke-neutral)",
        }}
      >
        <div className="max-w-6xl mx-auto px-4 h-12 flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg transition-colors hover:bg-[var(--tf-bg-layer-alt)]"
            style={{ color: "var(--tf-fg-muted)" }}
          >
            <LayoutDashboard size={14} />
            <span className="hidden sm:inline">대시보드</span>
          </Link>
          <span style={{ color: "var(--tf-stroke-neutral)" }}>/</span>
          <TeamSwitcher />
        </div>
      </header>

      {children}
    </div>
  );
}
